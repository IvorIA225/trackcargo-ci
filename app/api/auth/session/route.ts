import { NextRequest, NextResponse } from "next/server";
import {
  isAdminAuthConfigured,
  isSessionSecretConfigured,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/auth";
import { getAgencyById } from "@/lib/repository";
import { resolveEffectiveSubscription } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const configured = isSessionSecretConfigured();
  const superAdminConfigured = isAdminAuthConfigured();
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = configured ? verifySessionToken(token) : null;

  if (!session) {
    return NextResponse.json({
      configured,
      superAdminConfigured,
      authenticated: false,
      role: null,
    });
  }

  if (session.role === "SUPER_ADMIN") {
    return NextResponse.json({
      configured,
      superAdminConfigured,
      authenticated: true,
      role: "SUPER_ADMIN",
      email: session.email,
      redirectTo: "/super-admin",
    });
  }

  try {
    const agency = session.agencyId
      ? await getAgencyById(session.agencyId)
      : null;
    if (!agency) {
      return NextResponse.json({
        configured,
        superAdminConfigured,
        authenticated: false,
        role: null,
      });
    }
    const subscription = resolveEffectiveSubscription(agency);
    return NextResponse.json({
      configured,
      superAdminConfigured,
      authenticated: true,
      role: "AGENCY_ADMIN",
      email: session.email,
      agencySlug: agency.slug,
      agencyName: agency.name,
      subscription,
      redirectTo: "/dashboard",
    });
  } catch {
    return NextResponse.json({
      configured,
      superAdminConfigured,
      authenticated: false,
      role: null,
    });
  }
}
