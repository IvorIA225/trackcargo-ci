import { NextRequest, NextResponse } from "next/server";
import { requireActiveAgencySession } from "@/lib/auth";
import { createBatchForTenant } from "@/lib/repository";
import { validateBatchCreate } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireActiveAgencySession(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const validated = validateBatchCreate(body);
    if (!validated.ok) {
      return NextResponse.json(
        { error: validated.error, details: validated.details },
        { status: 422 }
      );
    }

    const batch = await createBatchForTenant(
      auth.session.agencyId,
      validated.data
    );
    return NextResponse.json(batch, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "BATCH_CODE_EXISTS") {
      return NextResponse.json(
        { error: "Un lot avec ce code existe déjà dans votre agence." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Erreur lors de la création du lot." },
      { status: 400 }
    );
  }
}
