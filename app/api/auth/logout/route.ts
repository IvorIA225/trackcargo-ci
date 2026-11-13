import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  shouldUseSecureCookie,
  verifySessionToken,
} from "@/lib/auth";
import { revokeSessionJti } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = verifySessionToken(token);
  if (session?.jti) {
    try {
      await revokeSessionJti(session.jti, session.exp);
    } catch {
      // Cookie cleared even if DB persistence fails transiently
    }
  }

  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: shouldUseSecureCookie(request),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
