import { NextRequest, NextResponse } from "next/server";
import { checkDurableRateLimit, getClientIp } from "@/lib/rate-limit";
import { getPublicAgencyProfile, searchPublicBySlug } from "@/lib/repository";
import { validateSlugParam, validateTrackingQuery } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const ip = getClientIp(request);
    const limit = await checkDurableRateLimit(
      "track-lookup",
      ip,
      30,
      60 * 1000
    );
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: "Trop de requêtes de suivi. Patientez quelques instants.",
          agency: null,
          parcels: [],
        },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSec) },
        }
      );
    }

    const { slug } = await context.params;
    const validSlug = validateSlugParam(slug);
    if (!validSlug.ok) {
      return NextResponse.json(
        { error: validSlug.error, agency: null, parcels: [] },
        { status: 400 }
      );
    }

    const q = (request.nextUrl.searchParams.get("q") || "").trim();
    if (!q) {
      const profile = await getPublicAgencyProfile(validSlug.data);
      if (profile.status === "NOT_FOUND") {
        return NextResponse.json(
          { error: "Agence introuvable.", agency: null, parcels: [] },
          { status: 404 }
        );
      }
      if (profile.status === "SUSPENDED") {
        return NextResponse.json(
          {
            error: "Ce portail agence est temporairement suspendu.",
            suspended: true,
            agencyName: profile.agencyName,
            agency: null,
            parcels: [],
          },
          { status: 403 }
        );
      }
      return NextResponse.json({ agency: profile.agency, parcels: [] });
    }

    const validQuery = validateTrackingQuery(q);
    if (!validQuery.ok) {
      const profile = await getPublicAgencyProfile(validSlug.data);
      if (profile.status === "NOT_FOUND") {
        return NextResponse.json(
          { error: "Agence introuvable.", agency: null, parcels: [] },
          { status: 404 }
        );
      }
      if (profile.status === "SUSPENDED") {
        return NextResponse.json(
          {
            error: "Ce portail agence est temporairement suspendu.",
            suspended: true,
            agencyName: profile.agencyName,
            agency: null,
            parcels: [],
          },
          { status: 403 }
        );
      }
      return NextResponse.json(
        {
          error: validQuery.error,
          agency: profile.agency,
          parcels: [],
        },
        { status: 400 }
      );
    }

    const result = await searchPublicBySlug(validSlug.data, q);
    if (result.status === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Agence introuvable.", agency: null, parcels: [] },
        { status: 404 }
      );
    }
    if (result.status === "SUSPENDED") {
      return NextResponse.json(
        {
          error: "Ce portail agence est temporairement suspendu.",
          suspended: true,
          agencyName: result.agencyName,
          agency: null,
          parcels: [],
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      agency: result.agency,
      parcels: result.parcels,
    });
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
        error: "Erreur lors de la recherche sur ce portail agence.",
        agency: null,
        parcels: [],
      },
      { status: 500 }
    );
  }
}
