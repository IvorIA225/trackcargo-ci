"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Check,
  Crown,
  LogOut,
  PauseCircle,
  PlayCircle,
  Save,
  Search,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import {
  Agency,
  PLAN_META,
  PlanTier,
  PlatformSettings,
  ResolvedSubscriptionState,
  SubscriptionEvent,
  SubscriptionStatus,
} from "@/lib/types";
import { formatDateFr, formatFcfa } from "@/lib/format";

type SuperAgencyRow = Agency & {
  batchCount: number;
  parcelCount: number;
  resolved: ResolvedSubscriptionState;
};

type StatusFilter = "ALL" | SubscriptionStatus;

export default function SuperAdminPage() {
  const router = useRouter();
  const [agencies, setAgencies] = useState<SuperAgencyRow[]>([]);
  const [recentEvents, setRecentEvents] = useState<SubscriptionEvent[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({
    id: "default",
    founderName: "TrackCargo CI",
    founderWhatsapp: "",
    founderWaveLink: "",
    founderOmNumber: "",
    updatedAt: "",
  });
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/super-admin/agencies", {
        cache: "no-store",
      });
      if (res.status === 401 || res.status === 503) {
        router.replace("/login");
        return;
      }
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      setAgencies(data.agencies || []);
      setRecentEvents(data.recentEvents || []);
      if (data.platformSettings) {
        setPlatformSettings(data.platformSettings);
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const kpis = useMemo(() => {
    const paying = agencies.filter((a) => !a.isDemo);
    const activeCount = agencies.filter(
      (a) => a.resolved.effectiveStatus === "ACTIVE"
    ).length;
    const trialCount = agencies.filter(
      (a) => a.resolved.effectiveStatus === "TRIAL"
    ).length;
    const attentionCount = agencies.filter(
      (a) =>
        a.resolved.effectiveStatus === "PAST_DUE" ||
        a.resolved.effectiveStatus === "SUSPENDED"
    ).length;
    const mrrActive = paying
      .filter((a) => a.resolved.effectiveStatus === "ACTIVE")
      .reduce((acc, a) => acc + PLAN_META[a.plan].priceFcfa, 0);
    const mrrPotential = paying
      .filter(
        (a) =>
          a.resolved.effectiveStatus === "ACTIVE" ||
          a.resolved.effectiveStatus === "TRIAL"
      )
      .reduce((acc, a) => acc + PLAN_META[a.plan].priceFcfa, 0);

    return {
      total: agencies.length,
      activeCount,
      trialCount,
      attentionCount,
      mrrActive,
      mrrPotential,
    };
  }, [agencies]);

  const filteredAgencies = useMemo(() => {
    return agencies.filter((a) => {
      if (
        statusFilter !== "ALL" &&
        a.resolved.effectiveStatus !== statusFilter
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          a.name.toLowerCase().includes(q) ||
          a.slug.toLowerCase().includes(q) ||
          a.commune.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [agencies, statusFilter, searchQuery]);

  const runAction = async (
    agencyId: string,
    payload: {
      action:
        | "ACTIVATE_30D"
        | "SET_PLAN"
        | "SUSPEND"
        | "REACTIVATE"
        | "EXPIRE_NOW";
      plan?: PlanTier;
    },
    successMsg: string
  ) => {
    setBusyId(agencyId);
    try {
      const res = await fetch(`/api/super-admin/agencies/${agencyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        notify(err.error || "Action refusée.");
        return;
      }
      await loadData();
      notify(successMsg);
    } finally {
      setBusyId(null);
    }
  };

  const handleSavePlatformSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/super-admin/agencies", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        founderName: platformSettings.founderName,
        founderWhatsapp: platformSettings.founderWhatsapp,
        founderWaveLink: platformSettings.founderWaveLink,
        founderOmNumber: platformSettings.founderOmNumber,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      notify(err.error || "Paramètres invalides.");
      return;
    }
    await loadData();
    notify("Coordonnées d'encaissement fondateur enregistrées.");
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f3ec] flex items-center justify-center text-[#43506b] font-semibold">
        Chargement de la console Super Admin...
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f6f3ec] text-[#09152b]">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-[16px] border border-[#09152b]/18 p-7 text-center space-y-4 shadow-[var(--sc-e2)]">
            <h1 className="text-xl font-extrabold">Accès Super Admin requis</h1>
            <p className="text-sm text-[#43506b]">
              Cette console est réservée au fondateur de TrackCargo CI.
            </p>
            <Link href="/dashboard" className="tc-btn-primary">
              Retour à mon espace agence
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f3ec] text-[#09152b]">
      <Navbar />

      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 bg-[#0a2e6e] text-white px-4 py-3 rounded-[10px] shadow-2xl border border-[#ff5c1b] text-sm font-bold flex items-center gap-2"
        >
          <Check className="w-4 h-4 text-[#ff5c1b]" aria-hidden="true" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Founder Banner */}
      <div className="bg-[#0a2e6e] text-white border-b border-[#09152b]">
        <div className="max-w-[82rem] mx-auto px-4 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="h-8 w-8 rounded-[8px] bg-[#ff5c1b] text-[#09152b] inline-flex items-center justify-center border border-[#09152b]">
              <Crown className="w-4 h-4" aria-hidden="true" />
            </span>
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#fef08a]">
                Console Fondateur SaaS
              </div>
              <h1 className="text-lg font-extrabold text-white">
                Pilotage des agences &amp; abonnements Wave / OM
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/a/ivoire-cargo-express"
              target="_blank"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[8px] bg-[#16428f] hover:bg-[#1e53af] text-white font-bold text-xs border border-white/25 no-underline"
            >
              <span>Portail démo</span>
              <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-rose-600 hover:bg-rose-500 border border-rose-800 text-white font-bold text-xs cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-[82rem] w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-[14px] border border-[#09152b]/14 p-4 shadow-[var(--sc-e1)]">
            <div className="text-xs font-mono font-bold text-[#43506b] uppercase">
              Total agences
            </div>
            <div className="text-2xl font-extrabold font-mono text-[#09152b] mt-1">
              {kpis.total}
            </div>
          </div>

          <div className="bg-white rounded-[14px] border border-[#09152b]/14 p-4 shadow-[var(--sc-e1)]">
            <div className="text-xs font-mono font-bold text-emerald-800 uppercase">
              Actives payées
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-700 mt-1">
              {kpis.activeCount}
            </div>
          </div>

          <div className="bg-white rounded-[14px] border border-[#09152b]/14 p-4 shadow-[var(--sc-e1)]">
            <div className="text-xs font-mono font-bold text-[#0a2e6e] uppercase">
              En essai (14j)
            </div>
            <div className="text-2xl font-extrabold font-mono text-[#0a2e6e] mt-1">
              {kpis.trialCount}
            </div>
          </div>

          <div className="bg-white rounded-[14px] border border-[#09152b]/14 p-4 shadow-[var(--sc-e1)]">
            <div className="text-xs font-mono font-bold text-amber-800 uppercase">
              Expirées / Suspendues
            </div>
            <div className="text-2xl font-extrabold font-mono text-amber-700 mt-1">
              {kpis.attentionCount}
            </div>
          </div>

          <div className="bg-[#0a2e6e] text-white rounded-[14px] border border-[#09152b] p-4 shadow-[var(--sc-e2)] col-span-2 lg:col-span-1">
            <div className="text-xs font-mono font-bold text-[#fef08a] uppercase">
              MRR actif payant
            </div>
            <div className="text-xl font-extrabold font-mono mt-1">
              {formatFcfa(kpis.mrrActive)}
            </div>
            <div className="text-[11px] text-[#c7d9f7]">
              Potentiel avec essais : {formatFcfa(kpis.mrrPotential)}
            </div>
          </div>
        </div>

        {/* Founder Billing Coordinates */}
        <form
          onSubmit={handleSavePlatformSettings}
          className="bg-white rounded-[16px] border border-[#09152b]/14 p-5 sm:p-6 shadow-[var(--sc-e1)] space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-extrabold text-[#09152b]">
                Vos coordonnées d&apos;encaissement SaaS (affichées aux agences
                expirées)
              </h2>
              <p className="text-xs text-[#43506b]">
                Toute agence dont l&apos;essai expire voit ce lien Wave et ce
                numéro Orange Money sur son écran de renouvellement.
              </p>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-[#0a2e6e] hover:bg-[#124eb5] text-white font-bold text-xs cursor-pointer shrink-0"
            >
              <Save className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Enregistrer mes liens</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-mono font-bold text-[#43506b] mb-1">
                Nom affiché
              </label>
              <input
                type="text"
                value={platformSettings.founderName}
                onChange={(e) =>
                  setPlatformSettings({
                    ...platformSettings,
                    founderName: e.target.value,
                  })
                }
                className="w-full h-10 px-3 rounded-[8px] border border-[#09152b]/22 bg-[#f6f3ec] text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono font-bold text-[#43506b] mb-1">
                WhatsApp Fondateur
              </label>
              <input
                type="text"
                value={platformSettings.founderWhatsapp}
                onChange={(e) =>
                  setPlatformSettings({
                    ...platformSettings,
                    founderWhatsapp: e.target.value,
                  })
                }
                className="w-full h-10 px-3 rounded-[8px] border border-[#09152b]/22 bg-[#f6f3ec] text-sm font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono font-bold text-[#43506b] mb-1">
                Numéro Orange Money
              </label>
              <input
                type="text"
                value={platformSettings.founderOmNumber}
                onChange={(e) =>
                  setPlatformSettings({
                    ...platformSettings,
                    founderOmNumber: e.target.value,
                  })
                }
                className="w-full h-10 px-3 rounded-[8px] border border-[#09152b]/22 bg-[#f6f3ec] text-sm font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono font-bold text-[#43506b] mb-1">
                Lien marchand Wave (https://)
              </label>
              <input
                type="url"
                value={platformSettings.founderWaveLink}
                onChange={(e) =>
                  setPlatformSettings({
                    ...platformSettings,
                    founderWaveLink: e.target.value,
                  })
                }
                className="w-full h-10 px-3 rounded-[8px] border border-[#09152b]/22 bg-[#f6f3ec] text-sm font-mono"
                required
              />
            </div>
          </div>
        </form>

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["ALL", "Toutes"],
                ["ACTIVE", "Actives"],
                ["TRIAL", "Essai 14j"],
                ["PAST_DUE", "Expirées"],
                ["SUSPENDED", "Suspendues"],
              ] as Array<[StatusFilter, string]>
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={`px-3.5 py-2 rounded-[8px] text-xs font-bold border cursor-pointer ${
                  statusFilter === key
                    ? "bg-[#ff5c1b] text-[#09152b] border-[#09152b]"
                    : "bg-white text-[#09152b] border-[#09152b]/18 hover:bg-[#dce7fa]/50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search
              className="w-4 h-4 text-[#43506b] absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrer par agence, slug ou commune..."
              className="w-full h-10 pl-9 pr-3 rounded-[8px] border border-[#09152b]/22 bg-white text-sm"
            />
          </div>
        </div>

        {/* Agencies List */}
        <div className="space-y-3">
          {filteredAgencies.map((ag) => {
            const st = ag.resolved.effectiveStatus;
            const statusChip =
              st === "ACTIVE"
                ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                : st === "TRIAL"
                ? "bg-[#dce7fa] text-[#0a2e6e] border-[#0a2e6e]/30"
                : st === "PAST_DUE"
                ? "bg-amber-100 text-amber-900 border-amber-300"
                : "bg-rose-100 text-rose-900 border-rose-300";

            return (
              <div
                key={ag.id}
                className="bg-white rounded-[14px] border border-[#09152b]/14 p-5 shadow-[var(--sc-e1)] flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-extrabold text-[#09152b]">
                      {ag.name}
                    </span>
                    {ag.isDemo && (
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-[5px] bg-[#ebe5d8] text-[#09152b]">
                        DÉMO VITRINE
                      </span>
                    )}
                    <span
                      className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-[6px] border ${statusChip}`}
                    >
                      {st}
                      {(st === "ACTIVE" || st === "TRIAL") &&
                        ` · ${ag.resolved.daysRemaining} j`}
                    </span>
                  </div>
                  <div className="text-xs text-[#43506b] flex flex-wrap items-center gap-3">
                    <span>
                      Commune : <strong className="text-[#09152b]">{ag.commune}</strong>
                    </span>
                    <span>
                      WhatsApp : <span className="font-mono">{ag.whatsappPhone}</span>
                    </span>
                    <span>
                      Activité : <strong>{ag.batchCount}</strong> lots ·{" "}
                      <strong>{ag.parcelCount}</strong> colis
                    </span>
                    <Link
                      href={`/a/${ag.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 font-mono font-bold text-[#0a2e6e] hover:text-[#ff5c1b] hover:underline"
                    >
                      <span>/a/{ag.slug}</span>
                      <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
                    </Link>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={ag.plan}
                    disabled={busyId === ag.id}
                    aria-label={`Forfait de ${ag.name}`}
                    onChange={(e) =>
                      runAction(
                        ag.id,
                        {
                          action: "SET_PLAN",
                          plan: e.target.value as PlanTier,
                        },
                        `Forfait de ${ag.name} mis à jour.`
                      )
                    }
                    className="h-9 px-2.5 rounded-[8px] border border-[#09152b]/22 bg-[#f6f3ec] text-xs font-bold text-[#09152b]"
                  >
                    {(Object.keys(PLAN_META) as PlanTier[]).map((p) => (
                      <option key={p} value={p}>
                        {PLAN_META[p].label} ({formatFcfa(PLAN_META[p].priceFcfa)})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={busyId === ag.id}
                    onClick={() =>
                      runAction(
                        ag.id,
                        { action: "ACTIVATE_30D", plan: ag.plan },
                        `${ag.name} prolongée de +30 jours.`
                      )
                    }
                    className="px-3.5 py-2 rounded-[8px] bg-[#10b981] hover:bg-[#34d399] text-[#042318] font-extrabold text-xs cursor-pointer disabled:opacity-50"
                  >
                    +30 jours (Payé)
                  </button>

                  {!ag.isDemo && st !== "PAST_DUE" && st !== "SUSPENDED" && (
                    <button
                      type="button"
                      disabled={busyId === ag.id}
                      onClick={() =>
                        runAction(
                          ag.id,
                          { action: "EXPIRE_NOW" },
                          `${ag.name} passée en attente de paiement.`
                        )
                      }
                      className="px-3 py-2 rounded-[8px] bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-xs border border-amber-300 cursor-pointer disabled:opacity-50"
                    >
                      Marquer expirée
                    </button>
                  )}

                  {st === "SUSPENDED" ? (
                    <button
                      type="button"
                      disabled={busyId === ag.id}
                      onClick={() =>
                        runAction(
                          ag.id,
                          { action: "REACTIVATE" },
                          `${ag.name} réactivée.`
                        )
                      }
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-[8px] bg-[#0a2e6e] hover:bg-[#124eb5] text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                    >
                      <PlayCircle className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Réactiver</span>
                    </button>
                  ) : (
                    !ag.isDemo && (
                      <button
                        type="button"
                        disabled={busyId === ag.id}
                        onClick={() =>
                          runAction(
                            ag.id,
                            { action: "SUSPEND" },
                            `${ag.name} suspendue.`
                          )
                        }
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-[8px] bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold text-xs border border-rose-300 cursor-pointer disabled:opacity-50"
                      >
                        <PauseCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Suspendre</span>
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Billing Events */}
        {recentEvents.length > 0 && (
          <section className="bg-white rounded-[16px] border border-[#09152b]/14 p-6 shadow-[var(--sc-e1)] space-y-4">
            <h2 className="text-base font-extrabold text-[#09152b]">
              Journal récent de facturation et d&apos;activation
            </h2>
            <div className="divide-y divide-[#09152b]/10 text-xs">
              {recentEvents.slice(0, 15).map((ev) => (
                <div
                  key={ev.id}
                  className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-[#0a2e6e]">
                      {ev.action}
                    </span>
                    <span className="text-[#09152b] font-semibold">
                      {ev.note}
                    </span>
                    <span className="text-[#43506b]">({ev.actorEmail})</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-[#43506b]">
                    {ev.amountFcfa > 0 && (
                      <span className="font-bold text-emerald-700">
                        +{formatFcfa(ev.amountFcfa)}
                      </span>
                    )}
                    <span>{formatDateFr(ev.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
