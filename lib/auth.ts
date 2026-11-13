import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getAgencyById,
  getSuperAdminEmail,
  isSessionJtiRevoked,
} from "./repository";
import { resolveEffectiveSubscription } from "./subscription";
import type {
  Agency,
  ResolvedSubscriptionState,
  UserRole,
} from "./types";

export const SESSION_COOKIE_NAME = "tc_admin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 heures

export interface AdminSessionPayload {
  sub: "agency-admin";
  jti: string;
  userId: string;
  agencyId: string | null;
  role: UserRole;
  email: string;
  iat: number;
  exp: number;
}

export interface SessionCreateInput {
  userId?: string;
  agencyId?: string | null;
  role?: UserRole;
  email?: string;
  now?: number;
}

function getSessionSecret(): string | null {
  const secret = process.env.TRACKCARGO_SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) {
    return null;
  }
  return secret;
}

export function isSessionSecretConfigured(): boolean {
  return Boolean(getSessionSecret());
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

export function createSessionToken(
  inputOrNow?: number | SessionCreateInput
): string | null {
  const secret = getSessionSecret();
  if (!secret) return null;

  const opts: SessionCreateInput =
    typeof inputOrNow === "number" ? { now: inputOrNow } : inputOrNow || {};
  const now = opts.now ?? Date.now();
  const role: UserRole = opts.role || "AGENCY_ADMIN";

  const payload: AdminSessionPayload = {
    sub: "agency-admin",
    jti: crypto.randomUUID(),
    userId: opts.userId || (role === "SUPER_ADMIN" ? "super-admin" : "usr-demo-1"),
    agencyId: opts.agencyId === undefined ? null : opts.agencyId,
    role,
    email: opts.email || getSuperAdminEmail(),
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
      typeof parsed.jti !== "string" ||
      parsed.jti.length < 16 ||
      typeof parsed.exp !== "number" ||
      parsed.exp <= now ||
      (parsed.role !== "AGENCY_ADMIN" && parsed.role !== "SUPER_ADMIN")
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function requireAdminSession(
  request: NextRequest
): Promise<
  | { ok: true; session: AdminSessionPayload }
  | { ok: false; response: NextResponse }
> {
  if (!isSessionSecretConfigured()) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "Authentification non configurée sur le serveur (TRACKCARGO_SESSION_SECRET).",
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

  const revoked = await isSessionJtiRevoked(session.jti).catch(() => false);
  if (revoked) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Session révoquée ou expirée. Veuillez vous reconnecter." },
        { status: 401 }
      ),
    };
  }

  return { ok: true, session };
}

export async function requireAgencySession(
  request: NextRequest
): Promise<
  | {
      ok: true;
      session: AdminSessionPayload & { agencyId: string };
      agency: Agency;
      subscription: ResolvedSubscriptionState;
    }
  | { ok: false; response: NextResponse }
> {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth;

  if (auth.session.role !== "AGENCY_ADMIN" || !auth.session.agencyId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Compte agence requis pour accéder à cet espace." },
        { status: 403 }
      ),
    };
  }

  try {
    const agency = await getAgencyById(auth.session.agencyId);
    if (!agency) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Agence introuvable ou supprimée." },
          { status: 401 }
        ),
      };
    }

    const subscription = resolveEffectiveSubscription(agency);
    return {
      ok: true,
      session: { ...auth.session, agencyId: agency.id },
      agency,
      subscription,
    };
  } catch (err) {
    if (err instanceof Error && err.message === "DATABASE_URL_NOT_CONFIGURED") {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Base de données PostgreSQL non configurée." },
          { status: 503 }
        ),
      };
    }
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Erreur serveur lors de la vérification du compte agence." },
        { status: 500 }
      ),
    };
  }
}

export async function requireActiveAgencySession(
  request: NextRequest
): Promise<
  | {
      ok: true;
      session: AdminSessionPayload & { agencyId: string };
      agency: Agency;
      subscription: ResolvedSubscriptionState;
    }
  | { ok: false; response: NextResponse }
> {
  const gate = await requireAgencySession(request);
  if (!gate.ok) return gate;

  if (!gate.subscription.canWriteDashboard) {
    if (gate.subscription.effectiveStatus === "SUSPENDED") {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error:
              "Votre compte agence est temporairement suspendu par l'administration TrackCargo CI.",
            code: "AGENCY_SUSPENDED",
            subscription: gate.subscription,
          },
          { status: 403 }
        ),
      };
    }

    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "Votre essai gratuit ou abonnement mensuel est arrivé à échéance. Renouvelez par Wave ou Orange Money pour reprendre les opérations.",
          code: "PAYMENT_REQUIRED",
          subscription: gate.subscription,
        },
        { status: 402 }
      ),
    };
  }

  return gate;
}

export async function requireSuperAdminSession(
  request: NextRequest
): Promise<
  | { ok: true; session: AdminSessionPayload }
  | { ok: false; response: NextResponse }
> {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth;

  if (auth.session.role !== "SUPER_ADMIN") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Accès réservé au fondateur Super Admin." },
        { status: 403 }
      ),
    };
  }

  return auth;
}

export function shouldUseSecureCookie(request: NextRequest): boolean {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto.split(",")[0]?.trim().toLowerCase() === "https";
  }
  return request.nextUrl.protocol === "https:";
}

export function getSessionCookieOptions(
  secure = process.env.NODE_ENV === "production"
) {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}
