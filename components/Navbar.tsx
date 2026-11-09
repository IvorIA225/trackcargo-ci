"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar({ agencyName }: { agencyName?: string }) {
  const pathname = usePathname();

  const navLinkClass = (active: boolean) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      active
        ? "bg-amber-500 text-slate-950 font-semibold"
        : "text-slate-200 hover:text-white hover:bg-slate-800"
    }`;

  return (
    <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-40 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-slate-950 font-black text-base shadow-sm">
            TC
          </span>
          <div className="leading-tight">
            <div className="font-bold tracking-tight text-white flex items-center gap-2">
              <span>{agencyName || "TrackCargo CI"}</span>
              <span className="hidden sm:inline-block text-[10px] uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                Abidjan 🇨🇮
              </span>
            </div>
            <div className="text-[11px] text-slate-400 hidden sm:block">
              Suivi Groupage & Transit Pro
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-1.5 sm:gap-2">
          <Link href="/" className={navLinkClass(pathname === "/")}>
            Offre SaaS
          </Link>
          <Link
            href="/track"
            className={navLinkClass(pathname.startsWith("/track"))}
          >
            Suivi Client
          </Link>
          <Link
            href="/dashboard"
            className={navLinkClass(pathname.startsWith("/dashboard"))}
          >
            Espace Agence
          </Link>
        </nav>
      </div>
    </header>
  );
}
