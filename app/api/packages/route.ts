import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { createParcelRecord, readDb } from "@/lib/store";
import { validateSingleParcel } from "@/lib/validation";

export const dynamic = "force-dynamic";

const MAX_BULK_IMPORT_ITEMS = 500;

export async function POST(request: NextRequest) {
  const auth = requireAdminSession(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();

    if (Array.isArray(body?.items)) {
      if (body.items.length === 0) {
        return NextResponse.json(
          { error: "Aucun colis à importer." },
          { status: 422 }
        );
      }
      if (body.items.length > MAX_BULK_IMPORT_ITEMS) {
        return NextResponse.json(
          {
            error: `Maximum ${MAX_BULK_IMPORT_ITEMS} colis par import.`,
          },
          { status: 422 }
        );
      }

      const fallbackBatchId =
        typeof body.batchId === "string" ? body.batchId : undefined;
      const validatedItems = [];
      for (const item of body.items) {
        const res = validateSingleParcel(item, fallbackBatchId);
        if (!res.ok) {
          return NextResponse.json(
            { error: res.error, details: res.details },
            { status: 422 }
          );
        }
        validatedItems.push(res.data);
      }

      const db = readDb();
      const batchIds = new Set(db.batches.map((b) => b.id));
      for (const item of validatedItems) {
        if (!batchIds.has(item.batchId)) {
          return NextResponse.json(
            { error: "Lot introuvable pour l'import." },
            { status: 404 }
          );
        }
      }

      const created = validatedItems.map((item) => createParcelRecord(item));
      return NextResponse.json(
        { created, count: created.length },
        { status: 201 }
      );
    }

    const validated = validateSingleParcel(body);
    if (!validated.ok) {
      return NextResponse.json(
        { error: validated.error, details: validated.details },
        { status: 422 }
      );
    }

    try {
      const parcel = createParcelRecord(validated.data);
      return NextResponse.json(parcel, { status: 201 });
    } catch (err) {
      if (err instanceof Error && err.message === "BATCH_NOT_FOUND") {
        return NextResponse.json(
          { error: "Lot introuvable." },
          { status: 404 }
        );
      }
      throw err;
    }
  } catch {
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement du colis." },
      { status: 400 }
    );
  }
}
