import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { getPublicAgency, updateAgencyProfile } from "@/lib/store";
import { validateAgencyPatch } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getPublicAgency());
}

export async function PATCH(request: NextRequest) {
  const auth = requireAdminSession(request);
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

    const updated = updateAgencyProfile(validated.data);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Impossible de mettre à jour le profil agence." },
      { status: 400 }
    );
  }
}
