import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ALLOWED_ROOTS = ["app/", "components/", "lib/", "tests/"];

function getArg(name, fallback = "") {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function isAllowedTargetPath(relPath) {
  const norm = relPath.replace(/\\/g, "/").replace(/^\.\//, "");
  if (norm.includes("..") || path.isAbsolute(relPath)) return false;
  if (!ALLOWED_ROOTS.some((prefix) => norm.startsWith(prefix))) return false;
  if (!/\.(ts|tsx|mjs|css)$/.test(norm)) return false;

  const resolved = path.resolve(ROOT, norm);
  return resolved.startsWith(ROOT + path.sep);
}

function readOptionalFile(relPath, maxChars = 6000) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) return "";
  return fs.readFileSync(full, "utf8").slice(0, maxChars);
}

async function callGemini(apiKey, promptText) {
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Gemini API HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  return JSON.parse(rawText);
}

async function callOpenAI(apiKey, promptText) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a senior TypeScript/Next.js QA and Security engineer. Respond strictly with valid JSON.",
        },
        { role: "user", content: promptText },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI API HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const rawText = data?.choices?.[0]?.message?.content || "{}";
  return JSON.parse(rawText);
}

function runVerifyAll() {
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const res = spawnSync(npmCmd, ["run", "verify:all"], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 240_000,
  });
  return {
    ok: res.status === 0,
    output: `${res.stdout || ""}\n${res.stderr || ""}`.slice(-4000),
  };
}

function revertWorkspace() {
  spawnSync("git", ["checkout", "--", "app", "components", "lib", "tests"], {
    cwd: ROOT,
  });
}

async function main() {
  const mode = getArg("mode", "qa");
  const failureLog = readOptionalFile(
    path.join("reports", `${mode}-failure.log`),
    5000
  );
  const securityReport = readOptionalFile(
    path.join("reports", "security-report.json"),
    5000
  );

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();

  if (!geminiKey && !openaiKey) {
    console.log(
      `[ai-agent-runner] Aucune clé GEMINI_API_KEY ou OPENAI_API_KEY configurée — correction IA ignorée (mode=${mode}).`
    );
    return;
  }

  const contextFiles = [
    "lib/auth.ts",
    "lib/validation.ts",
    "lib/store.ts",
    "app/api/track/route.ts",
    "app/api/agency/route.ts",
  ]
    .map((f) => `### ${f}\n\`\`\`ts\n${readOptionalFile(f, 3500)}\n\`\`\``)
    .join("\n\n");

  const prompt = `
Tu es l'agent autonome "${mode.toUpperCase()}" du SaaS TrackCargo CI (Next.js 16 + TypeScript).
Une vérification automatique a échoué ou remonté des anomalies.

Log d'erreur (${mode}):
${failureLog || "Aucun log brut fourni"}

Rapport sécurité JSON:
${securityReport || "n/a"}

Contexte fichiers clés:
${contextFiles}

Mission:
Propose le correctif minimal et sûr uniquement dans les dossiers autorisés (app/, components/, lib/, tests/).
Retourne STRICTEMENT un objet JSON de la forme:
{
  "summary": "Résumé court en français des corrections",
  "files": [
    { "path": "lib/validation.ts", "content": "...contenu complet du fichier..." }
  ]
}
Si aucune correction automatique sûre n'est possible sans intervention humaine, retourne {"summary": "...", "files": []}.
`;

  const responseJson = geminiKey
    ? await callGemini(geminiKey, prompt)
    : await callOpenAI(openaiKey, prompt);

  const files = Array.isArray(responseJson?.files) ? responseJson.files : [];
  const summary = String(responseJson?.summary || "Aucune modification proposée.");

  const reportsDir = path.join(ROOT, "reports");
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  if (files.length === 0) {
    fs.writeFileSync(
      path.join(reportsDir, "ai-fix-summary.md"),
      `Analyse IA (${mode}) : ${summary}`,
      "utf8"
    );
    console.log("[ai-agent-runner] Aucun patch proposé:", summary);
    return;
  }

  const applied = [];
  for (const item of files) {
    if (
      !item ||
      typeof item.path !== "string" ||
      typeof item.content !== "string" ||
      !isAllowedTargetPath(item.path)
    ) {
      console.warn(`[ai-agent-runner] Chemin refusé par la politique de sécurité: ${item?.path}`);
      continue;
    }
    const target = path.resolve(ROOT, item.path);
    fs.writeFileSync(target, item.content, "utf8");
    applied.push(item.path);
  }

  if (applied.length === 0) {
    console.log("[ai-agent-runner] Aucun fichier éligible appliqué.");
    return;
  }

  console.log(`[ai-agent-runner] Patchs appliqués (${applied.join(", ")}), vérification complète...`);
  const verified = runVerifyAll();

  if (!verified.ok) {
    console.error("[ai-agent-runner] Le patch IA a échoué aux tests — annulation git checkout.");
    revertWorkspace();
    fs.writeFileSync(
      path.join(reportsDir, "ai-fix-summary.md"),
      `Tentative de correctif IA annulée (tests échoués) :\n${summary}`,
      "utf8"
    );
    process.exit(1);
  }

  fs.writeFileSync(
    path.join(reportsDir, "ai-fix-summary.md"),
    `Correctifs validés par tests complets (${applied.join(", ")}) :\n${summary}`,
    "utf8"
  );
  console.log("[ai-agent-runner] Patch IA validé par 100 % des tests !");
}

main().catch((err) => {
  console.error("[ai-agent-runner] Error:", err);
  process.exit(1);
});
