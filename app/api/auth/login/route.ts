import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  getSessionCookieOptions,
  isAdminAuthConfigured,
  isSessionSecretConfigured,
  shouldUseSecureCookie,
  verifyAdminPassword,
  verifyScryptHash,
} from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { findUserByEmail, getSuperAdminEmail } from "@/lib/repository";
import { validateLoginInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

// Constant-time dummy work when an email is unknown so timing stays flat
const DUMMY_HASH =
  "scrypt:00112233445566778899aabbccddeeff:00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";

export async function POST(request: NextRequest) {
  if (!isSessionSecretConfigured()) {
    return NextResponse.json(
      {
        error:
          "Authentification non configurée sur le serveur (TRACKCARGO_SESSION_SECRET).",
      },
      { status: 503 }
    );
  }

  const ip = getClientIp(request);
  const limit = checkRateLimit("auth-login", ip, 10, 15 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives de connexion. Réessayez plus tard." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSec) },
      }
    );
  }

  try {
    const body = await request.json();
    const parsed = validateLoginInput(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const superAdminEmail = getSuperAdminEmail();

    // 1. Founder SUPER_ADMIN login (explicit founder email or password-only compatibility)
    if (email === null || email === superAdminEmail) {
      if (!isAdminAuthConfigured()) {
        return NextResponse.json(
          {
            error:
              "Mot de passe Super Admin non configuré sur le serveur.",
          },
          { status: 503 }
        );
      }

      if (!verifyAdminPassword(password)) {
        return NextResponse.json(
          { error: "Identifiants invalides." },
          { status: 401 }
        );
      }

      const token = createSessionToken({
        userId: "super-admin",
        agencyId: null,
        role: "SUPER_ADMIN",
        email: superAdminEmail,
      });
      if (!token) {
        return NextResponse.json(
          { error: "Impossible d'émettre la session sécurisée." },
          { status: 503 }
        );
      }

      const cookieOpts = getSessionCookieOptions(shouldUseSecureCookie(request));
      const response = NextResponse.json({
        authenticated: true,
        role: "SUPER_ADMIN",
        redirectTo: "/super-admin",
      });
      response.cookies.set(cookieOpts.name, token, {
        httpOnly: cookieOpts.httpOnly,
        secure: cookieOpts.secure,
        sameSite: cookieOpts.sameSite,
        path: cookieOpts.path,
        maxAge: cookieOpts.maxAge,
      });
      return response;
    }

    // 2. Agency Admin email + password login
    const user = await findUserByEmail(email);
    if (!user || !verifyScryptHash(password, user.passwordHash)) {
      if (!user) {
        verifyScryptHash(password, DUMMY_HASH);
      }
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect." },
        { status: 401 }
      );
    }

    const token = createSessionToken({
      userId: user.id,
      agencyId: user.agencyId,
      role: user.role,
      email: user.email,
    });
    if (!token) {
      return NextResponse.json(
        { error: "Impossible d'émettre la session sécurisée." },
        { status: 503 }
      );
    }

    const redirectTo =
      user.role === "SUPER_ADMIN" ? "/super-admin" : "/dashboard";
    const cookieOpts = getSessionCookieOptions(shouldUseSecureCookie(request));
    const response = NextResponse.json({
      authenticated: true,
      role: user.role,
      redirectTo,
    });
    response.cookies.set(cookieOpts.name, token, {
      httpOnly: cookieOpts.httpOnly,
      secure: cookieOpts.secure,
      sameSite: cookieOpts.sameSite,
      path: cookieOpts.path,
      maxAge: cookieOpts.maxAge,
    });
    return response;
  } catch (err) {
    if (err instanceof Error && err.message === "DATABASE_URL_NOT_CONFIGURED") {
      return NextResponse.json(
        { error: "Base de données PostgreSQL non configurée." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Requête d'authentification invalide." },
      { status: 400 }
    );
  }
}
