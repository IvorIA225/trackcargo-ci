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

  return (
    <header className="sticky top-0 z-50 h-16 bg-[#f4f1ea]/95 backdrop-blur-xl border-b border-[#11161f]/12 text-[#11161f] print:hidden">
      <div className="sc-wrap h-full flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold tracking-tight text-[15px] sm:text-[17px] text-[#11161f] min-w-0 no-underline group"
          >
            <span className="h-8 w-8 rounded-[8px] bg-[#0f1724] text-white inline-flex items-center justify-center shrink-0 group-hover:bg-[#c8430e] transition-colors">
              <Package className="w-4 h-4" aria-hidden="true" />
            </span>
            <span className="whitespace-nowrap font-[family-name:var(--font-archivo)]">
              TrackCargo CI
            </span>
          </Link>

          {agencyName ? (
            <span className="hidden sm:inline-flex items-center gap-2 pl-3 sm:pl-4 border-l border-[#11161f]/14 text-xs font-mono text-[#11161f] truncate max-w-[240px]">
              <span
                className="h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0"
                aria-hidden="true"
              />
              <span className="truncate font-semibold">{agencyName}</span>
            </span>
          ) : isHome && activeCorridorLabel ? (
            <span className="hidden lg:inline-flex items-center gap-2 pl-4 border-l border-[#11161f]/14 text-[11.5px] font-mono text-[#4e5969] whitespace-nowrap">
              <span
                className="h-1.5 w-1.5 rounded-full bg-[#c8430e] shrink-0"
                aria-hidden="true"
              />
              <span>VRIDI · FHB ·</span>
              <strong className="text-[#11161f] font-semibold">
                {activeCorridorLabel}
              </strong>
            </span>
          ) : null}
        </div>

        <nav
          className="flex items-center gap-1 sm:gap-2 shrink-0"
          aria-label="Navigation principale"
        >
          {isHome && (
            <a
              href="#act-quai"
              className="hidden xl:inline-flex items-center px-3 py-1.5 rounded-[8px] text-sm font-medium text-[#4e5969] hover:text-[#11161f] hover:bg-[#eae5da]/70 transition-colors whitespace-nowrap no-underline"
            >
              Quai Vridi
            </a>
          )}
          {isHome && (
            <a
              href="#portail-live"
              className="hidden lg:inline-flex items-center px-3 py-1.5 rounded-[8px] text-sm font-medium text-[#4e5969] hover:text-[#11161f] hover:bg-[#eae5da]/70 transition-colors whitespace-nowrap no-underline"
            >
              Portail live
            </a>
          )}
          {isHome && (
            <a
              href="#tarifs"
              className="hidden md:inline-flex items-center px-3 py-1.5 rounded-[8px] text-sm font-medium text-[#4e5969] hover:text-[#11161f] hover:bg-[#eae5da]/70 transition-colors whitespace-nowrap no-underline"
            >
              Tarifs
            </a>
          )}
          {!isClientPortal && (
            <Link
              href="/track"
              className={`px-2.5 sm:px-3 py-1.5 rounded-[8px] text-xs sm:text-sm font-medium transition-colors whitespace-nowrap no-underline ${
                isTrackPage
                  ? "bg-[#0f1724] text-white font-semibold"
                  : "text-[#4e5969] hover:text-[#11161f] hover:bg-[#eae5da]/70"
              }`}
            >
              Suivi colis
            </Link>
          )}
          {isHome && (
            <Link
              href="/dashboard"
              className="hidden md:inline-flex px-3 py-1.5 rounded-[8px] text-sm font-medium text-[#4e5969] hover:text-[#11161f] hover:bg-[#eae5da]/70 transition-colors whitespace-nowrap no-underline"
            >
              Espace agence
            </Link>
          )}
          <Link
            href={ctaHref}
            className={`inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full font-semibold text-xs sm:text-sm transition-[background-color,transform] duration-150 active:scale-[0.97] whitespace-nowrap no-underline ${
              isClientPortal
                ? "bg-white hover:bg-[#eae5da] text-[#11161f] border border-[#11161f]/14"
                : "bg-[#c8430e] hover:bg-[#ad3709] text-white shadow-xs"
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
