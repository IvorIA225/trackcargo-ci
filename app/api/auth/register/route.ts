import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  getSessionCookieOptions,
  hashPasswordScrypt,
  isSessionSecretConfigured,
  shouldUseSecureCookie,
} from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { registerAgencyWithAdmin } from "@/lib/repository";
import { validateRegisterInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

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
  const limit = checkRateLimit("auth-register", ip, 12, 15 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Trop de créations de comptes depuis cette adresse. Réessayez plus tard." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSec) },
      }
    );
  }

  try {
    const body = await request.json();
    const validated = validateRegisterInput(body);
    if (!validated.ok) {
      return NextResponse.json(
        { error: validated.error, details: validated.details },
        { status: 422 }
      );
    }

    const passwordHash = hashPasswordScrypt(validated.data.password);
    const created = await registerAgencyWithAdmin({
      agencyName: validated.data.agencyName,
      commune: validated.data.commune,
      whatsappPhone: validated.data.whatsappPhone,
      fullName: validated.data.fullName,
      email: validated.data.email,
      passwordHash,
      plan: validated.data.plan,
    });

    const token = createSessionToken({
      userId: created.user.id,
      agencyId: created.agency.id,
      role: "AGENCY_ADMIN",
      email: created.user.email,
    });
    if (!token) {
      return NextResponse.json(
        { error: "Impossible d'émettre la session sécurisée." },
        { status: 503 }
      );
    }

    const cookieOpts = getSessionCookieOptions(shouldUseSecureCookie(request));
    const response = NextResponse.json(
      {
        authenticated: true,
        role: "AGENCY_ADMIN",
        redirectTo: "/dashboard",
        agency: {
          id: created.agency.id,
          slug: created.agency.slug,
          name: created.agency.name,
          commune: created.agency.commune,
        },
        subscription: created.subscription,
      },
      { status: 201 }
    );
    response.cookies.set(cookieOpts.name, token, {
      httpOnly: cookieOpts.httpOnly,
      secure: cookieOpts.secure,
      sameSite: cookieOpts.sameSite,
      path: cookieOpts.path,
      maxAge: cookieOpts.maxAge,
    });
    return response;
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "EMAIL_EXISTS") {
        return NextResponse.json(
          { error: "Cette adresse email possède déjà un espace agence." },
          { status: 409 }
        );
      }
      if (err.message === "DATABASE_URL_NOT_CONFIGURED") {
        return NextResponse.json(
          { error: "Base de données PostgreSQL non configurée." },
          { status: 503 }
        );
      }
    }
    return NextResponse.json(
      { error: "Impossible de créer votre agence pour le moment." },
      { status: 400 }
    );
  }
}
