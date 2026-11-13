"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import TrackingLookup from "@/components/TrackingLookup";
import { PublicAgencyProfile } from "@/lib/types";

function safeDecodeCode(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export default function TrackCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const decodedCode = safeDecodeCode(code);
  const [agency, setAgency] = useState<PublicAgencyProfile | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f6f2] text-[#0d131d]">
      <Navbar agencyName={agency?.name} />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 print:hidden">
          <div className="space-y-1">
            <Link
              href={agency?.slug ? `/a/${agency.slug}` : "/track"}
              className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#0d1522] hover:text-[#c9410e] transition-colors mb-2 no-underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Autre recherche</span>
            </Link>
            <h1 className="sc-display sc-display--md text-[#0d131d] font-bold">
              Suivi du colis{" "}
              <span className="font-mono text-[#c9410e]">{decodedCode}</span>
            </h1>
            {agency && (
              <p className="text-sm text-[#525e70]">
                Expédié par{" "}
                <Link
                  href={`/a/${agency.slug}`}
                  className="font-bold text-[#0d1522] hover:text-[#c9410e] hover:underline"
                >
                  {agency.name}
                </Link>{" "}
                à {agency.commune}
              </p>
            )}
          </div>
        </div>

        <TrackingLookup
          initialQuery={decodedCode}
          onAgencyLoaded={setAgency}
        />
      </main>
    </div>
  );
}
