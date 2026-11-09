"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Lock } from "lucide-react";

export default function Navbar({
  agencyName,
  overlay = false,
}: {
  agencyName?: string;
  overlay?: boolean;
}) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  const navLinkClass = (active: boolean) =>
    `px-2 sm:px-3.5 py-2 rounded-[8px] text-[11px] sm:text-sm font-medium transition-colors whitespace-nowrap ${
      active
        ? "bg-[#1c2536] text-[#f3f1ec] border border-white/15"
        : "text-[#c4cddb] hover:text-[#f3f1ec] hover:bg-white/[0.06]"
    }`;

  return (
    <header
      className={`${
        overlay
          ? "fixed top-0 inset-x-0 bg-[#0a0d12]/80"
          : "sticky top-0 bg-[#0a0d12]/94"
      } backdrop-blur-md text-[#f3f1ec] border-b border-white/10 z-50 print:hidden`}
    >
      <div className="max-w-[82rem] mx-auto px-3 sm:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        <Link
          href="/"
          className="flex items-center gap-1.5 sm:gap-3 group min-w-0 shrink focus-visible:outline-2 focus-visible:outline-[#e89b2d]"
        >
          <span
            aria-hidden="true"
            className="inline-flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#141b27] border border-white/15 text-[#e89b2d] shadow-xs"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="square"
            >
              <rect x="3" y="5" width="18" height="14" rx="1.5" />
              <path d="M8 5v14M13 5v14M17.5 9l2.5 3-2.5 3" />
            </svg>
          </span>
          <div className="leading-tight min-w-0">
            <div className="font-bold tracking-tight text-[#f3f1ec] text-xs sm:text-base whitespace-nowrap truncate">
              {agencyName || "TrackCargo CI"}
            </div>
            <div className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#9ca6b8] hidden md:block">
              Abidjan · Groupage &amp; Transit
            </div>
          </div>
        </Link>

        <nav
          aria-label="Navigation principale"
          className="flex items-center gap-1 sm:gap-2.5 shrink-0"
        >
          {!isHome && (
            <Link href="/" className={navLinkClass(false)}>
              <span className="sm:hidden">Accueil</span>
              <span className="hidden sm:inline">Présentation</span>
            </Link>
          )}
          <Link
            href="/track"
            className={navLinkClass(pathname.startsWith("/track"))}
          >
            Suivi client
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-[8px] bg-[#e89b2d] hover:bg-[#f3aa3e] text-[#090b10] font-bold text-[11px] sm:text-sm transition-colors whitespace-nowrap shadow-xs"
          >
            <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" aria-hidden="true" />
            <span className="min-[480px]:hidden">Espace agence</span>
            <span className="hidden min-[480px]:inline">
              Ouvrir l&apos;espace agence
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 hidden sm:inline" aria-hidden="true" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
