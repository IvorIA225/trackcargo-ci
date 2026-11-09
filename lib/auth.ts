import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "tc_admin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 heures

export interface AdminSessionPayload {
  sub: "agency-admin";
  iat: number;
  exp: number;
}

function getSessionSecret(): string | null {
  const secret = process.env.TRACKCARGO_SESSION_SECRET?.trim();
  if (!secret || secret.length < 16) {
    return null;
  }
  return secret;
}

export function isAdminAuthConfigured(): boolean {
  const hasSecret = Boolean(getSessionSecret());
  const hasPassword = Boolean(
    process.env.TRACKCARGO_ADMIN_PASSWORD_HASH?.trim() ||
      process.env.TRACKCARGO_ADMIN_PASSWORD?.trim()
  );
  return hasSecret && hasPassword;
}

export function hashPasswordScrypt(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

export function verifyScryptHash(password: string, stored: string): boolean {
  const sep = stored.includes(":") ? ":" : "$";
  const parts = stored.split(sep);
  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false;
  }
  const [, salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(expectedHex, "hex");
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export function verifyAdminPassword(candidate: string): boolean {
  if (!candidate) return false;

  const scryptHash = process.env.TRACKCARGO_ADMIN_PASSWORD_HASH?.trim();
  if (scryptHash) {
    return verifyScryptHash(candidate, scryptHash);
  }

  const plainEnv = process.env.TRACKCARGO_ADMIN_PASSWORD?.trim();
  if (!plainEnv) {
    return false;
  }

  const candidateDigest = crypto.createHash("sha256").update(candidate).digest();
  const expectedDigest = crypto.createHash("sha256").update(plainEnv).digest();
  return crypto.timingSafeEqual(candidateDigest, expectedDigest);
}

export function createSessionToken(now = Date.now()): string | null {
  const secret = getSessionSecret();
  if (!secret) return null;

  const payload: AdminSessionPayload = {
    sub: "agency-admin",
    iat: now,
    exp: now + SESSION_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  const sig = crypto
    .createHmac("sha256", secret)
    .update(encoded)
    .digest("base64url");

  return `${encoded}.${sig}`;
}

export function verifySessionToken(
  token: string | undefined | null,
  now = Date.now()
): AdminSessionPayload | null {
  if (!token) return null;
  const secret = getSessionSecret();
  if (!secret) return null;

  const dotIdx = token.indexOf(".");
  if (dotIdx <= 0) return null;

  const encoded = token.slice(0, dotIdx);
  const providedSig = token.slice(dotIdx + 1);
  if (!encoded || !providedSig) return null;

  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(encoded)
    .digest("base64url");

  const a = Buffer.from(providedSig, "utf8");
  const b = Buffer.from(expectedSig, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as AdminSessionPayload;
    if (
      parsed.sub !== "agency-admin" ||
      typeof parsed.exp !== "number" ||
      parsed.exp <= now
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function requireAdminSession(
  request: NextRequest
):
  | { ok: true; session: AdminSessionPayload }
  | { ok: false; response: NextResponse } {
  if (!isAdminAuthConfigured()) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "Authentification administrateur non configurée sur le serveur.",
        },
        { status: 503 }
      ),
    };
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = verifySessionToken(token);
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Authentification requise." },
        { status: 401 }
      ),
    };
  }

  return { ok: true, session };
}

export function shouldUseSecureCookie(request: NextRequest): boolean {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto.split(",")[0]?.trim().toLowerCase() === "https";
  }
  return request.nextUrl.protocol === "https:";
}

export function getSessionCookieOptions(secure = process.env.NODE_ENV === "production") {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}
