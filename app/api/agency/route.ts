import { NextRequest, NextResponse } from "next/server";
import { requireActiveAgencySession } from "@/lib/auth";
import { getPublicAgencyProfile, updateAgencyForTenant } from "@/lib/repository";
import { validateAgencyPatch, validateSlugParam } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const rawSlug = request.nextUrl.searchParams.get("slug");
    let slug: string | undefined;
    if (rawSlug) {
      const parsed = validateSlugParam(rawSlug);
      if (!parsed.ok) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
      slug = parsed.data;
    }

    const result = await getPublicAgencyProfile(slug);
    if (result.status === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Agence introuvable." },
        { status: 404 }
      );
    }
    if (result.status === "SUSPENDED") {
      return NextResponse.json(
        {
          error: "Ce portail agence est temporairement suspendu.",
          suspended: true,
          agencyName: result.agencyName,
        },
        { status: 403 }
      );
    }
    return NextResponse.json(result.agency);
  } catch (err) {
    if (err instanceof Error && err.message === "DATABASE_URL_NOT_CONFIGURED") {
      return NextResponse.json(
        { error: "Base de données PostgreSQL non configurée." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Impossible de charger le profil agence." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireActiveAgencySession(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const validated = validateAgencyPatch(body);
    if (!validated.ok) {
      return NextResponse.json(
        { error: validated.error, details: validated.details },
        { status: 422 }
      );
    }

    const updated = await updateAgencyForTenant(auth.session.agencyId, {
      name: validated.data.name,
      commune: validated.data.commune,
      address: validated.data.address,
      whatsappPhone: validated.data.whatsappPhone,
      waveLink: validated.data.waveLink,
      orangeMoneyNumber: validated.data.orangeMoneyNumber,
      ratePerKgAirFcfa: validated.data.ratePerKgAirFcfa,
      ratePerCbmSeaFcfa: validated.data.ratePerCbmSeaFcfa,
    });
    if (!updated) {
      return NextResponse.json({ error: "Agence introuvable." }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Impossible de mettre à jour le profil agence." },
      { status: 400 }
    );
  }
}
