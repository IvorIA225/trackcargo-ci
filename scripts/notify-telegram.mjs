import fs from "node:fs";
import path from "node:path";

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function readJsonIfExists(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    }
  } catch {
    // ignore malformed optional report
  }
  return null;
}

function appendStepSummary(markdownLine) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY?.trim();
  if (!summaryPath) return;
  try {
    fs.appendFileSync(summaryPath, `${markdownLine}\n`, "utf8");
  } catch {
    // ignore step summary write errors outside CI
  }
}

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  const strict = process.argv.includes("--strict");

  const agentName = process.env.AGENT_NAME || "Agent TrackCargo CI";
  const status = (process.env.AGENT_STATUS || "INFO").toUpperCase();
  const summary = process.env.AGENT_SUMMARY || "Exécution terminée.";
  const prUrl = process.env.PR_URL?.trim() || "";
  const runUrl = process.env.GITHUB_RUN_URL?.trim() || "";

  const secReport = readJsonIfExists(
    path.join(process.cwd(), "reports", "security-report.json")
  );
  const aiSummaryPath = path.join(process.cwd(), "reports", "ai-fix-summary.md");
  const aiSummary = fs.existsSync(aiSummaryPath)
    ? fs.readFileSync(aiSummaryPath, "utf8").trim()
    : "";

  const icon =
    status === "PASS" || status === "SUCCESS"
      ? "✅"
      : status === "FIXED"
      ? "🛠️"
      : status === "FAIL" || status === "ALERT"
      ? "🚨"
      : "ℹ️";

  const lines = [
    `${icon} <b>${escapeHtml(agentName)}</b>`,
    `<b>Statut :</b> ${escapeHtml(status)}`,
    `<b>Date :</b> ${escapeHtml(new Date().toISOString())}`,
    "",
    `<b>Résumé :</b>\n${escapeHtml(summary)}`,
  ];

  if (secReport) {
    lines.push(
      "",
      `<b>Audit Sécurité :</b> ${escapeHtml(secReport.status)} (${secReport.passedCount} OK / ${secReport.findingsCount} alerte(s))`,
      `<b>npm audit :</b> ${escapeHtml(secReport.npmAuditSummary || "n/a")}`
    );
    if (Array.isArray(secReport.findings) && secReport.findings.length > 0) {
      lines.push(
        "<b>Alertes :</b>",
        ...secReport.findings
          .slice(0, 5)
          .map((f) => `• [${escapeHtml(f.severity)}] ${escapeHtml(f.file)}: ${escapeHtml(f.message)}`)
      );
    }
  }

  if (aiSummary) {
    lines.push("", `<b>Actions IA :</b>\n${escapeHtml(aiSummary.slice(0, 1200))}`);
  }

  if (prUrl) {
    lines.push("", `🔗 <b>Pull Request auto-générée :</b> ${escapeHtml(prUrl)}`);
  }
  if (runUrl) {
    lines.push(`📊 <b>Logs GitHub Actions :</b> ${escapeHtml(runUrl)}`);
  }

  const message = lines.join("\n").slice(0, 3950);

  if (!token || !chatId) {
    console.log(
      "::warning title=Telegram Non Configuré::TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID absent des Secrets GitHub."
    );
    console.log(
      "[notify-telegram] TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID non configuré."
    );
    console.log("--- APERÇU DU RAPPORT TELEGRAM ---");
    console.log(message);
    appendStepSummary(
      `- ⚠️ **Telegram non configuré** pour **${agentName}** (\`${status}\`) — ajoutez \`TELEGRAM_BOT_TOKEN\` et \`TELEGRAM_CHAT_ID\`.`
    );
    if (strict) process.exit(1);
    return;
  }

  let res;
  try {
    res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (networkErr) {
    console.log(
      `::warning title=Telegram Réseau::Erreur réseau temporaire Telegram (${String(networkErr)}).`
    );
    appendStepSummary(
      `- ⚠️ **Erreur réseau Telegram** pour **${agentName}** (\`${status}\`).`
    );
    if (strict) process.exit(1);
    return;
  }

  if (!res.ok) {
    const errText = await res.text();
    const isConfigError = res.status >= 400 && res.status < 500;
    const annotation = isConfigError ? "::error" : "::warning";
    console.log(
      `${annotation} title=Telegram API (${res.status})::${errText.replace(/\r?\n/g, " ")}`
    );
    console.error(`[notify-telegram] Erreur Telegram API (${res.status}): ${errText}`);
    appendStepSummary(
      `- 🚨 **Échec envoi Telegram (${res.status})** pour **${agentName}** : vérifiez \`TELEGRAM_BOT_TOKEN\`, \`TELEGRAM_CHAT_ID\` et cliquez sur **Start** dans votre bot.`
    );
    if (strict || isConfigError) process.exit(1);
    return;
  }

  console.log("::notice title=Telegram Report::Rapport envoyé sur Telegram avec succès.");
  console.log("[notify-telegram] Rapport envoyé sur Telegram avec succès.");
  appendStepSummary(
    `- ✅ **Rapport Telegram envoyé** pour **${agentName}** (Statut : \`${status}\`).`
  );
}

main().catch((err) => {
  console.error("[notify-telegram] Fatal error:", err);
  process.exit(1);
});
