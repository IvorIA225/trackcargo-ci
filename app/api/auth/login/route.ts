import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  getSessionCookieOptions,
  isAdminAuthConfigured,
  shouldUseSecureCookie,
  verifyAdminPassword,
} from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isAdminAuthConfigured()) {
    return NextResponse.json(
      {
        error:
          "Authentification administrateur non configurée sur le serveur.",
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
    const body = (await request.json()) as { password?: unknown };
    const password =
      typeof body?.password === "string" ? body.password : "";

    if (!password || password.length > 200 || !verifyAdminPassword(password)) {
      return NextResponse.json(
        { error: "Mot de passe administrateur invalide." },
        { status: 401 }
      );
    }

    const token = createSessionToken();
    if (!token) {
      return NextResponse.json(
        { error: "Impossible d'émettre la session sécurisée." },
        { status: 503 }
      );
    }

    const cookieOpts = getSessionCookieOptions(shouldUseSecureCookie(request));
    const response = NextResponse.json({ authenticated: true });
    response.cookies.set(cookieOpts.name, token, {
      httpOnly: cookieOpts.httpOnly,
      secure: cookieOpts.secure,
      sameSite: cookieOpts.sameSite,
      path: cookieOpts.path,
      maxAge: cookieOpts.maxAge,
    });
    return response;
  } catch {
    return NextResponse.json(
      { error: "Requête d'authentification invalide." },
      { status: 400 }
    );
  }
}
