import { NextRequest, NextResponse } from "next/server";
import { requireAgencySession } from "@/lib/auth";
import { getOverviewForAgency } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAgencySession(request);
  if (!auth.ok) return auth.response;

  if (auth.subscription.effectiveStatus === "SUSPENDED") {
    return NextResponse.json(
      {
        error:
          "Votre compte agence est temporairement suspendu par l'administration TrackCargo CI.",
        code: "AGENCY_SUSPENDED",
        subscription: auth.subscription,
      },
      { status: 403 }
    );
  }

  const overview = await getOverviewForAgency(auth.session.agencyId);
  if (!overview) {
    return NextResponse.json(
      { error: "Agence introuvable." },
      { status: 404 }
    );
  }

  return NextResponse.json(overview);
}
