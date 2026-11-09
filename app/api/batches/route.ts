import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { createBatchRecord } from "@/lib/store";
import { validateBatchCreate } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = requireAdminSession(request);
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

    const batch = createBatchRecord(validated.data);
    return NextResponse.json(batch, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Erreur lors de la création du lot." },
      { status: 400 }
    );
  }
}
