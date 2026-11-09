import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { bulkUpdateBatchStatus } from "@/lib/store";
import { ParcelStatus, PARCEL_STATUS_META } from "@/lib/types";

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
      return NextResponse.json({ error: "Identifiant de lot invalide." }, { status: 422 });
    }

    const body = await request.json();
    const status = body?.status as ParcelStatus;

    if (!status || !(status in PARCEL_STATUS_META)) {
      return NextResponse.json({ error: "Statut invalide." }, { status: 422 });
    }

    const result = bulkUpdateBatchStatus(id, status);
    if (!result.batch) {
      return NextResponse.json({ error: "Lot introuvable." }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du lot." },
      { status: 400 }
    );
  }
}
