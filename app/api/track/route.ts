import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  getPublicAgencyProfile,
  searchGlobalTracking,
} from "@/lib/repository";
import { validateTrackingQuery } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limit = checkRateLimit("track-lookup", ip, 30, 60 * 1000);
    if (!limit.allowed) {
      const demo = await getPublicAgencyProfile();
      return NextResponse.json(
        {
          error: "Trop de requêtes de suivi. Patientez quelques instants.",
          agency: demo.status === "OK" ? demo.agency : null,
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
      const demo = await getPublicAgencyProfile();
      return NextResponse.json(
        {
          error: validated.error,
          agency: demo.status === "OK" ? demo.agency : null,
          parcels: [],
        },
        { status: 400 }
      );
    }

    const result = await searchGlobalTracking(q);
    if (result.suspended) {
      return NextResponse.json(
        {
          error: "Le portail de cette agence est temporairement suspendu.",
          suspended: true,
          agency: null,
          parcels: [],
        },
        { status: 403 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "DATABASE_URL_NOT_CONFIGURED") {
      return NextResponse.json(
        {
          error: "Base de données PostgreSQL non configurée.",
          agency: null,
          parcels: [],
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      {
        error: "Erreur lors de la recherche du colis.",
        agency: null,
        parcels: [],
      },
      { status: 500 }
    );
  }
}
