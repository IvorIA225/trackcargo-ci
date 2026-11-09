"use client";

import { use, useState } from "react";
import Navbar from "@/components/Navbar";
import TrackingLookup from "@/components/TrackingLookup";
import { PublicAgencyProfile } from "@/lib/types";

export default function TrackCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const [agency, setAgency] = useState<PublicAgencyProfile | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar agencyName={agency?.name} />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-950">
              Suivi du colis <span className="font-mono text-amber-600">{decodeURIComponent(code)}</span>
            </h1>
            {agency && (
              <p className="text-sm text-slate-600">
                Expédié par <strong>{agency.name}</strong> — {agency.commune}
              </p>
            )}
          </div>
        </div>

        <TrackingLookup
          initialQuery={decodeURIComponent(code)}
          onAgencyLoaded={setAgency}
        />
      </main>
    </div>
  );
}
