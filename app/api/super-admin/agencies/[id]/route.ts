import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/auth";
import { applySuperAdminAgencyAction } from "@/lib/repository";
import { validateSuperAdminAction } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = requireSuperAdminSession(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    if (!id || id.length > 64) {
      return NextResponse.json(
        { error: "Identifiant d'agence invalide." },
        { status: 422 }
      );
    }

    const body = await request.json();
    const validated = validateSuperAdminAction(body);
    if (!validated.ok) {
      return NextResponse.json(
        { error: validated.error },
        { status: 422 }
      );
    }

    const result = await applySuperAdminAgencyAction(
      id,
      auth.session.email,
      validated.data
    );
    if (!result) {
      return NextResponse.json(
        { error: "Agence introuvable." },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Impossible d'appliquer l'action d'abonnement." },
      { status: 400 }
    );
  }
}
