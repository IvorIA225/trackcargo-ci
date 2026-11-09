"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Copy,
  CreditCard,
  LogOut,
  MessageSquare,
  Plane,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Ship,
  Target,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import {
  Agency,
  Batch,
  Parcel,
  PARCEL_STATUS_META,
  ParcelStatus,
  PAYMENT_STATUS_META,
  PaymentStatus,
  PlatformSettings,
  ResolvedSubscriptionState,
  TransportMode,
} from "@/lib/types";
import {
  buildWhatsappClientLink,
  formatFcfa,
  normalizePhoneClient,
} from "@/lib/format";

type TabId = "batches" | "parcels" | "import" | "settings";

function isSafeHttpsUrlClient(raw?: string): boolean {
  if (!raw) return false;
  try {
    return new URL(raw).protocol === "https:";
  } catch {
    return false;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [agency, setAgency] = useState<Agency | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [subscription, setSubscription] =
    useState<ResolvedSubscriptionState | null>(null);
  const [platformSettings, setPlatformSettings] =
    useState<PlatformSettings | null>(null);
  const [suspendedBlocked, setSuspendedBlocked] = useState(false);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("batches");
  const [toast, setToast] = useState<string>("");

  // Prospect Quick Demo Rebrander (demo agency only)
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoName, setDemoName] = useState("");
  const [demoCommune, setDemoCommune] = useState("");

  // New Batch Form
  const [batchCode, setBatchCode] = useState("AIR-GZ-2611C");
  const [batchMode, setBatchMode] = useState<TransportMode>("aerien");
  const [batchOrigin, setBatchOrigin] = useState("Guangzhou, Chine");
  const [batchDest, setBatchDest] = useState("Entrepôt Treichville, Abidjan");

  // New Parcel Form
  const [parcelBatchId, setParcelBatchId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("+225");
  const [description, setDescription] = useState("");
  const [weightKg, setWeightKg] = useState("5");
  const [volumeCbm, setVolumeCbm] = useState("0");

  // Filter Parcels
  const [filterBatch, setFilterBatch] = useState("ALL");
  const [searchText, setSearchText] = useState("");

  // Bulk Excel Paste
  const [excelText, setExcelText] = useState(
    "Awa Touré;+2250709112233;3 cartons sacs à main;12\nKoffi Serge;+2250554889900;Accessoires téléphone;6.5"
  );
  const [importBatchId, setImportBatchId] = useState("");

  // Settings form
  const [settingsForm, setSettingsForm] = useState<Partial<Agency>>({});

  const notifyToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const loadOverview = useCallback(async () => {
    try {
      const res = await fetch("/api/overview", { cache: "no-store" });
      if (res.status === 401 || res.status === 503) {
        router.replace("/login");
        return;
      }
      if (res.status === 403) {
        const errData = await res.json().catch(() => ({}));
        if (errData.code === "AGENCY_SUSPENDED") {
          setSuspendedBlocked(true);
          setSubscription(errData.subscription || null);
          return;
        }
        // Check if logged in as SUPER_ADMIN
        const sessRes = await fetch("/api/auth/session", { cache: "no-store" });
        const sess = await sessRes.json().catch(() => ({}));
        if (sess.role === "SUPER_ADMIN") {
          router.replace("/super-admin");
          return;
        }
        router.replace("/login");
        return;
      }
      if (!res.ok) {
        return;
      }
      const data = await res.json();
      setSuspendedBlocked(false);
      setAgency(data.agency);
      setBatches(data.batches || []);
      setParcels(data.parcels || []);
      setSubscription(data.subscription || null);
      setPlatformSettings(data.platformSettings || null);
      setSettingsForm(data.agency || {});
      setDemoName(data.agency?.name || "");
      setDemoCommune(data.agency?.commune || "");
      if (data.batches?.[0]?.id) {
        setParcelBatchId((prev) => prev || data.batches[0].id);
        setImportBatchId((prev) => prev || data.batches[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const stats = useMemo(() => {
    const unpaidFcfa = parcels
      .filter((p) => p.paymentStatus === "IMPAYE")
      .reduce((acc, p) => acc + p.amountFcfa, 0);
    const collectedFcfa = parcels
      .filter((p) => p.paymentStatus !== "IMPAYE")
      .reduce((acc, p) => acc + p.amountFcfa, 0);
    const readyCount = parcels.filter((p) => p.status === "PRET_RETRAIT").length;
    return {
      totalParcels: parcels.length,
      readyCount,
      unpaidFcfa,
      collectedFcfa,
    };
  }, [parcels]);

  const parsedImportRows = useMemo(() => {
    return excelText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.includes("\t") ? line.split("\t") : line.split(";");
        return {
          clientName: (parts[0] || "").trim(),
          clientPhone: (parts[1] || "").trim(),
          description: (parts[2] || "Colis groupage").trim(),
          weightKg: parseFloat((parts[3] || "1").replace(",", ".")) || 1,
        };
      })
      .filter((r) => r.clientName && r.clientPhone);
  }, [excelText]);

  const filteredParcels = useMemo(() => {
    return parcels.filter((p) => {
      if (filterBatch !== "ALL" && p.batchId !== filterBatch) return false;
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        return (
          p.trackingCode.toLowerCase().includes(q) ||
          p.clientName.toLowerCase().includes(q) ||
          p.clientPhone.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [parcels, filterBatch, searchText]);

  const handleApiError = async (res: Response, fallback: string) => {
    if (res.status === 401 || res.status === 503) {
      router.replace("/login");
      return;
    }
    if (res.status === 402 || res.status === 403) {
      await loadOverview();
    }
    try {
      const data = await res.json();
      notifyToast(data.error || fallback);
    } catch {
      notifyToast(fallback);
    }
  };

  const handleApplyProspectDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoName.trim()) return;
    const res = await fetch("/api/agency", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: demoName.trim(),
        commune: demoCommune.trim() || "Treichville",
        address: `Entrepôt ${demoName.trim()}, ${
          demoCommune.trim() || "Treichville"
        }, Abidjan`,
      }),
    });
    if (!res.ok) {
      await handleApiError(res, "Impossible de rebrander le portail.");
      return;
    }
    await loadOverview();
    setDemoOpen(false);
    notifyToast(`Portail rebrandé en direct pour "${demoName.trim()}".`);
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: batchCode,
        mode: batchMode,
        origin: batchOrigin,
        destination: batchDest,
      }),
    });
    if (!res.ok) {
      await handleApiError(res, "Impossible de créer le lot.");
      return;
    }
    await loadOverview();
    notifyToast(`Lot ${batchCode} créé avec succès.`);
    setBatchCode(
      `${batchMode === "maritime" ? "CON" : "AIR"}-GZ-${Math.floor(
        100 + Math.random() * 899
      )}`
    );
  };

  const handleBulkStatus = async (batchId: string, status: ParcelStatus) => {
    const res = await fetch(`/api/batches/${batchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      await handleApiError(res, "Impossible de mettre à jour le lot.");
      return;
    }
    const data = await res.json();
    await loadOverview();
    notifyToast(
      `Lot mis à jour : ${data.updatedCount} colis passés à "${PARCEL_STATUS_META[status].shortLabel}".`
    );
  };

  const handleCreateParcel = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        batchId: parcelBatchId,
        clientName,
        clientPhone,
        description,
        weightKg: Number(weightKg),
        volumeCbm: Number(volumeCbm),
      }),
    });
    if (!res.ok) {
      await handleApiError(res, "Impossible d'enregistrer le colis.");
      return;
    }
    const created = await res.json();
    setClientName("");
    setClientPhone("+225");
    setDescription("");
    await loadOverview();
    notifyToast(
      `Colis ${created.trackingCode} enregistré (${formatFcfa(created.amountFcfa)}).`
    );
  };

  const handleUpdateParcel = async (
    id: string,
    patch: {
      status?: ParcelStatus;
      paymentStatus?: PaymentStatus;
      markWhatsappNotified?: boolean;
    }
  ) => {
    const res = await fetch(`/api/packages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      await handleApiError(res, "Erreur de mise à jour du colis.");
      return;
    }
    await loadOverview();
  };

  const handleBulkImport = async () => {
    if (parsedImportRows.length === 0) return;
    const res = await fetch("/api/packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        batchId: importBatchId,
        items: parsedImportRows,
      }),
    });
    if (!res.ok) {
      await handleApiError(res, "Échec de l'import Excel.");
      return;
    }
    const data = await res.json();
    await loadOverview();
    setActiveTab("parcels");
    notifyToast(`${data.count} colis importés depuis Excel en 1 clic.`);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/agency", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: settingsForm.name,
        commune: settingsForm.commune,
        address: settingsForm.address,
        whatsappPhone: settingsForm.whatsappPhone,
        waveLink: settingsForm.waveLink,
        orangeMoneyNumber: settingsForm.orangeMoneyNumber,
        ratePerKgAirFcfa: Number(settingsForm.ratePerKgAirFcfa) || 8500,
        ratePerCbmSeaFcfa: Number(settingsForm.ratePerCbmSeaFcfa) || 320000,
      }),
    });
    if (!res.ok) {
      await handleApiError(res, "Paramètres invalides.");
      return;
    }
    await loadOverview();
    notifyToast("Paramètres et tarifs agence mis à jour.");
  };

  const openWhatsappForParcel = (parcel: Parcel) => {
    if (!agency) return;
    const batch = batches.find((b) => b.id === parcel.batchId);
    const originUrl =
      typeof window !== "undefined" ? window.location.origin : "";
    const url = buildWhatsappClientLink(parcel, agency, batch, originUrl);
    window.open(url, "_blank", "noopener,noreferrer");
    void handleUpdateParcel(parcel.id, { markWhatsappNotified: true });
  };

  const handleCopyTrackLink = async (trackingCode: string) => {
    if (typeof window === "undefined" || !agency) return;
    const url = `${window.location.origin}/a/${agency.slug}?q=${encodeURIComponent(
      trackingCode
    )}`;
    try {
      await navigator.clipboard.writeText(url);
      notifyToast(`Lien copié : ${url}`);
    } catch {
      notifyToast(`Lien client : /a/${agency.slug}?q=${trackingCode}`);
    }
  };

  const handleCopyAgencyPortal = async () => {
    if (typeof window === "undefined" || !agency) return;
    const url = `${window.location.origin}/a/${agency.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      notifyToast(`Lien de votre portail copié : ${url}`);
    } catch {
      notifyToast(`Portail public : /a/${agency.slug}`);
    }
  };

  const handleResetDemo = async () => {
    const res = await fetch("/api/reset", { method: "POST" });
    if (!res.ok) {
      await handleApiError(res, "Impossible de réinitialiser la démo.");
      return;
    }
    await loadOverview();
    notifyToast("Données de démonstration réinitialisées.");
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f3ec] flex items-center justify-center text-[#43506b] font-semibold">
        Chargement de l&apos;espace agence...
      </div>
    );
  }

  if (suspendedBlocked) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f6f3ec] text-[#09152b]">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white rounded-[16px] border-2 border-[#09152b] shadow-[var(--sc-e3)] p-7 space-y-5 text-center">
            <div className="mx-auto h-12 w-12 rounded-[10px] bg-rose-100 border border-rose-400 text-rose-800 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-extrabold text-[#09152b]">
              Compte agence suspendu
            </h1>
            <p className="text-sm text-[#43506b] leading-relaxed">
              L&apos;accès à cet espace et à son portail public a été
              temporairement suspendu par l&apos;administration TrackCargo CI.
              Contactez notre support WhatsApp pour régulariser la situation.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleLogout}
                className="tc-btn-ghost"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                <span>Se déconnecter</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!agency) {
    return (
      <div className="min-h-screen bg-[#f6f3ec] flex items-center justify-center text-[#43506b] font-semibold">
        Redirection vers la connexion sécurisée...
      </div>
    );
  }

  const isPastDue = subscription?.effectiveStatus === "PAST_DUE";
  const founderWaDigits = normalizePhoneClient(
    platformSettings?.founderWhatsapp || "+2250747182383"
  ).replace(/^\+/, "");
  const renewalWaHref = `https://wa.me/${founderWaDigits}?text=${encodeURIComponent(
    `Bonjour, je viens d'effectuer le règlement de ${formatFcfa(
      subscription?.planPriceFcfa || 60000
    )} pour réactiver mon agence ${agency.name} (${agency.slug}). Voici ma capture :`
  )}`;

  const subBadgeText =
    subscription?.effectiveStatus === "TRIAL"
      ? `Essai gratuit : ${subscription.daysRemaining} j restants`
      : subscription?.effectiveStatus === "ACTIVE"
      ? `${subscription.planLabel} actif : ${subscription.daysRemaining} j restants`
      : "Abonnement expiré (Wave/OM requis)";

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f3ec] text-[#09152b]">
      <Navbar agencyName={agency.name} />

      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 bg-[#0a2e6e] text-white px-4 py-3 rounded-[10px] shadow-2xl border border-[#ff5c1b] text-sm font-bold flex items-center gap-2"
        >
          <Check className="w-4 h-4 text-[#ff5c1b]" aria-hidden="true" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Agency & Subscription Bar — Cargo Cobalt */}
      <div className="bg-[#0a2e6e] text-white border-b border-[#09152b]">
        <div className="max-w-[82rem] mx-auto px-4 sm:px-8 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 text-xs sm:text-sm">
          <div className="flex flex-wrap items-center gap-2.5 text-[#dce7fa]">
            <Target className="w-4 h-4 text-[#ff5c1b] shrink-0" aria-hidden="true" />
            <span>
              Espace <strong className="text-white">{agency.name}</strong> (
              {agency.commune})
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-[6px] text-xs font-mono font-extrabold border ${
                isPastDue
                  ? "bg-amber-300 text-[#09152b] border-[#09152b]"
                  : "bg-[#16428f] text-[#fef08a] border-white/25"
              }`}
            >
              {subBadgeText}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyAgencyPortal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-white text-[#09152b] hover:bg-[#f6f3ec] font-bold text-xs border border-[#09152b] cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-[#0a2e6e]" aria-hidden="true" />
              <span>Copier lien client /a/{agency.slug}</span>
            </button>

            <Link
              href={`/a/${agency.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[8px] bg-[#ff5c1b] hover:bg-[#ff7136] text-[#09152b] font-extrabold text-xs border border-[#09152b] no-underline"
            >
              <span>Voir portail client</span>
              <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>

            {agency.isDemo && !isPastDue && (
              <>
                <button
                  type="button"
                  onClick={() => setDemoOpen((v) => !v)}
                  className="px-3 py-1.5 rounded-[8px] bg-[#16428f] hover:bg-[#1e53af] text-white border border-white/25 font-bold text-xs cursor-pointer"
                >
                  {demoOpen ? "Fermer" : "Rebrander démo"}
                </button>
                <button
                  type="button"
                  onClick={handleResetDemo}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#071f4a] border border-white/25 text-white font-semibold text-xs hover:bg-[#113b86] cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Réinitialiser démo</span>
                </button>
              </>
            )}

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

        {demoOpen && agency.isDemo && !isPastDue && (
          <form
            onSubmit={handleApplyProspectDemo}
            className="max-w-[82rem] mx-auto px-4 sm:px-8 pb-4 pt-2 flex flex-col sm:flex-row gap-3 items-end border-t border-white/15"
          >
            <div className="flex-1 w-full">
              <label className="block text-xs font-mono text-[#c7d9f7] mb-1">
                Nom du prospect (ex: A-Cargo Logistique, World Transit)
              </label>
              <input
                type="text"
                value={demoName}
                onChange={(e) => setDemoName(e.target.value)}
                className="w-full h-10 px-3 rounded-[8px] border border-white/25 bg-white text-[#09152b] text-sm font-semibold"
                required
              />
            </div>
            <div className="w-full sm:w-56">
              <label className="block text-xs font-mono text-[#c7d9f7] mb-1">
                Commune Abidjan
              </label>
              <input
                type="text"
                value={demoCommune}
                onChange={(e) => setDemoCommune(e.target.value)}
                placeholder="Treichville / Adjamé / Cocody"
                className="w-full h-10 px-3 rounded-[8px] border border-white/25 bg-white text-[#09152b] text-sm font-semibold"
              />
            </div>
            <button
              type="submit"
              className="h-10 px-5 rounded-[8px] bg-[#ff5c1b] hover:bg-[#ff7136] text-[#09152b] font-extrabold text-sm border border-[#09152b] cursor-pointer whitespace-nowrap"
            >
              Appliquer le branding
            </button>
          </form>
        )}
      </div>

      <main className="flex-1 max-w-[82rem] w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
        {/* KPIs (always visible read-only even when PAST_DUE) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-[14px] border border-[#09152b]/14 p-4 sm:p-5 shadow-[var(--sc-e1)]">
            <div className="text-xs font-mono font-bold text-[#43506b] uppercase">
              Total colis actifs
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#09152b] mt-1 font-mono tabular-nums">
              {stats.totalParcels}
            </div>
            <div className="text-xs text-[#43506b] mt-1">
              Sur {batches.length} lots / conteneurs
            </div>
          </div>

          <div className="bg-white rounded-[14px] border border-[#09152b]/14 p-4 sm:p-5 shadow-[var(--sc-e1)]">
            <div className="text-xs font-mono font-bold text-emerald-800 uppercase">
              Prêts au retrait Abidjan
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 mt-1 font-mono tabular-nums">
              {stats.readyCount}
            </div>
            <div className="text-xs text-[#43506b] mt-1">
              À notifier sur WhatsApp
            </div>
          </div>

          <div className="bg-white rounded-[14px] border border-[#09152b]/14 p-4 sm:p-5 shadow-[var(--sc-e1)]">
            <div className="text-xs font-mono font-bold text-rose-800 uppercase">
              Reste à encaisser
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-rose-700 mt-1 font-mono tabular-nums">
              {formatFcfa(stats.unpaidFcfa)}
            </div>
            <div className="text-xs text-[#43506b] mt-1">
              Frais de fret en attente
            </div>
          </div>

          <div className="bg-[#0a2e6e] text-white rounded-[14px] border border-[#09152b] p-4 sm:p-5 shadow-[var(--sc-e2)]">
            <div className="text-xs font-mono font-bold text-[#ff966b] uppercase">
              Déjà encaissé
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-white mt-1 font-mono tabular-nums">
              {formatFcfa(stats.collectedFcfa)}
            </div>
            <div className="text-xs text-[#c7d9f7] mt-1">
              Wave, Orange Money et espèces
            </div>
          </div>
        </div>

        {/* PAST_DUE Renewal Gate */}
        {isPastDue && subscription ? (
          <section
            aria-label="Renouvellement abonnement TrackCargo CI"
            className="bg-white rounded-[18px] border-2 border-[#09152b] shadow-[var(--sc-e3)] overflow-hidden"
          >
            <div className="bg-[#0a2e6e] text-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-mono font-extrabold uppercase px-2.5 py-1 rounded-[6px] bg-amber-300 text-[#09152b] border border-[#09152b]">
                  <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Abonnement à renouveler</span>
                </span>
                <h2 className="sc-display sc-display--md text-white font-extrabold">
                  Réactivez la gestion de vos lots en 2 minutes.
                </h2>
                <p className="text-sm text-[#dce7fa] max-w-2xl">
                  Votre période d&apos;essai ou mensualité est arrivée à terme.
                  Bonne nouvelle : votre portail client public{" "}
                  <Link
                    href={`/a/${agency.slug}`}
                    className="font-mono font-bold text-[#ff966b] underline"
                  >
                    /a/{agency.slug}
                  </Link>{" "}
                  reste consultable afin de ne pas bloquer vos clients actuels.
                </p>
              </div>
              <div className="bg-[#071f4a] rounded-[12px] border border-white/20 p-4 text-left sm:text-right shrink-0">
                <div className="text-xs font-mono uppercase text-[#fef08a] font-bold">
                  Forfait {subscription.planLabel}
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white mt-1">
                  {formatFcfa(subscription.planPriceFcfa)}
                </div>
                <div className="text-xs text-[#c7d9f7]">pour 30 jours</div>
              </div>
            </div>

            <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-[#f6f3ec] rounded-[14px] border border-[#09152b]/14 p-5 space-y-3">
                <div className="text-xs font-mono font-extrabold uppercase text-[#0a2e6e] flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-[#ff5c1b]" aria-hidden="true" />
                  <span>Option 1 : Wave Business</span>
                </div>
                <p className="text-sm text-[#43506b]">
                  Réglez directement {formatFcfa(subscription.planPriceFcfa)}{" "}
                  sur le lien Wave officiel TrackCargo CI.
                </p>
                {isSafeHttpsUrlClient(platformSettings?.founderWaveLink) && (
                  <a
                    href={platformSettings?.founderWaveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-[8px] bg-[#22d3ee] hover:bg-[#38bdf8] text-[#09152b] font-extrabold text-sm border border-[#09152b]/25 flex items-center justify-center gap-2 no-underline"
                  >
                    <span>Payer par Wave maintenant</span>
                    <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                  </a>
                )}
              </div>

              <div className="bg-[#fff4ee] rounded-[14px] border border-[#ff5c1b]/45 p-5 space-y-2.5">
                <div className="text-xs font-mono font-extrabold uppercase text-[#9a2e00]">
                  Option 2 : Orange Money / MoMo
                </div>
                <p className="text-sm text-[#09152b]">
                  Envoyez{" "}
                  <strong>{formatFcfa(subscription.planPriceFcfa)}</strong> au
                  numéro :
                </p>
                <div className="text-xl font-extrabold font-mono text-[#09152b]">
                  {platformSettings?.founderOmNumber || "07 47 18 23 83"}
                </div>
                <div className="text-xs font-mono text-[#43506b] font-semibold">
                  Référence à indiquer : {agency.slug}
                </div>
              </div>

              <div className="bg-[#f6f3ec] rounded-[14px] border border-[#09152b]/14 p-5 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="text-xs font-mono font-extrabold uppercase text-emerald-800">
                    Option 3 : Validation directe
                  </div>
                  <p className="text-sm text-[#43506b]">
                    Envoyez la capture sur WhatsApp pour activer 30 jours
                    supplémentaires en moins de 5 minutes.
                  </p>
                </div>
                <div className="space-y-2.5">
                  <a
                    href={renewalWaHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-[8px] bg-[#10b981] hover:bg-[#34d399] text-[#042318] font-extrabold text-sm flex items-center justify-center gap-2 no-underline"
                  >
                    <MessageSquare className="w-4 h-4" aria-hidden="true" />
                    <span>Envoyer la preuve sur WhatsApp</span>
                  </a>
                  <button
                    type="button"
                    onClick={loadOverview}
                    className="w-full py-2 px-4 rounded-[8px] bg-white hover:bg-[#ebe5d8] text-[#09152b] font-bold text-xs border border-[#09152b]/22 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Vérifier l&apos;activation</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <>
            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-[#09152b]/12 pb-3">
              {(
                [
                  ["batches", "1. Lots & Conteneurs (1 clic)"],
                  ["parcels", "2. Colis & Alertes WhatsApp"],
                  ["import", "3. Import Excel rapide"],
                  ["settings", "4. Tarifs & Liens Wave"],
                ] as Array<[TabId, string]>
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`px-4 py-2 rounded-[8px] text-sm font-bold transition-colors cursor-pointer border ${
                    activeTab === id
                      ? "bg-[#ff5c1b] text-[#09152b] border-[#09152b] shadow-[0_2px_0_#09152b]"
                      : "bg-white text-[#09152b] border-[#09152b]/16 hover:bg-[#dce7fa]/50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* TAB 1: BATCHES */}
            {activeTab === "batches" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-4">
                  {batches.length === 0 && (
                    <div className="bg-white rounded-[14px] border border-[#09152b]/14 p-6 text-center space-y-2 shadow-[var(--sc-e1)]">
                      <div className="font-extrabold text-[#09152b]">
                        Aucun lot enregistré pour le moment
                      </div>
                      <p className="text-sm text-[#43506b]">
                        Créez votre premier vol cargo ou conteneur maritime avec
                        le formulaire à droite pour commencer à ajouter vos
                        colis.
                      </p>
                    </div>
                  )}

                  {batches.map((batch) => {
                    const batchParcels = parcels.filter(
                      (p) => p.batchId === batch.id
                    );
                    const unpaidTotal = batchParcels
                      .filter((p) => p.paymentStatus === "IMPAYE")
                      .reduce((s, p) => s + p.amountFcfa, 0);
                    const meta = PARCEL_STATUS_META[batch.status];

                    return (
                      <div
                        key={batch.id}
                        className="bg-white rounded-[14px] border border-[#09152b]/14 p-5 space-y-4 shadow-[var(--sc-e1)]"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="font-mono font-extrabold text-lg text-[#0a2e6e]">
                                {batch.code}
                              </span>
                              <span className="inline-flex items-center gap-1 text-xs font-mono font-bold uppercase px-2.5 py-0.5 rounded-[6px] bg-[#f6f3ec] border border-[#09152b]/15 text-[#09152b]">
                                {batch.mode === "maritime" ? (
                                  <Ship
                                    className="w-3.5 h-3.5 text-[#ff5c1b]"
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <Plane
                                    className="w-3.5 h-3.5 text-[#0a2e6e]"
                                    aria-hidden="true"
                                  />
                                )}
                                <span>
                                  {batch.mode === "maritime"
                                    ? "Maritime"
                                    : "Aérien"}
                                </span>
                              </span>
                              <span
                                className={`text-xs font-bold px-2.5 py-0.5 rounded-[6px] border ${meta.badgeClass}`}
                              >
                                {meta.shortLabel}
                              </span>
                            </div>
                            <div className="text-sm text-[#43506b] mt-1">
                              {batch.origin} vers{" "}
                              <strong className="text-[#09152b]">
                                {batch.destination}
                              </strong>
                            </div>
                          </div>
                          <div className="text-left sm:text-right">
                            <div className="text-sm font-extrabold text-[#09152b]">
                              {batchParcels.length} colis dans ce lot
                            </div>
                            <div className="text-xs text-rose-700 font-bold font-mono">
                              Reste à encaisser : {formatFcfa(unpaidTotal)}
                            </div>
                          </div>
                        </div>

                        {batch.notes && (
                          <p className="text-xs text-[#43506b] bg-[#f6f3ec] px-3 py-2 rounded-[8px] border border-[#09152b]/10">
                            {batch.notes}
                          </p>
                        )}

                        <div className="pt-2 border-t border-[#09152b]/10 space-y-2.5">
                          <div className="text-xs font-mono font-bold text-[#43506b] uppercase">
                            Mise à jour de masse (met à jour tous les colis du
                            lot) :
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(
                              [
                                "EN_TRANSIT",
                                "ARRIVEE_ABIDJAN",
                                "PRET_RETRAIT",
                                "LIVRE",
                              ] as ParcelStatus[]
                            ).map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleBulkStatus(batch.id, st)}
                                className={`px-3 py-1.5 rounded-[8px] text-xs font-bold border transition-colors cursor-pointer ${
                                  batch.status === st
                                    ? "bg-[#0a2e6e] text-white border-[#0a2e6e]"
                                    : "bg-[#f6f3ec] hover:border-[#0a2e6e] text-[#09152b] border-[#09152b]/18"
                                }`}
                              >
                                Passer à : {PARCEL_STATUS_META[st].shortLabel}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                setFilterBatch(batch.id);
                                setActiveTab("parcels");
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-xs font-extrabold bg-[#10b981] hover:bg-[#34d399] text-[#042318] cursor-pointer ml-auto"
                            >
                              <span>
                                Notifier les {batchParcels.length} clients
                              </span>
                              <ArrowUpRight
                                className="w-3.5 h-3.5"
                                aria-hidden="true"
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* New Batch Form */}
                <form
                  onSubmit={handleCreateBatch}
                  className="bg-white rounded-[14px] border border-[#09152b]/14 p-5 space-y-3.5 shadow-[var(--sc-e1)]"
                >
                  <h3 className="font-extrabold text-[#09152b] text-lg flex items-center gap-2">
                    <Plus className="w-4 h-4 text-[#ff5c1b]" aria-hidden="true" />
                    <span>Nouveau lot / conteneur</span>
                  </h3>
                  <div>
                    <label className="block text-xs font-mono font-bold text-[#43506b] mb-1">
                      Code du lot / conteneur
                    </label>
                    <input
                      type="text"
                      value={batchCode}
                      onChange={(e) => setBatchCode(e.target.value)}
                      className="w-full h-10 px-3 rounded-[8px] border border-[#09152b]/22 bg-[#f6f3ec] text-[#09152b] text-sm font-mono font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-bold text-[#43506b] mb-1">
                      Mode de transport
                    </label>
                    <select
                      value={batchMode}
                      onChange={(e) =>
                        setBatchMode(e.target.value as TransportMode)
                      }
                      className="w-full h-10 px-3 rounded-[8px] border border-[#09152b]/22 bg-[#f6f3ec] text-[#09152b] text-sm font-semibold"
                    >
                      <option value="aerien">Aérien (Facturation au kg)</option>
                      <option value="maritime">
                        Maritime (Conteneur / CBM)
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-bold text-[#43506b] mb-1">
                      Origine
                    </label>
                    <input
                      type="text"
                      value={batchOrigin}
                      onChange={(e) => setBatchOrigin(e.target.value)}
                      className="w-full h-10 px-3 rounded-[8px] border border-[#09152b]/22 bg-[#f6f3ec] text-[#09152b] text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-bold text-[#43506b] mb-1">
                      Entrepôt de destination
                    </label>
                    <input
                      type="text"
                      value={batchDest}
                      onChange={(e) => setBatchDest(e.target.value)}
                      className="w-full h-10 px-3 rounded-[8px] border border-[#09152b]/22 bg-[#f6f3ec] text-[#09152b] text-sm"
                      required
                    />
                  </div>
                  <button type="submit" className="tc-btn-primary w-full">
                    Créer le lot
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: PARCELS & WHATSAPP */}
            {activeTab === "parcels" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-white rounded-[14px] border border-[#09152b]/14 p-4 flex flex-col sm:flex-row gap-3 shadow-[var(--sc-e1)]">
                    <input
                      type="text"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      placeholder="Rechercher par code (TC-...), nom client ou téléphone..."
                      className="flex-1 h-10 px-3 rounded-[8px] border border-[#09152b]/22 bg-[#f6f3ec] text-[#09152b] text-sm"
                    />
                    <select
                      value={filterBatch}
                      onChange={(e) => setFilterBatch(e.target.value)}
                      className="h-10 px-3 rounded-[8px] border border-[#09152b]/22 bg-[#f6f3ec] text-[#09152b] text-sm font-semibold"
                    >
                      <option value="ALL">
                        Tous les lots ({parcels.length})
                      </option>
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.code}
                        </option>
                      ))}
                    </select>
                  </div>

                  {filteredParcels.length === 0 && (
                    <div className="bg-white rounded-[14px] border border-[#09152b]/14 p-6 text-center text-sm text-[#43506b]">
                      {batches.length === 0
                        ? "Créez d'abord un lot dans l'onglet 1 pour pouvoir y rattacher vos colis."
                        : "Aucun colis enregistré dans cette sélection."}
                    </div>
                  )}

                  <div className="space-y-3">
                    {filteredParcels.map((parcel) => {
                      const stMeta = PARCEL_STATUS_META[parcel.status];
                      const payMeta = PAYMENT_STATUS_META[parcel.paymentStatus];

                      return (
                        <div
                          key={parcel.id}
                          className="bg-white rounded-[14px] border border-[#09152b]/14 p-4 sm:p-5 space-y-3 shadow-[var(--sc-e1)]"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Link
                                  href={`/a/${agency.slug}?q=${encodeURIComponent(
                                    parcel.trackingCode
                                  )}`}
                                  target="_blank"
                                  className="inline-flex items-center gap-1 font-mono font-extrabold text-base text-[#0a2e6e] hover:text-[#ff5c1b] hover:underline"
                                >
                                  <span>{parcel.trackingCode}</span>
                                  <ArrowUpRight
                                    className="w-3.5 h-3.5"
                                    aria-hidden="true"
                                  />
                                </Link>
                                <span
                                  className={`text-xs font-bold px-2.5 py-0.5 rounded-[6px] border ${stMeta.badgeClass}`}
                                >
                                  {stMeta.shortLabel}
                                </span>
                                <span
                                  className={`text-xs font-bold px-2.5 py-0.5 rounded-[6px] border ${payMeta.badgeClass}`}
                                >
                                  {payMeta.label}
                                </span>
                              </div>
                              <div className="text-sm font-bold text-[#09152b] mt-1.5">
                                {parcel.clientName} ·{" "}
                                <span className="font-mono font-normal text-[#43506b]">
                                  {parcel.clientPhone}
                                </span>
                              </div>
                              <div className="text-xs text-[#43506b]">
                                {parcel.description} ({parcel.weightKg} kg
                                {parcel.volumeCbm > 0
                                  ? ` · ${parcel.volumeCbm} CBM`
                                  : ""}
                                )
                              </div>
                            </div>

                            <div className="text-left sm:text-right">
                              <div className="text-lg font-extrabold text-[#09152b] font-mono tabular-nums">
                                {formatFcfa(parcel.amountFcfa)}
                              </div>
                              {parcel.notifiedWhatsappAt && (
                                <div className="inline-flex items-center gap-1 text-[11px] text-emerald-800 font-bold">
                                  <Check className="w-3 h-3" aria-hidden="true" />
                                  <span>Notifié WhatsApp</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#09152b]/10">
                            <button
                              type="button"
                              onClick={() => openWhatsappForParcel(parcel)}
                              className="px-3.5 py-1.5 rounded-[8px] bg-[#10b981] hover:bg-[#34d399] text-[#042318] font-extrabold text-xs cursor-pointer"
                            >
                              Envoyer alerte WhatsApp
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleCopyTrackLink(parcel.trackingCode)
                              }
                              className="px-3 py-1.5 rounded-[8px] border border-[#09152b]/20 bg-[#f6f3ec] hover:bg-[#ebe5d8] text-[#09152b] font-semibold text-xs cursor-pointer"
                            >
                              Copier lien
                            </button>

                            {parcel.paymentStatus === "IMPAYE" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateParcel(parcel.id, {
                                      paymentStatus: "PAYE_WAVE",
                                    })
                                  }
                                  className="px-3 py-1.5 rounded-[8px] bg-[#22d3ee] hover:bg-[#38bdf8] text-[#09152b] font-extrabold text-xs cursor-pointer"
                                >
                                  Encaisser Wave
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateParcel(parcel.id, {
                                      paymentStatus: "PAYE_OM",
                                    })
                                  }
                                  className="px-3 py-1.5 rounded-[8px] bg-[#ff5c1b] hover:bg-[#ff7136] text-[#09152b] font-extrabold text-xs cursor-pointer"
                                >
                                  Encaisser OM
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateParcel(parcel.id, {
                                      paymentStatus: "PAYE_CASH",
                                    })
                                  }
                                  className="px-3 py-1.5 rounded-[8px] border border-[#09152b]/20 bg-[#f6f3ec] hover:bg-[#ebe5d8] text-[#09152b] font-semibold text-xs cursor-pointer"
                                >
                                  Cash
                                </button>
                              </>
                            )}

                            <select
                              value={parcel.status}
                              onChange={(e) =>
                                handleUpdateParcel(parcel.id, {
                                  status: e.target.value as ParcelStatus,
                                })
                              }
                              className="ml-auto h-8 px-2 rounded-[6px] border border-[#09152b]/22 bg-[#f6f3ec] text-[#09152b] text-xs font-semibold"
                            >
                              {Object.entries(PARCEL_STATUS_META).map(
                                ([k, v]) => (
                                  <option key={k} value={k}>
                                    {v.shortLabel}
                                  </option>
                                )
                              )}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* New Parcel Form */}
                <form
                  onSubmit={handleCreateParcel}
                  className="bg-white rounded-[14px] border border-[#09152b]/14 p-5 space-y-3.5 shadow-[var(--sc-e1)]"
                >
                  <h3 className="font-extrabold text-[#09152b] text-lg flex items-center gap-2">
                    <Plus className="w-4 h-4 text-[#ff5c1b]" aria-hidden="true" />
                    <span>Enregistrer un colis</span>
                  </h3>
                  <div>
                    <label className="block text-xs font-mono font-bold text-[#43506b] mb-1">
                      Lot / Conteneur
                    </label>
                    <select
                      value={parcelBatchId}
                      onChange={(e) => setParcelBatchId(e.target.value)}
                      disabled={batches.length === 0}
                      className="w-full h-10 px-3 rounded-[8px] border border-[#09152b]/22 bg-[#f6f3ec] text-[#09152b] text-sm font-semibold disabled:opacity-50"
                    >
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.code} ({b.mode})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-bold text-[#43506b] mb-1">
                      Nom complet du client
                    </label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="ex: Mariam Coulibaly"
                      className="w-full h-10 px-3 rounded-[8px] border border-[#09152b]/22 bg-[#f6f3ec] text-[#09152b] text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-bold text-[#43506b] mb-1">
                      Téléphone WhatsApp (CI)
                    </label>
                    <input
                      type="text"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="+22507..."
                      className="w-full h-10 px-3 rounded-[8px] border border-[#09152b]/22 bg-[#f6f3ec] text-[#09152b] text-sm font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-bold text-[#43506b] mb-1">
                      Description du colis
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="ex: 2 cartons chaussures femme"
                      className="w-full h-10 px-3 rounded-[8px] border border-[#09152b]/22 bg-[#f6f3ec] text-[#09152b] text-sm"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-mono font-bold text-[#43506b] mb-1">
                        Poids (kg)
                      </label>
                      <input
                        type="number"
                        min={0.1}
                        max={50000}
                        step="0.1"
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        className="w-full h-10 px-3 rounded-[8px] border border-[#09152b]/22 bg-[#f6f3ec] text-[#09152b] text-sm font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono font-bold text-[#43506b] mb-1">
                        Volume (CBM)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        step="0.01"
                        value={volumeCbm}
                        onChange={(e) => setVolumeCbm(e.target.value)}
                        className="w-full h-10 px-3 rounded-[8px] border border-[#09152b]/22 bg-[#f6f3ec] text-[#09152b] text-sm font-mono"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={batches.length === 0}
                    className="tc-btn-primary w-full disabled:opacity-50"
                  >
                    Enregistrer et calculer le tarif FCFA
                  </button>
                </form>
              </div>
            )}

            {/* TAB 3: BULK EXCEL IMPORT */}
            {activeTab === "import" && (
              <div className="bg-white rounded-[14px] border border-[#09152b]/14 p-6 space-y-5 max-w-4xl shadow-[var(--sc-e1)]">
                <div>
                  <h3 className="text-lg font-extrabold text-[#09152b]">
                    Import express depuis Excel / WhatsApp
                  </h3>
                  <p className="text-sm text-[#43506b] mt-1">
                    Copiez directement vos colonnes depuis Excel (séparées par
                    tabulation ou point-virgule{" "}
                    <code className="bg-[#f6f3ec] px-1.5 py-0.5 rounded font-mono">
                      ;
                    </code>
                    ) au format :{" "}
                    <strong className="text-[#09152b]">
                      Nom ; Téléphone ; Description ; Poids(kg)
                    </strong>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-[#43506b] mb-1">
                    Lot de destination
                  </label>
                  <select
                    value={importBatchId}
                    onChange={(e) => setImportBatchId(e.target.value)}
                    disabled={batches.length === 0}
                    className="w-full sm:w-80 h-10 px-3 rounded-[8px] border border-[#09152b]/22 bg-[#f6f3ec] text-[#09152b] text-sm font-semibold disabled:opacity-50"
                  >
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} ({b.origin})
                      </option>
                    ))}
                  </select>
                </div>

                <textarea
                  rows={6}
                  value={excelText}
                  onChange={(e) => setExcelText(e.target.value)}
                  className="w-full p-3 rounded-[10px] border border-[#09152b]/22 font-mono text-xs sm:text-sm bg-[#f6f3ec] text-[#09152b]"
                />

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="text-sm text-[#09152b]">
                    <strong className="font-mono text-[#0a2e6e]">
                      {parsedImportRows.length}
                    </strong>{" "}
                    lignes valides détectées prêtes à recevoir un code TC.
                  </div>
                  <button
                    type="button"
                    onClick={handleBulkImport}
                    disabled={
                      parsedImportRows.length === 0 || batches.length === 0
                    }
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-[8px] bg-[#10b981] hover:bg-[#34d399] text-[#042318] font-extrabold text-sm cursor-pointer disabled:opacity-50"
                  >
                    <span>
                      Importer {parsedImportRows.length} colis maintenant
                    </span>
                    <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: AGENCY SETTINGS */}
            {activeTab === "settings" && (
              <form
                onSubmit={handleSaveSettings}
                className="bg-white rounded-[14px] border border-[#09152b]/14 p-6 space-y-4 max-w-3xl shadow-[var(--sc-e1)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-extrabold text-[#09152b]">
                    Configuration agence, tarifs et paiements Mobile Money
                  </h3>
                  <span className="text-xs font-mono font-bold text-[#0a2e6e] bg-[#dce7fa] px-2.5 py-1 rounded-[6px]">
                    Portail : /a/{agency.slug}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono font-bold text-[#43506b] mb-1">
                      Nom de l&apos;agence
                    </label>
                    <input
                      type="text"
                      value={settingsForm.name || ""}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          name: e.target.value,
                        })
                      }
                      className="w-full h-10 px-3 rounded-[8px] border border-[#09152b]/22 bg-[#f6f3ec] text-[#09152b] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-bold text-[#43506b] mb-1">
                      Commune (Abidjan)
                    </label>
                    <input
                      type="text"
                      value={settingsForm.commune || ""}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          commune: e.target.value,
                        })
                      }
                      className="w-full h-10 px-3 rounded-[8px] border border-[#09152b]/22 bg-[#f6f3ec] text-[#09152b] text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-mono font-bold text-[#43506b] mb-1">
                      Adresse complète de l&apos;entrepôt de retrait
                    </label>
                    <input
                      type="text"
                      value={settingsForm.address || ""}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          address: e.target.value,
                        })
                      }
                      className="w-full h-10 px-3 rounded-[8px] border border-[#09152b]/22 bg-[#f6f3ec] text-[#09152b] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-bold text-[#43506b] mb-1">
                      Numéro WhatsApp support
                    </label>
                    <input
                      type="text"
                      value={settingsForm.whatsappPhone || ""}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          whatsappPhone: e.target.value,
                        })
                      }
                      className="w-full h-10 px-3 rounded-[8px] border border-[#09152b]/22 bg-[#f6f3ec] text-[#09152b] text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-bold text-[#43506b] mb-1">
                      Numéro Orange Money / MTN MoMo
                    </label>
                    <input
                      type="text"
                      value={settingsForm.orangeMoneyNumber || ""}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          orangeMoneyNumber: e.target.value,
                        })
                      }
                      className="w-full h-10 px-3 rounded-[8px] border border-[#09152b]/22 bg-[#f6f3ec] text-[#09152b] text-sm font-mono"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-mono font-bold text-[#43506b] mb-1">
                      Lien marchand Wave Business
                    </label>
                    <input
                      type="url"
                      value={settingsForm.waveLink || ""}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          waveLink: e.target.value,
                        })
                      }
                      className="w-full h-10 px-3 rounded-[8px] border border-[#09152b]/22 bg-[#f6f3ec] text-[#09152b] text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-bold text-[#43506b] mb-1">
                      Tarif aérien (FCFA / kg)
                    </label>
                    <input
                      type="number"
                      min={100}
                      max={500000}
                      value={settingsForm.ratePerKgAirFcfa ?? 8500}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          ratePerKgAirFcfa: Number(e.target.value),
                        })
                      }
                      className="w-full h-10 px-3 rounded-[8px] border border-[#09152b]/22 bg-[#f6f3ec] text-[#09152b] text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-bold text-[#43506b] mb-1">
                      Tarif maritime (FCFA / CBM)
                    </label>
                    <input
                      type="number"
                      min={1000}
                      max={10000000}
                      value={settingsForm.ratePerCbmSeaFcfa ?? 320000}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          ratePerCbmSeaFcfa: Number(e.target.value),
                        })
                      }
                      className="w-full h-10 px-3 rounded-[8px] border border-[#09152b]/22 bg-[#f6f3ec] text-[#09152b] text-sm font-mono"
                    />
                  </div>
                </div>
                <button type="submit" className="tc-btn-primary">
                  Enregistrer la configuration
                </button>
              </form>
            )}
          </>
        )}
      </main>
    </div>
  );
}
