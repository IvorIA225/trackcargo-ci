import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath) && !process.argv.includes("--force")) {
  console.log(".env.local existe déjà (utilisez --force pour régénérer).");
  process.exit(0);
}

const pwd = `TC-Admin-${crypto.randomBytes(4).toString("hex")}`;
const salt = crypto.randomBytes(16).toString("hex");
const hash = crypto.scryptSync(pwd, salt, 64).toString("hex");
const secret = crypto.randomBytes(32).toString("hex");

const content = [
  "# Variables locales générées automatiquement (ignorées par Git)",
  `TRACKCARGO_SESSION_SECRET=${secret}`,
  `TRACKCARGO_ADMIN_PASSWORD_HASH=scrypt:${salt}:${hash}`,
  "",
].join("\n");

fs.writeFileSync(envPath, content, "utf8");
console.log("LOCAL_ENV_READY=true");
console.log(`LOCAL_ADMIN_PASSWORD=${pwd}`);
