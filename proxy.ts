import { NextRequest, NextResponse } from "next/server";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function getExpectedHost(request: NextRequest): string {
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
  if (forwardedHost) return forwardedHost;
  return (
    request.headers.get("host")?.trim().toLowerCase() ||
    request.nextUrl.host.toLowerCase()
  );
}

function extractHeaderHost(value: string): string | null {
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  if (!MUTATING_METHODS.has(request.method.toUpperCase())) {
    return NextResponse.next();
  }

  const secFetchSite = request.headers
    .get("sec-fetch-site")
    ?.trim()
    .toLowerCase();
  if (secFetchSite === "cross-site") {
    return NextResponse.json(
      { error: "Requête cross-site refusée (protection CSRF)." },
      { status: 403 }
    );
  }

  const expectedHost = getExpectedHost(request);
  const origin = request.headers.get("origin")?.trim();
  if (origin !== undefined && origin !== "") {
    const originHost = extractHeaderHost(origin);
    if (!originHost || originHost !== expectedHost) {
      return NextResponse.json(
        { error: "Origine non autorisée (protection CSRF)." },
        { status: 403 }
      );
    }
    return NextResponse.next();
  }

  const referer = request.headers.get("referer")?.trim();
  if (referer) {
    const refererHost = extractHeaderHost(referer);
    if (!refererHost || refererHost !== expectedHost) {
      return NextResponse.json(
        { error: "Référent non autorisé (protection CSRF)." },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
