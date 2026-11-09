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
    <div className="min-h-screen flex flex-col bg-[#0a0d12] text-[#f3f1ec]">
      <Navbar agencyName={agency?.name} />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 print:hidden">
          <div className="space-y-1">
            <Link
              href="/track"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-[#9ca6b8] hover:text-[#e89b2d] transition-colors mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Autre recherche</span>
            </Link>
            <h1 className="sc-display sc-display--md text-[#f3f1ec]">
              Suivi du colis{" "}
              <span className="font-mono text-[#e89b2d]">{decodedCode}</span>
            </h1>
            {agency && (
              <p className="text-sm text-[#9ca6b8]">
                Expédié par <strong className="text-[#f3f1ec]">{agency.name}</strong> à{" "}
                {agency.commune}
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
