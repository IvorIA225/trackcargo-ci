import { NextRequest, NextResponse } from "next/server";
import {
  isAdminAuthConfigured,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const configured = isAdminAuthConfigured();
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const authenticated = configured && Boolean(verifySessionToken(token));
  return NextResponse.json({ configured, authenticated });
}
