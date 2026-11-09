import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const WITH_NPM_AUDIT = process.argv.includes("--npm-audit");
const REPORT_DIR = path.join(ROOT, "reports");
const REPORT_PATH = path.join(REPORT_DIR, "security-report.json");

const PUBLIC_ONLY_ROUTES = new Set([
  "app/api/track/route.ts",
  "app/api/public/[slug]/track/route.ts",
  "app/api/auth/register/route.ts",
  "app/api/auth/login/route.ts",
  "app/api/auth/logout/route.ts",
  "app/api/auth/session/route.ts",
]);

const AUTH_GUARD_CALLS = [
  "requireAdminSession(",
  "requireAgencySession(",
  "requireActiveAgencySession(",
  "requireSuperAdminSession(",
];

function hasAuthGuard(content) {
  return AUTH_GUARD_CALLS.some((fn) => content.includes(fn));
}

function walkFiles(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.name === "node_modules" ||
      entry.name === ".next" ||
      entry.name === ".tmp-test" ||
      entry.name === "reports" ||
      entry.name === ".git"
    ) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, exts, out);
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

function toRel(fullPath) {
  return path.relative(ROOT, fullPath).replace(/\\/g, "/");
}

function main() {
  const findings = [];
  const passedChecks = [];

  // 1. Verify every API route handler enforces requireAdminSession unless allowlisted
  const apiRoutes = walkFiles(path.join(ROOT, "app", "api"), [".ts"]);
  for (const file of apiRoutes) {
    const rel = toRel(file);
    const content = fs.readFileSync(file, "utf8");

    if (PUBLIC_ONLY_ROUTES.has(rel)) {
      passedChecks.push(`Public route allowlisted: ${rel}`);
      continue;
    }

    if (rel === "app/api/agency/route.ts") {
      // GET returns public profile, PATCH MUST require active agency session guard
      if (!hasAuthGuard(content)) {
        findings.push({
          severity: "CRITICAL",
          rule: "BROKEN_ACCESS_CONTROL",
          file: rel,
          message: "PATCH /api/agency missing auth guard",
        });
      } else {
        passedChecks.push(`PATCH protected on ${rel}`);
      }
      continue;
    }

    if (!hasAuthGuard(content)) {
      findings.push({
        severity: "CRITICAL",
        rule: "MISSING_AUTH_GUARD",
        file: rel,
        message: `API route ${rel} is not allowlisted public and lacks a server auth guard`,
      });
    } else {
      passedChecks.push(`Auth guard verified on ${rel}`);
    }
  }

  // 2. Verify security headers in next.config.ts
  const nextConfigPath = path.join(ROOT, "next.config.ts");
  if (!fs.existsSync(nextConfigPath)) {
    findings.push({
      severity: "HIGH",
      rule: "MISSING_NEXT_CONFIG",
      file: "next.config.ts",
      message: "next.config.ts missing",
    });
  } else {
    const cfg = fs.readFileSync(nextConfigPath, "utf8");
    const requiredHeaders = [
      "Content-Security-Policy",
      "X-Frame-Options",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Strict-Transport-Security",
      "poweredByHeader: false",
    ];
    for (const h of requiredHeaders) {
      if (!cfg.includes(h)) {
        findings.push({
          severity: "HIGH",
          rule: "MISSING_SECURITY_HEADER",
          file: "next.config.ts",
          message: `Missing security directive: ${h}`,
        });
      } else {
        passedChecks.push(`Header/setting configured: ${h}`);
      }
    }
  }

  // 3. Static scan for dangerous code & leaked secrets
  const codeFiles = [
    ...walkFiles(path.join(ROOT, "app"), [".ts", ".tsx", ".js", ".mjs"]),
    ...walkFiles(path.join(ROOT, "components"), [".ts", ".tsx"]),
    ...walkFiles(path.join(ROOT, "lib"), [".ts", ".tsx"]),
    ...walkFiles(path.join(ROOT, "db"), [".ts", ".tsx"]),
  ];

  const dangerousPatterns = [
    { rule: "NO_EVAL", regex: /\beval\s*\(/, severity: "CRITICAL" },
    { rule: "NO_NEW_FUNCTION", regex: /\bnew\s+Function\s*\(/, severity: "CRITICAL" },
    {
      rule: "NO_DANGEROUS_HTML",
      regex: /dangerouslySetInnerHTML|\.innerHTML\s*=/,
      severity: "HIGH",
    },
    {
      rule: "NO_SECRET_LITERALS",
      regex: /(AIza[0-9A-Za-z_-]{30,}|sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,})/,
      severity: "CRITICAL",
    },
  ];

  for (const file of codeFiles) {
    const rel = toRel(file);
    const content = fs.readFileSync(file, "utf8");
    for (const pat of dangerousPatterns) {
      if (pat.regex.test(content)) {
        findings.push({
          severity: pat.severity,
          rule: pat.rule,
          file: rel,
          message: `Dangerous pattern detected (${pat.rule}) in ${rel}`,
        });
      }
    }
  }
  passedChecks.push(`Scanned ${codeFiles.length} source files for XSS/eval/secrets`);

  // 4. Verify .gitignore protects secrets & runtime files
  const gitignorePath = path.join(ROOT, ".gitignore");
  const gitignore = fs.existsSync(gitignorePath)
    ? fs.readFileSync(gitignorePath, "utf8")
    : "";
  if (!gitignore.includes(".env*") || !gitignore.includes("/data/")) {
    findings.push({
      severity: "HIGH",
      rule: "GITIGNORE_HYGIENE",
      file: ".gitignore",
      message: ".gitignore must ignore .env* and /data/",
    });
  } else {
    passedChecks.push(".gitignore excludes secrets (.env*) and runtime (/data/)");
  }

  // 5. Optional live npm audit (enabled in CI with --npm-audit)
  let npmAuditSummary = "skipped (run with --npm-audit)";
  if (WITH_NPM_AUDIT) {
    const auditRes = spawnSync(
      process.platform === "win32" ? "npm.cmd" : "npm",
      ["audit", "--audit-level=high", "--json"],
      { cwd: ROOT, encoding: "utf8", timeout: 60_000 }
    );
    try {
      const parsed = JSON.parse(auditRes.stdout || "{}");
      const vulns = parsed?.metadata?.vulnerabilities || {};
      const high = Number(vulns.high || 0);
      const critical = Number(vulns.critical || 0);
      npmAuditSummary = `critical=${critical}, high=${high}, moderate=${Number(
        vulns.moderate || 0
      )}`;
      if (critical > 0 || high > 0) {
        findings.push({
          severity: critical > 0 ? "CRITICAL" : "HIGH",
          rule: "NPM_AUDIT",
          file: "package-lock.json",
          message: `Vulnerabilities reported by npm audit: ${npmAuditSummary}`,
        });
      } else {
        passedChecks.push(`npm audit clean (${npmAuditSummary})`);
      }
    } catch {
      npmAuditSummary = `audit check exited with status ${auditRes.status}`;
      if (auditRes.status !== 0) {
        findings.push({
          severity: "MEDIUM",
          rule: "NPM_AUDIT_ERROR",
          file: "package-lock.json",
          message: npmAuditSummary,
        });
      }
    }
  }

  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    status: findings.length === 0 ? "PASS" : "FAIL",
    findingsCount: findings.length,
    passedCount: passedChecks.length,
    npmAuditSummary,
    passedChecks,
    findings,
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  console.log(
    `Security audit finished: status=${report.status}, passed=${report.passedCount}, findings=${report.findingsCount}`
  );

  if (findings.length > 0) {
    for (const f of findings) {
      console.error(`[${f.severity}] ${f.rule} (${f.file}): ${f.message}`);
    }
    process.exit(1);
  }
}

main();
