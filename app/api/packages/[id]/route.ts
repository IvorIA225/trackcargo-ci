import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { updateParcelRecord } from "@/lib/store";
import { validateParcelPatch } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = requireAdminSession(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    if (!id || id.length > 64) {
      return NextResponse.json(
        { error: "Identifiant de colis invalide." },
        { status: 422 }
      );
    }

    const body = await request.json();
    const validated = validateParcelPatch(body);
    if (!validated.ok) {
      return NextResponse.json(
        { error: validated.error },
        { status: 422 }
      );
    }

    const updated = updateParcelRecord(id, validated.data);
    if (!updated) {
      return NextResponse.json(
        { error: "Colis introuvable." },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour." },
      { status: 400 }
    );
  }
}
