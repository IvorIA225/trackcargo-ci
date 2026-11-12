"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Package } from "lucide-react";

export default function Navbar({
  agencyName,
}: {
  agencyName?: string;
  activeCorridorLabel?: string;
}) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isWorkspace =
    pathname.startsWith("/dashboard") || pathname.startsWith("/super-admin");

  const ctaHref = isHome ? "/register" : isWorkspace ? "/" : "/dashboard";
  const ctaShort = isHome ? "Essayer" : isWorkspace ? "Site" : "Agence";
  const ctaLabel = isHome
    ? "Essayer gratuitement"
    : isWorkspace
      ? "Voir le site"
      : "Espace agence";

  return (
    <header className="sticky top-0 z-50 px-3 sm:px-6 pt-3 pb-1 pointer-events-none print:hidden">
      <div className="pointer-events-auto max-w-[74rem] mx-auto px-3.5 sm:px-5 h-13 sm:h-14 rounded-full bg-white/88 backdrop-blur-md border border-[#0d131d]/10 shadow-[var(--sc-e2)] flex items-center justify-between gap-2 sm:gap-4 text-[#0d131d]">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold tracking-tight text-[15px] sm:text-[17px] text-[#0d131d] min-w-0 no-underline"
          >
            <span className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-[#0d1522] text-white inline-flex items-center justify-center shrink-0">
              <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
            </span>
            <span className="whitespace-nowrap font-[family-name:var(--font-archivo)]">
              TrackCargo CI
            </span>
          </Link>

          {agencyName && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono text-[#525e70] px-2.5 py-1 rounded-full bg-[#f7f6f2] border border-[#0d131d]/10 truncate max-w-[200px]">
              <span
                className="h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0"
                aria-hidden="true"
              />
              <span className="truncate">{agencyName}</span>
            </span>
          )}
        </div>

        <nav
          className="flex items-center gap-1 sm:gap-1.5 shrink-0"
          aria-label="Navigation principale"
        >
          {isHome && (
            <a
              href="#portail-live"
              className="hidden lg:inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium text-[#525e70] hover:text-[#0d131d] hover:bg-[#f7f6f2] transition-colors whitespace-nowrap no-underline"
            >
              Démonstration
            </a>
          )}
          {isHome && (
            <a
              href="#tarifs"
              className="hidden md:inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium text-[#525e70] hover:text-[#0d131d] hover:bg-[#f7f6f2] transition-colors whitespace-nowrap no-underline"
            >
              Tarifs
            </a>
          )}
          <Link
            href="/track"
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap no-underline ${
              pathname.startsWith("/track") || pathname.startsWith("/a/")
                ? "bg-[#f7f6f2] text-[#0d131d] font-semibold"
                : "text-[#525e70] hover:text-[#0d131d] hover:bg-[#f7f6f2]"
            }`}
          >
            Suivi colis
          </Link>
          {isHome && (
            <Link
              href="/dashboard"
              className="hidden md:inline-flex px-3 py-1.5 rounded-full text-sm font-medium text-[#525e70] hover:text-[#0d131d] hover:bg-[#f7f6f2] transition-colors whitespace-nowrap no-underline"
            >
              Espace agence
            </Link>
          )}
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-1 sm:gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#c9410e] hover:bg-[#b1370a] text-white font-semibold text-xs sm:text-sm transition-all active:scale-[0.97] whitespace-nowrap no-underline shadow-[var(--sc-e1)]"
          >
            <span className="sm:hidden">{ctaShort}</span>
            <span className="hidden sm:inline">{ctaLabel}</span>
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
