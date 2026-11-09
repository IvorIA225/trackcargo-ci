"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Package } from "lucide-react";

export default function Navbar({
  agencyName,
  activeCorridorLabel,
}: {
  agencyName?: string;
  activeCorridorLabel?: string;
}) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-50 border-b border-[#09152b]/12 bg-[#f6f3ec]/92 backdrop-blur-md text-[#09152b] print:hidden">
      <div className="max-w-[82rem] mx-auto px-3 sm:px-8 h-16 flex items-center justify-between gap-1.5 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-2 font-extrabold tracking-tight text-[15px] sm:text-lg text-[#09152b] min-w-0 no-underline"
          >
            <span className="h-8 w-8 sm:h-9 sm:w-9 rounded-[8px] bg-[#0a2e6e] text-white inline-flex items-center justify-center border border-[#09152b] shadow-xs shrink-0 relative">
              <Package className="w-4 h-4" aria-hidden="true" />
              <span
                className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#ff5c1b] border border-[#f6f3ec]"
                aria-hidden="true"
              />
            </span>
            <span className="whitespace-nowrap font-[family-name:var(--font-archivo)]">
              TrackCargo CI
            </span>
          </Link>

          {activeCorridorLabel && (
            <span className="hidden lg:inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-[#0a2e6e] px-2.5 py-1 rounded-[6px] bg-[#dce7fa] border border-[#0a2e6e]/20 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ff5c1b]" aria-hidden="true" />
              <span>{activeCorridorLabel}</span>
            </span>
          )}

          {agencyName && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono text-[#09152b] px-2.5 py-1 rounded-[6px] bg-white border border-[#09152b]/15 truncate max-w-[200px]">
              <span
                className="h-1.5 w-1.5 rounded-full bg-[#10b981] shrink-0"
                aria-hidden="true"
              />
              <span className="truncate">{agencyName}</span>
            </span>
          )}
        </div>

        <nav
          className="flex items-center gap-1 sm:gap-2 shrink-0"
          aria-label="Navigation principale"
        >
          {isHome && (
            <a
              href="#pont-controle"
              className="hidden lg:inline-flex items-center px-3 py-2 rounded-[8px] text-sm font-semibold text-[#43506b] hover:text-[#0a2e6e] hover:bg-white transition-colors whitespace-nowrap no-underline"
            >
              Pont 3D
            </a>
          )}
          {isHome && (
            <a
              href="#tarifs"
              className="hidden md:inline-flex items-center px-3 py-2 rounded-[8px] text-sm font-semibold text-[#43506b] hover:text-[#0a2e6e] hover:bg-white transition-colors whitespace-nowrap no-underline"
            >
              Tarifs
            </a>
          )}
          <Link
            href="/track"
            className={`px-2.5 sm:px-3.5 py-2 rounded-[8px] text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap no-underline ${
              pathname.startsWith("/track")
                ? "bg-[#dce7fa] text-[#0a2e6e] border border-[#0a2e6e]/30 font-bold"
                : "text-[#09152b] hover:text-[#0a2e6e] hover:bg-white"
            }`}
          >
            Suivi colis
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 rounded-[8px] bg-[#ff5c1b] hover:bg-[#ff7136] text-[#09152b] font-extrabold text-xs sm:text-sm border border-[#09152b] shadow-[0_2px_0_#09152b] transition-all active:translate-y-0.5 whitespace-nowrap no-underline"
          >
            <span className="sm:hidden">Agence</span>
            <span className="hidden sm:inline">Espace agence</span>
            <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
