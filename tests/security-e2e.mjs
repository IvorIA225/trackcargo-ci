import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PROJECT_DIR = process.cwd();
const PORT = 3211;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const TEST_SECRET = "e2e-security-session-secret-key-min-32chars";
const TEST_PASSWORD = "E2E-Strong-Password-2026!";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/session`);
      if (res.ok) return;
    } catch {
      // wait
    }
    await sleep(300);
  }
  throw new Error("Timed out waiting for Next.js production server");
}

function extractCookie(setCookieHeader) {
  assert.ok(setCookieHeader, "Expected Set-Cookie header");
  assert.match(setCookieHeader, /HttpOnly/i);
  assert.match(setCookieHeader, /Secure/i);
  assert.match(setCookieHeader, /SameSite=Lax/i);
  return setCookieHeader.split(";")[0];
}

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "trackcargo-e2e-"));
  const tempDb = path.join(tempDir, "trackcargo.json");
  const nextBin = path.join(PROJECT_DIR, "node_modules", "next", "dist", "bin", "next");

  const salt = crypto.randomBytes(16).toString("hex");
  const testHash = `scrypt:${salt}:${crypto
    .scryptSync(TEST_PASSWORD, salt, 64)
    .toString("hex")}`;

  const server = spawn(process.execPath, [nextBin, "start", "-p", String(PORT)], {
    cwd: PROJECT_DIR,
    env: {
      ...process.env,
      NODE_ENV: "production",
      TRACKCARGO_DB_PATH: tempDb,
      TRACKCARGO_SESSION_SECRET: TEST_SECRET,
      TRACKCARGO_ADMIN_PASSWORD: TEST_PASSWORD,
      TRACKCARGO_ADMIN_PASSWORD_HASH: testHash,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stderr = "";
  server.stderr.on("data", (d) => {
    stderr += d.toString();
  });

  try {
    await waitForServer();

    // 1. Security Headers verification
    const homeRes = await fetch(`${BASE_URL}/`);
    assert.equal(homeRes.status, 200);
    assert.equal(homeRes.headers.get("x-frame-options"), "DENY");
    assert.equal(homeRes.headers.get("x-content-type-options"), "nosniff");
    assert.equal(
      homeRes.headers.get("referrer-policy"),
      "strict-origin-when-cross-origin"
    );
    assert.equal(homeRes.headers.get("x-powered-by"), null);
    const csp = homeRes.headers.get("content-security-policy") || "";
    assert.ok(csp.includes("default-src 'self'"), "CSP default-src missing");
    assert.ok(!csp.includes("unsafe-eval"), "CSP must not enable unsafe-eval in prod");
    console.log("OK [headers] OWASP headers verified on /");

    // 2. Public pages return 200
    for (const route of ["/track", "/track/TC-8841", "/login", "/dashboard"]) {
      const r = await fetch(`${BASE_URL}${route}`);
      assert.equal(r.status, 200, `Expected 200 on ${route}`);
    }
    console.log("OK [pages] Public routes return 200");

    // 3. Unauthenticated admin endpoints MUST return 401
    const unauthChecks = [
      ["GET", "/api/overview"],
      ["PATCH", "/api/agency", { name: "Hijack" }],
      ["POST", "/api/batches", { code: "HACK", origin: "X", destination: "Y" }],
      ["PATCH", "/api/batches/batch-air-1", { status: "LIVRE" }],
      [
        "POST",
        "/api/packages",
        {
          batchId: "batch-air-1",
          clientName: "Evil",
          clientPhone: "+2250700000000",
          description: "Evil",
          weightKg: 1,
        },
      ],
      ["PATCH", "/api/packages/pcl-1", { paymentStatus: "PAYE_WAVE" }],
      ["POST", "/api/reset"],
    ];

    for (const [method, endpoint, body] of unauthChecks) {
      const r = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      assert.equal(
        r.status,
        401,
        `Expected 401 for unauthenticated ${method} ${endpoint}, got ${r.status}`
      );
    }
    console.log("OK [authz] All 7 admin endpoints block unauthenticated callers with 401");

    // 4. Public /api/agency minimizes exposed fields
    const pubAgency = await (await fetch(`${BASE_URL}/api/agency`)).json();
    assert.equal(pubAgency.name, "Ivoire Cargo Express");
    assert.equal("ratePerKgAirFcfa" in pubAgency, false);
    assert.equal("id" in pubAgency, false);
    console.log("OK [privacy] Public /api/agency omits internal agency fields");

    // 5. Public /api/track rejects short fishing and masks PII
    const fishRes = await fetch(`${BASE_URL}/api/track?q=070812`);
    assert.equal(fishRes.status, 400);

    const trackRes = await fetch(`${BASE_URL}/api/track?q=TC-8841`);
    assert.equal(trackRes.status, 200);
    const trackData = await trackRes.json();
    assert.equal(trackData.parcels.length, 1);
    assert.equal(trackData.parcels[0].clientName, "Awa K.");
    assert.equal(trackData.parcels[0].clientPhone, "+22507••••56");
    console.log("OK [privacy] Public /api/track rejects fishing & masks PII");

    // 6. Brute-force rate limit triggers 429 on 11th failed attempt
    for (let i = 0; i < 10; i++) {
      const failRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "198.51.100.77",
        },
        body: JSON.stringify({ password: "wrong-password" }),
      });
      assert.equal(failRes.status, 401);
    }
    const throttledRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "198.51.100.77",
      },
      body: JSON.stringify({ password: "wrong-password" }),
    });
    assert.equal(throttledRes.status, 429);
    assert.ok(throttledRes.headers.get("retry-after"));
    console.log("OK [rate-limit] Auth brute-force throttled with 429");

    // 7. Valid login issues httpOnly session cookie (Secure over HTTPS)
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "198.51.100.88",
        "x-forwarded-proto": "https",
      },
      body: JSON.stringify({ password: TEST_PASSWORD }),
    });
    assert.equal(loginRes.status, 200);
    const cookie = extractCookie(loginRes.headers.get("set-cookie"));
    console.log("OK [authn] Admin login sets HttpOnly SameSite cookie");

    // 8. Authenticated validation & CRUD workflows
    const badWave = await fetch(`${BASE_URL}/api/agency`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ waveLink: "javascript:alert(document.cookie)" }),
    });
    assert.equal(badWave.status, 422);

    const goodAgency = await fetch(`${BASE_URL}/api/agency`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ name: "World Transit Secured", commune: "Treichville" }),
    });
    assert.equal(goodAgency.status, 200);

    const batchRes = await fetch(`${BASE_URL}/api/batches`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        code: "AIR-SEC-01",
        mode: "aerien",
        origin: "Guangzhou",
        destination: "Treichville",
      }),
    });
    assert.equal(batchRes.status, 201);
    const batch = await batchRes.json();

    const pkgRes = await fetch(`${BASE_URL}/api/packages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        batchId: batch.id,
        clientName: "Mariam Coulibaly",
        clientPhone: "+2250711223344",
        description: "2 cartons",
        weightKg: 10,
      }),
    });
    assert.equal(pkgRes.status, 201);
    const pkg = await pkgRes.json();
    assert.equal(pkg.amountFcfa, 85000);

    const bulkRes = await fetch(`${BASE_URL}/api/batches/${batch.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ status: "PRET_RETRAIT" }),
    });
    assert.equal(bulkRes.status, 200);

    const resetRes = await fetch(`${BASE_URL}/api/reset`, {
      method: "POST",
      headers: { Cookie: cookie },
    });
    assert.equal(resetRes.status, 200);

    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: cookie },
    });
    assert.equal(logoutRes.status, 200);

    const afterLogout = await fetch(`${BASE_URL}/api/overview`);
    assert.equal(afterLogout.status, 401);
    console.log("OK [e2e] Authenticated CRUD + reset + logout verified");
    console.log("SECURITY_E2E_ALL_PASSED");
  } finally {
    server.kill("SIGTERM");
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    if (stderr.trim()) {
      console.error("Server stderr:", stderr);
    }
  }
}

main().catch((err) => {
  console.error("SECURITY E2E FAILED:", err);
  process.exit(1);
});
