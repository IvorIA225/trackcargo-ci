import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { checkDurableRateLimit, getClientIp } from "@/lib/rate-limit";
import { resetDemoForCaller } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;

  const ip = getClientIp(request);
  const limit = await checkDurableRateLimit(
    "demo-reset",
    ip,
    10,
    10 * 60 * 1000
  );
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Trop de réinitialisations. Réessayez dans quelques minutes." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSec) },
      }
    );
  }

  try {
    const db = await resetDemoForCaller({
      role: auth.session.role,
      agencyId: auth.session.agencyId,
    });
    return NextResponse.json(db);
  } catch (err) {
    if (err instanceof Error && err.message === "RESET_FORBIDDEN") {
      return NextResponse.json(
        {
          error:
            "Réinitialisation réservée à l'agence de démonstration ou au Super Admin.",
        },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: "Impossible de réinitialiser les données de démonstration." },
      { status: 400 }
    );
  }
}
