import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getPublicAgency, searchTracking } from "@/lib/store";
import { validateTrackingQuery } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = checkRateLimit("track-lookup", ip, 30, 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: "Trop de requêtes de suivi. Patientez quelques instants.",
        agency: getPublicAgency(),
        parcels: [],
      },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSec) },
      }
    );
  }

  const q = request.nextUrl.searchParams.get("q") || "";
  const validated = validateTrackingQuery(q);
  if (!validated.ok) {
    return NextResponse.json(
      {
        error: validated.error,
        agency: getPublicAgency(),
        parcels: [],
      },
      { status: 400 }
    );
  }

  const result = searchTracking(q);
  return NextResponse.json(result);
}
