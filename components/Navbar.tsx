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
  const isClientPortal = pathname.startsWith("/a/");
  const isTrackPage = pathname.startsWith("/track");
  const isWorkspace =
    pathname.startsWith("/dashboard") || pathname.startsWith("/super-admin");

  const ctaHref = isHome
    ? "/register"
    : isWorkspace
      ? "/"
      : isClientPortal
        ? "/login"
        : "/dashboard";
  const ctaShort = isHome
    ? "Ouvrir"
    : isWorkspace
      ? "Site"
      : isClientPortal
        ? "Gérant"
        : "Agence";
  const ctaLabel = isHome
    ? "Ouvrir mon agence"
    : isWorkspace
      ? "Voir le site"
      : isClientPortal
        ? "Accès gérant"
        : "Espace agence";

  if (isHome) {
    return (
      <header className="sticky top-0 z-50 h-16 bg-[#050d1a]/92 backdrop-blur-xl border-b border-white/10 text-white print:hidden">
        <div className="sc-wrap h-full flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Link
              href="/"
              className="flex items-center gap-2.5 font-bold tracking-tight text-[15px] sm:text-[17px] text-white min-w-0 no-underline group"
            >
              <span className="h-8 w-8 rounded-[8px] bg-gradient-to-br from-[#ff6b2b] to-[#c8430e] text-white inline-flex items-center justify-center shrink-0 shadow-xs">
                <Package className="w-4 h-4" aria-hidden="true" />
              </span>
              <span className="whitespace-nowrap font-[family-name:var(--font-archivo)]">
                TrackCargo CI
              </span>
            </Link>

            {activeCorridorLabel && (
              <span className="hidden lg:inline-flex items-center gap-2 pl-4 border-l border-white/14 text-[11.5px] font-mono text-[#94a3b8] whitespace-nowrap">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-[#38bdf8] shrink-0"
                  aria-hidden="true"
                />
                <span>HUB ABIDJAN ·</span>
                <strong className="text-white font-semibold">
                  {activeCorridorLabel}
                </strong>
              </span>
            )}
          </div>

          <nav
            className="flex items-center gap-1 sm:gap-2 shrink-0"
            aria-label="Navigation principale"
          >
            <a
              href="#act-comptoir"
              className="hidden xl:inline-flex items-center px-3 py-1.5 rounded-[8px] text-sm font-medium text-[#cbd5e1] hover:text-white hover:bg-white/8 transition-colors whitespace-nowrap no-underline"
            >
              Plateforme
            </a>
            <a
              href="#act-quai"
              className="hidden lg:inline-flex items-center px-3 py-1.5 rounded-[8px] text-sm font-medium text-[#cbd5e1] hover:text-white hover:bg-white/8 transition-colors whitespace-nowrap no-underline"
            >
              Transit Live
            </a>
            <a
              href="#portail-live"
              className="hidden md:inline-flex items-center px-3 py-1.5 rounded-[8px] text-sm font-medium text-[#cbd5e1] hover:text-white hover:bg-white/8 transition-colors whitespace-nowrap no-underline"
            >
              Démo Suivi
            </a>
            <a
              href="#tarifs"
              className="hidden md:inline-flex items-center px-3 py-1.5 rounded-[8px] text-sm font-medium text-[#cbd5e1] hover:text-white hover:bg-white/8 transition-colors whitespace-nowrap no-underline"
            >
              Tarifs
            </a>
            <Link
              href="/track"
              className="px-2.5 sm:px-3 py-1.5 rounded-[8px] text-xs sm:text-sm font-medium text-[#cbd5e1] hover:text-white hover:bg-white/8 transition-colors whitespace-nowrap no-underline"
            >
              Suivi colis
            </Link>
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex px-3 py-1.5 rounded-[8px] text-sm font-medium text-[#cbd5e1] hover:text-white hover:bg-white/8 transition-colors whitespace-nowrap no-underline"
            >
              Espace agence
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full font-semibold text-xs sm:text-sm bg-gradient-to-b from-[#ff6426] to-[#d9460f] hover:from-[#f05618] hover:to-[#c23b08] text-white shadow-[0_6px_20px_-4px_rgba(255,100,38,0.5)] transition-[transform,box-shadow] duration-150 active:scale-[0.97] whitespace-nowrap no-underline"
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

  return (
    <header className="sticky top-0 z-50 h-16 bg-[#f8fafc]/95 backdrop-blur-xl border-b border-[#0f172a]/10 text-[#0f172a] print:hidden">
      <div className="sc-wrap h-full flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold tracking-tight text-[15px] sm:text-[17px] text-[#0f172a] min-w-0 no-underline group"
          >
            <span className="h-8 w-8 rounded-[8px] bg-[#06101e] text-white inline-flex items-center justify-center shrink-0 group-hover:bg-[#d9460f] transition-colors">
              <Package className="w-4 h-4" aria-hidden="true" />
            </span>
            <span className="whitespace-nowrap font-[family-name:var(--font-archivo)]">
              TrackCargo CI
            </span>
          </Link>

          {agencyName && (
            <span className="hidden sm:inline-flex items-center gap-2 pl-3 sm:pl-4 border-l border-[#0f172a]/14 text-xs font-mono text-[#0f172a] truncate max-w-[240px]">
              <span
                className="h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0"
                aria-hidden="true"
              />
              <span className="truncate font-semibold">{agencyName}</span>
            </span>
          )}
        </div>

        <nav
          className="flex items-center gap-1 sm:gap-2 shrink-0"
          aria-label="Navigation principale"
        >
          {!isClientPortal && (
            <Link
              href="/track"
              className={`px-2.5 sm:px-3 py-1.5 rounded-[8px] text-xs sm:text-sm font-medium transition-colors whitespace-nowrap no-underline ${
                isTrackPage
                  ? "bg-[#06101e] text-white font-semibold"
                  : "text-[#475569] hover:text-[#0f172a] hover:bg-[#e2e8f0]/60"
              }`}
            >
              Suivi colis
            </Link>
          )}
          <Link
            href={ctaHref}
            className={`inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full font-semibold text-xs sm:text-sm transition-[background-color,transform] duration-150 active:scale-[0.97] whitespace-nowrap no-underline ${
              isClientPortal
                ? "bg-white hover:bg-[#f1f5f9] text-[#0f172a] border border-[#0f172a]/14"
                : "bg-[#d9460f] hover:bg-[#b83809] text-white shadow-xs"
            }`}
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
