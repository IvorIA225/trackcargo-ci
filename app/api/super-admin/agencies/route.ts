import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/auth";
import {
  listAgenciesForSuperAdmin,
  updatePlatformSettings,
} from "@/lib/repository";
import { validatePlatformSettingsPatch } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = requireSuperAdminSession(request);
  if (!auth.ok) return auth.response;

  try {
    const data = await listAgenciesForSuperAdmin();
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof Error && err.message === "DATABASE_URL_NOT_CONFIGURED") {
      return NextResponse.json(
        { error: "Base de données PostgreSQL non configurée." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Impossible de charger la console Super Admin." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = requireSuperAdminSession(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const validated = validatePlatformSettingsPatch(body);
    if (!validated.ok) {
      return NextResponse.json(
        { error: validated.error, details: validated.details },
        { status: 422 }
      );
    }
    const updated = await updatePlatformSettings(validated.data);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Impossible de mettre à jour les paramètres d'encaissement." },
      { status: 400 }
    );
  }
}
