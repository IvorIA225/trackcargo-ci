"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Clock,
  Copy,
  Layers,
  LogOut,
  Package,
  Plane,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Ship,
  SlidersHorizontal,
  Sparkles,
  Upload,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
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
      <div className="min-h-screen bg-[#f7f6f2] flex items-center justify-center text-[#525e70] font-semibold">
        Chargement de l&apos;espace agence...
      </div>
    );
  }

  if (suspendedBlocked) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f7f6f2] text-[#0d131d]">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white rounded-[20px] border border-[#0d131d]/12 shadow-[0_22px_50px_-18px_rgba(13,21,34,0.16)] p-7 space-y-5 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold text-[#0d131d]">
              Compte agence suspendu
            </h1>
            <p className="text-sm text-[#525e70] leading-relaxed">
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
      <div className="min-h-screen bg-[#f7f6f2] flex items-center justify-center text-[#525e70] font-semibold">
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
      ? `Essai gratuit · ${subscription.daysRemaining} j restants`
      : subscription?.effectiveStatus === "ACTIVE"
      ? `${subscription.planLabel} actif · ${subscription.daysRemaining} j`
      : "Abonnement expiré (Wave / OM requis)";

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f6f2] text-[#0d131d]">
      <Navbar agencyName={agency.name} />

      {toast && (
        <div
          role="status"
          className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:bottom-5 sm:right-5 z-50 bg-[#0d1522] text-white px-4 py-3 rounded-full shadow-2xl border border-[#c9410e] text-xs sm:text-sm font-semibold flex items-center justify-center sm:justify-start gap-2"
        >
          <Check className="w-4 h-4 text-[#f0642d] shrink-0" aria-hidden="true" />
          <span className="truncate">{toast}</span>
        </div>
      )}

      {/* Welcoming Studio Maritime Agency Header */}
      <header className="relative overflow-hidden bg-[#0d1522] text-white border-b border-white/10">
        <div
          className="pointer-events-none absolute -top-28 -right-24 h-72 w-72 rounded-full bg-[#c9410e]/18 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative max-w-[82rem] mx-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-[11px] font-mono text-[#e2e8f0]">
                <Sparkles className="w-3 h-3 text-[#f0642d]" aria-hidden="true" />
                <span>Espace comptoir · {agency.commune}</span>
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${
                  isPastDue
                    ? "bg-amber-300 text-[#0d131d] border-amber-200"
                    : "bg-emerald-500/20 text-emerald-200 border-emerald-400/30"
                }`}
              >
                {subBadgeText}
              </span>
            </div>
            <div className="flex flex-wrap items-baseline gap-2.5">
              <h1 className="font-[family-name:var(--font-archivo)] text-xl sm:text-2xl font-bold tracking-tight text-white">
                {agency.name}
              </h1>
              <span className="text-xs font-mono text-[#9eb0c9]">
                /a/{agency.slug}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyAgencyPortal}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full bg-white text-[#0d131d] hover:bg-[#f7f6f2] font-semibold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-[#c9410e] shrink-0" aria-hidden="true" />
              <span className="truncate">Copier lien client</span>
            </button>

            <Link
              href={`/a/${agency.slug}`}
              target="_blank"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full bg-[#c9410e] hover:bg-[#b5370a] text-white font-semibold text-xs no-underline shadow-xs transition-colors"
            >
              <span>Voir portail client</span>
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            </Link>

            {agency.isDemo && !isPastDue && (
              <>
                <button
                  type="button"
                  onClick={() => setDemoOpen((v) => !v)}
                  className="inline-flex items-center justify-center px-3.5 py-2 rounded-full bg-white/12 hover:bg-white/20 text-white border border-white/18 font-semibold text-xs cursor-pointer transition-colors"
                >
                  {demoOpen ? "Fermer" : "Rebrander démo"}
                </button>
                <button
                  type="button"
                  onClick={handleResetDemo}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full bg-white/8 hover:bg-white/15 border border-white/15 text-[#e2e8f0] font-semibold text-xs cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Réinitialiser démo</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white font-semibold text-xs cursor-pointer transition-colors ${
                agency.isDemo && !isPastDue ? "col-span-2 sm:col-span-1" : "col-span-2 sm:col-span-1"
              }`}
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>

        {demoOpen && agency.isDemo && !isPastDue && (
          <form
            onSubmit={handleApplyProspectDemo}
            className="relative max-w-[82rem] mx-auto px-4 sm:px-8 pb-5 pt-3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end border-t border-white/12"
          >
            <div className="flex-1 w-full">
              <label className="block text-xs font-mono text-[#cbd5e1] mb-1">
                Nom du prospect (ex: A-Cargo Logistique, World Transit)
              </label>
              <input
                type="text"
                value={demoName}
                onChange={(e) => setDemoName(e.target.value)}
                className="w-full h-10 px-3.5 rounded-[12px] border border-white/20 bg-white text-[#0d131d] text-sm font-semibold"
                required
              />
            </div>
            <div className="w-full sm:w-56">
              <label className="block text-xs font-mono text-[#cbd5e1] mb-1">
                Commune Abidjan
              </label>
              <input
                type="text"
                value={demoCommune}
                onChange={(e) => setDemoCommune(e.target.value)}
                placeholder="Treichville / Adjamé / Cocody"
                className="w-full h-10 px-3.5 rounded-[12px] border border-white/20 bg-white text-[#0d131d] text-sm font-semibold"
              />
            </div>
            <button
              type="submit"
              className="h-10 px-5 rounded-full bg-[#c9410e] hover:bg-[#b5370a] text-white font-bold text-sm cursor-pointer whitespace-nowrap transition-colors"
            >
              Appliquer le branding
            </button>
          </form>
        )}
      </header>

      <main className="flex-1 max-w-[82rem] w-full mx-auto px-3.5 sm:px-8 py-5 sm:py-8 space-y-5 sm:space-y-7">
        {/* Warm Elevated KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-[18px] border border-[#0d131d]/8 p-4 sm:p-5 shadow-[0_8px_24px_-14px_rgba(13,21,34,0.1)] flex flex-col justify-between gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="text-[11px] font-mono font-bold text-[#525e70] uppercase leading-tight">
                Total colis actifs
              </div>
              <span className="h-8 w-8 rounded-[10px] bg-[#f7f6f2] border border-[#0d131d]/8 text-[#0d1522] flex items-center justify-center shrink-0">
                <Package className="w-4 h-4" aria-hidden="true" />
              </span>
            </div>
            <div>
              <div className="text-xl sm:text-3xl font-bold text-[#0d131d] font-mono tabular-nums">
                {stats.totalParcels}
              </div>
              <div className="text-[11px] sm:text-xs text-[#525e70] mt-0.5">
                Sur {batches.length} lots / conteneurs
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[18px] border border-emerald-600/15 p-4 sm:p-5 shadow-[0_8px_24px_-14px_rgba(4,120,87,0.12)] flex flex-col justify-between gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="text-[11px] font-mono font-bold text-emerald-800 uppercase leading-tight">
                Prêts au retrait
              </div>
              <span className="h-8 w-8 rounded-[10px] bg-emerald-50 border border-emerald-200/70 flex items-center justify-center shrink-0">
                <BrandLogo brand="whatsapp" size="sm" decorative />
              </span>
            </div>
            <div>
              <div className="text-xl sm:text-3xl font-bold text-emerald-700 font-mono tabular-nums">
                {stats.readyCount}
              </div>
              <div className="text-[11px] sm:text-xs text-[#525e70] mt-0.5">
                À notifier sur WhatsApp
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[18px] border border-[#c9410e]/16 p-4 sm:p-5 shadow-[0_8px_24px_-14px_rgba(201,65,14,0.1)] flex flex-col justify-between gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="text-[11px] font-mono font-bold text-[#9a2e00] uppercase leading-tight">
                Reste à encaisser
              </div>
              <span className="h-8 w-8 rounded-[10px] bg-[#fff4ee] border border-[#c9410e]/20 text-[#c9410e] flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" aria-hidden="true" />
              </span>
            </div>
            <div>
              <div className="text-[17px] sm:text-2xl font-bold text-[#c9410e] font-mono tabular-nums whitespace-nowrap">
                {formatFcfa(stats.unpaidFcfa)}
              </div>
              <div className="text-[11px] sm:text-xs text-[#525e70] mt-0.5">
                Frais de fret en attente
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-[#0d1522] to-[#17263c] text-white rounded-[18px] border border-white/10 p-4 sm:p-5 shadow-[0_14px_34px_-14px_rgba(13,21,34,0.34)] flex flex-col justify-between gap-2">
            <div
              className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[#c9410e]/25 blur-2xl"
              aria-hidden="true"
            />
            <div className="relative flex items-start justify-between gap-2">
              <div className="text-[11px] font-mono font-bold text-[#fde68a] uppercase leading-tight">
                Déjà encaissé
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <BrandLogo brand="wave" size="xs" decorative />
                <BrandLogo brand="orange-money" size="xs" decorative />
              </div>
            </div>
            <div className="relative">
              <div className="text-[17px] sm:text-2xl font-bold text-white font-mono tabular-nums whitespace-nowrap">
                {formatFcfa(stats.collectedFcfa)}
              </div>
              <div className="text-[11px] sm:text-xs text-[#cbd5e1] mt-0.5">
                Wave, Orange Money &amp; espèces
              </div>
            </div>
          </div>
        </div>

        {/* PAST_DUE Renewal Gate */}
        {isPastDue && subscription ? (
          <section
            aria-label="Renouvellement abonnement TrackCargo CI"
            className="bg-white rounded-[20px] border border-[#0d131d]/10 shadow-[0_22px_50px_-18px_rgba(13,21,34,0.16)] overflow-hidden"
          >
            <div className="bg-[#0d1522] text-white p-5 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase px-3 py-1 rounded-full bg-amber-300 text-[#0d131d]">
                  <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Abonnement à renouveler</span>
                </span>
                <h2 className="sc-display sc-display--md text-white font-bold">
                  Réactivez la gestion de vos lots en 2 minutes.
                </h2>
                <p className="text-sm text-[#cbd5e1] max-w-2xl">
                  Votre période d&apos;essai ou mensualité est arrivée à terme.
                  Bonne nouvelle : votre portail client public{" "}
                  <Link
                    href={`/a/${agency.slug}`}
                    className="font-mono font-bold text-[#f0642d] underline"
                  >
                    /a/{agency.slug}
                  </Link>{" "}
                  reste consultable afin de ne pas bloquer vos clients actuels.
                </p>
              </div>
              <div className="bg-white/10 rounded-[14px] border border-white/15 p-4 text-left sm:text-right shrink-0">
                <div className="text-xs font-mono uppercase text-[#fde68a] font-bold">
                  Forfait {subscription.planLabel}
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-white mt-1">
                  {formatFcfa(subscription.planPriceFcfa)}
                </div>
                <div className="text-xs text-[#cbd5e1]">pour 30 jours</div>
              </div>
            </div>

            <div className="p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="bg-[#f7f6f2] rounded-[16px] border border-[#0d131d]/10 p-5 space-y-3 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-[#0e7490]">
                    <BrandLogo brand="wave" size="sm" decorative />
                    <span>Option 1 : Wave Business</span>
                  </div>
                  <p className="text-sm text-[#525e70]">
                    Réglez directement {formatFcfa(subscription.planPriceFcfa)}{" "}
                    sur le lien Wave officiel TrackCargo CI.
                  </p>
                </div>
                {isSafeHttpsUrlClient(platformSettings?.founderWaveLink) && (
                  <a
                    href={platformSettings?.founderWaveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-full bg-[#0e7490] hover:bg-[#0c6078] text-white font-semibold text-sm flex items-center justify-center gap-2 no-underline transition-colors"
                  >
                    <BrandLogo brand="wave" size="xs" decorative />
                    <span>Payer par Wave maintenant</span>
                    <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                  </a>
                )}
              </div>

              <div className="bg-[#fff4ee] rounded-[16px] border border-[#c9410e]/25 p-5 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-[#9a2e00]">
                  <BrandLogo brand="orange-money" size="sm" decorative />
                  <span>Option 2 : Orange Money / MoMo</span>
                </div>
                <p className="text-sm text-[#0d131d]">
                  Envoyez{" "}
                  <strong>{formatFcfa(subscription.planPriceFcfa)}</strong> au
                  numéro :
                </p>
                <div className="text-xl font-bold font-mono text-[#0d131d]">
                  {platformSettings?.founderOmNumber || "07 47 18 23 83"}
                </div>
                <div className="text-xs font-mono text-[#525e70] font-semibold">
                  Référence à indiquer : {agency.slug}
                </div>
              </div>

              <div className="bg-[#f7f6f2] rounded-[16px] border border-[#0d131d]/10 p-5 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-emerald-800">
                    <BrandLogo brand="whatsapp" size="sm" decorative />
                    <span>Option 3 : Validation directe</span>
                  </div>
                  <p className="text-sm text-[#525e70]">
                    Envoyez la capture sur WhatsApp pour activer 30 jours
                    supplémentaires en moins de 5 minutes.
                  </p>
                </div>
                <div className="space-y-2.5">
                  <a
                    href={renewalWaHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-full bg-[#047857] hover:bg-[#065f46] text-white font-semibold text-sm flex items-center justify-center gap-2 no-underline transition-colors"
                  >
                    <BrandLogo brand="whatsapp" size="xs" decorative />
                    <span>Envoyer la preuve sur WhatsApp</span>
                  </a>
                  <button
                    type="button"
                    onClick={loadOverview}
                    className="w-full py-2 px-4 rounded-full bg-white hover:bg-[#eeebe3] text-[#0d131d] font-semibold text-xs border border-[#0d131d]/14 cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
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
            {/* Segmented Pill Navigation (Clean 2x2 Grid on Mobile, Single Bar on Desktop) */}
            <nav
              aria-label="Sections de l'espace agence"
              className="grid grid-cols-2 lg:inline-flex gap-1.5 sm:gap-2 p-1.5 rounded-[18px] lg:rounded-full bg-white border border-[#0d131d]/8 shadow-xs"
            >
              {(
                [
                  ["batches", "1. Lots & Conteneurs (1 clic)", Layers],
                  ["parcels", "2. Colis & Alertes WhatsApp", Package],
                  ["import", "3. Import Excel rapide", Upload],
                  ["settings", "4. Tarifs & Liens Wave", SlidersHorizontal],
                ] as const
              ).map(([id, label, Icon]) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id)}
                    aria-pressed={active}
                    className={`flex items-center justify-start lg:justify-center gap-2 px-3 sm:px-4 py-2.5 min-h-[44px] rounded-[12px] lg:rounded-full text-[12px] sm:text-[13px] font-semibold transition-all cursor-pointer ${
                      active
                        ? "bg-[#c9410e] text-white shadow-sm"
                        : "text-[#334155] hover:text-[#0d131d] hover:bg-[#f7f6f2]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span className="leading-snug text-left lg:whitespace-nowrap">{label}</span>
                  </button>
                );
              })}
            </nav>

            {/* TAB 1: BATCHES */}
            {activeTab === "batches" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 items-start">
                <div className="lg:col-span-2 space-y-4">
                  {batches.length === 0 && (
                    <div className="bg-white rounded-[18px] border border-[#0d131d]/8 p-7 text-center space-y-2 shadow-xs">
                      <div className="font-bold text-[#0d131d]">
                        Aucun lot enregistré pour le moment
                      </div>
                      <p className="text-sm text-[#525e70]">
                        Créez votre premier vol cargo ou conteneur maritime avec
                        le formulaire pour commencer à ajouter vos colis.
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
                        className="bg-white rounded-[18px] border border-[#0d131d]/8 p-4 sm:p-6 space-y-4 shadow-[0_8px_24px_-14px_rgba(13,21,34,0.08)]"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-base sm:text-lg text-[#0d1522]">
                                {batch.code}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold uppercase px-2.5 py-0.5 rounded-full bg-[#f7f6f2] border border-[#0d131d]/10 text-[#0d131d]">
                                {batch.mode === "maritime" ? (
                                  <Ship
                                    className="w-3.5 h-3.5 text-[#c9410e]"
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <Plane
                                    className="w-3.5 h-3.5 text-[#0d1522]"
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
                                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${meta.badgeClass}`}
                              >
                                {meta.shortLabel}
                              </span>
                            </div>
                            <div className="text-xs sm:text-sm text-[#525e70] mt-1">
                              {batch.origin} →{" "}
                              <strong className="text-[#0d131d]">
                                {batch.destination}
                              </strong>
                            </div>
                          </div>
                          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 bg-[#f7f6f2] sm:bg-transparent px-3 py-2 sm:p-0 rounded-[12px]">
                            <div className="text-xs sm:text-sm font-bold text-[#0d131d]">
                              {batchParcels.length} colis
                            </div>
                            <div className="text-xs text-[#c9410e] font-bold font-mono">
                              Reste : {formatFcfa(unpaidTotal)}
                            </div>
                          </div>
                        </div>

                        {batch.notes && (
                          <p className="text-xs text-[#525e70] bg-[#f7f6f2] px-3.5 py-2.5 rounded-[12px] border border-[#0d131d]/8">
                            {batch.notes}
                          </p>
                        )}

                        <div className="pt-3 border-t border-[#0d131d]/8 space-y-2.5">
                          <div className="text-[11px] font-mono font-bold text-[#525e70] uppercase">
                            Mise à jour de masse :
                          </div>
                          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
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
                                className={`px-3 py-2 rounded-full text-xs font-semibold border transition-colors cursor-pointer truncate ${
                                  batch.status === st
                                    ? "bg-[#0d1522] text-white border-[#0d1522]"
                                    : "bg-[#f7f6f2] hover:bg-[#eeebe3] text-[#0d131d] border-[#0d131d]/10"
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
                              className="col-span-2 sm:col-span-1 sm:ml-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-[#047857] hover:bg-[#065f46] text-white cursor-pointer transition-colors"
                            >
                              <BrandLogo brand="whatsapp" size="xs" decorative />
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
                  className="bg-white rounded-[18px] border border-[#0d131d]/8 p-5 sm:p-6 space-y-3.5 shadow-[0_12px_30px_-14px_rgba(13,21,34,0.1)]"
                >
                  <h3 className="font-bold text-[#0d131d] text-base sm:text-lg flex items-center gap-2">
                    <span className="h-7 w-7 rounded-full bg-[#fff4ee] text-[#c9410e] inline-flex items-center justify-center">
                      <Plus className="w-4 h-4" aria-hidden="true" />
                    </span>
                    <span>Nouveau lot / conteneur</span>
                  </h3>
                  <div>
                    <label className="block text-xs font-mono font-bold text-[#525e70] mb-1">
                      Code du lot / conteneur
                    </label>
                    <input
                      type="text"
                      value={batchCode}
                      onChange={(e) => setBatchCode(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-[12px] border border-[#0d131d]/14 bg-[#f7f6f2] text-[#0d131d] text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-[#c9410e]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-bold text-[#525e70] mb-1">
                      Mode de transport
                    </label>
                    <select
                      value={batchMode}
                      onChange={(e) =>
                        setBatchMode(e.target.value as TransportMode)
                      }
                      className="w-full h-10 px-3.5 rounded-[12px] border border-[#0d131d]/14 bg-[#f7f6f2] text-[#0d131d] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#c9410e]"
                    >
                      <option value="aerien">Aérien (Facturation au kg)</option>
                      <option value="maritime">
                        Maritime (Conteneur / CBM)
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-bold text-[#525e70] mb-1">
                      Origine
                    </label>
                    <input
                      type="text"
                      value={batchOrigin}
                      onChange={(e) => setBatchOrigin(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-[12px] border border-[#0d131d]/14 bg-[#f7f6f2] text-[#0d131d] text-sm focus:outline-none focus:ring-2 focus:ring-[#c9410e]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-bold text-[#525e70] mb-1">
                      Entrepôt de destination
                    </label>
                    <input
                      type="text"
                      value={batchDest}
                      onChange={(e) => setBatchDest(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-[12px] border border-[#0d131d]/14 bg-[#f7f6f2] text-[#0d131d] text-sm focus:outline-none focus:ring-2 focus:ring-[#c9410e]"
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 items-start">
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-white rounded-[18px] border border-[#0d131d]/8 p-3.5 sm:p-4 flex flex-col sm:flex-row gap-2.5 shadow-xs">
                    <input
                      type="text"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      placeholder="Rechercher par code (TC-...), client ou téléphone..."
                      className="w-full sm:flex-1 h-10 min-h-[40px] px-3.5 rounded-full border border-[#0d131d]/14 bg-[#f7f6f2] text-[#0d131d] text-sm focus:outline-none focus:ring-2 focus:ring-[#c9410e]"
                    />
                    <select
                      value={filterBatch}
                      onChange={(e) => setFilterBatch(e.target.value)}
                      className="w-full sm:w-auto h-10 min-h-[40px] px-3.5 rounded-full border border-[#0d131d]/14 bg-[#f7f6f2] text-[#0d131d] text-sm font-semibold"
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
                    <div className="bg-white rounded-[18px] border border-[#0d131d]/8 p-6 text-center text-sm text-[#525e70]">
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
                          className="bg-white rounded-[18px] border border-[#0d131d]/8 p-4 sm:p-5 space-y-3.5 shadow-[0_8px_24px_-14px_rgba(13,21,34,0.08)]"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2.5">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Link
                                  href={`/a/${agency.slug}?q=${encodeURIComponent(
                                    parcel.trackingCode
                                  )}`}
                                  target="_blank"
                                  className="inline-flex items-center gap-1 font-mono font-bold text-base text-[#0d1522] hover:text-[#c9410e] hover:underline"
                                >
                                  <span>{parcel.trackingCode}</span>
                                  <ArrowUpRight
                                    className="w-3.5 h-3.5"
                                    aria-hidden="true"
                                  />
                                </Link>
                                <span
                                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${stMeta.badgeClass}`}
                                >
                                  {stMeta.shortLabel}
                                </span>
                                <span
                                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${payMeta.badgeClass}`}
                                >
                                  {payMeta.label}
                                </span>
                              </div>
                              <div className="text-sm font-bold text-[#0d131d] mt-1.5">
                                {parcel.clientName} ·{" "}
                                <span className="font-mono font-normal text-[#525e70]">
                                  {parcel.clientPhone}
                                </span>
                              </div>
                              <div className="text-xs text-[#525e70] mt-0.5">
                                {parcel.description} ({parcel.weightKg} kg
                                {parcel.volumeCbm > 0
                                  ? ` · ${parcel.volumeCbm} CBM`
                                  : ""}
                                )
                              </div>
                            </div>

                            <div className="flex sm:flex-col items-center sm:items-end justify-between bg-[#f7f6f2] sm:bg-transparent px-3 py-2 sm:p-0 rounded-[12px]">
                              <div className="text-base sm:text-lg font-bold text-[#0d131d] font-mono tabular-nums">
                                {formatFcfa(parcel.amountFcfa)}
                              </div>
                              {parcel.notifiedWhatsappAt && (
                                <div className="inline-flex items-center gap-1 text-[11px] text-emerald-800 font-semibold">
                                  <Check className="w-3 h-3" aria-hidden="true" />
                                  <span>Notifié WhatsApp</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#0d131d]/8">
                            <button
                              type="button"
                              onClick={() => openWhatsappForParcel(parcel)}
                              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full bg-[#047857] hover:bg-[#065f46] text-white font-semibold text-xs cursor-pointer transition-colors w-full sm:w-auto"
                            >
                              <BrandLogo brand="whatsapp" size="xs" decorative />
                              <span>Envoyer alerte WhatsApp</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleCopyTrackLink(parcel.trackingCode)
                              }
                              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full border border-[#0d131d]/12 bg-[#f7f6f2] hover:bg-[#eeebe3] text-[#0d131d] font-semibold text-xs cursor-pointer transition-colors"
                            >
                              <Copy className="w-3 h-3 text-[#525e70]" aria-hidden="true" />
                              <span>Copier lien</span>
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
                                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full bg-[#0e7490] hover:bg-[#0c6078] text-white font-semibold text-xs cursor-pointer transition-colors"
                                >
                                  <BrandLogo brand="wave" size="xs" decorative />
                                  <span>Encaisser Wave</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateParcel(parcel.id, {
                                      paymentStatus: "PAYE_OM",
                                    })
                                  }
                                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full bg-[#c9410e] hover:bg-[#b5370a] text-white font-semibold text-xs cursor-pointer transition-colors"
                                >
                                  <BrandLogo brand="orange-money" size="xs" decorative />
                                  <span>Encaisser OM</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateParcel(parcel.id, {
                                      paymentStatus: "PAYE_CASH",
                                    })
                                  }
                                  className="px-3.5 py-2 rounded-full border border-[#0d131d]/12 bg-[#f7f6f2] hover:bg-[#eeebe3] text-[#0d131d] font-semibold text-xs cursor-pointer transition-colors"
                                >
                                  Cash
                                </button>
                              </>
                            )}

                            <select
                              value={parcel.status}
                              aria-label={`Statut du colis ${parcel.trackingCode}`}
                              onChange={(e) =>
                                handleUpdateParcel(parcel.id, {
                                  status: e.target.value as ParcelStatus,
                                })
                              }
                              className="w-full sm:w-auto sm:ml-auto h-9 px-3 rounded-full border border-[#0d131d]/14 bg-[#f7f6f2] text-[#0d131d] text-xs font-semibold"
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
                  className="bg-white rounded-[18px] border border-[#0d131d]/8 p-5 sm:p-6 space-y-3.5 shadow-[0_12px_30px_-14px_rgba(13,21,34,0.1)]"
                >
                  <h3 className="font-bold text-[#0d131d] text-base sm:text-lg flex items-center gap-2">
                    <span className="h-7 w-7 rounded-full bg-[#fff4ee] text-[#c9410e] inline-flex items-center justify-center">
                      <Plus className="w-4 h-4" aria-hidden="true" />
                    </span>
                    <span>Enregistrer un colis</span>
                  </h3>
                  <div>
                    <label className="block text-xs font-mono font-bold text-[#525e70] mb-1">
                      Lot / Conteneur
                    </label>
                    <select
                      value={parcelBatchId}
                      onChange={(e) => setParcelBatchId(e.target.value)}
                      disabled={batches.length === 0}
                      className="w-full h-10 px-3.5 rounded-[12px] border border-[#0d131d]/14 bg-[#f7f6f2] text-[#0d131d] text-sm font-semibold disabled:opacity-50"
                    >
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.code} ({b.mode})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-bold text-[#525e70] mb-1">
                      Nom complet du client
                    </label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="ex: Mariam Coulibaly"
                      className="w-full h-10 px-3.5 rounded-[12px] border border-[#0d131d]/14 bg-[#f7f6f2] text-[#0d131d] text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#525e70] mb-1">
                      <BrandLogo brand="whatsapp" size="xs" decorative />
                      <span>Téléphone WhatsApp (CI)</span>
                    </label>
                    <input
                      type="text"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="+22507..."
                      className="w-full h-10 px-3.5 rounded-[12px] border border-[#0d131d]/14 bg-[#f7f6f2] text-[#0d131d] text-sm font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-bold text-[#525e70] mb-1">
                      Description du colis
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="ex: 2 cartons chaussures femme"
                      className="w-full h-10 px-3.5 rounded-[12px] border border-[#0d131d]/14 bg-[#f7f6f2] text-[#0d131d] text-sm"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-mono font-bold text-[#525e70] mb-1">
                        Poids (kg)
                      </label>
                      <input
                        type="number"
                        min={0.1}
                        max={50000}
                        step="0.1"
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        className="w-full h-10 px-3.5 rounded-[12px] border border-[#0d131d]/14 bg-[#f7f6f2] text-[#0d131d] text-sm font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono font-bold text-[#525e70] mb-1">
                        Volume (CBM)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        step="0.01"
                        value={volumeCbm}
                        onChange={(e) => setVolumeCbm(e.target.value)}
                        className="w-full h-10 px-3.5 rounded-[12px] border border-[#0d131d]/14 bg-[#f7f6f2] text-[#0d131d] text-sm font-mono"
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
              <div className="bg-white rounded-[18px] border border-[#0d131d]/8 p-5 sm:p-7 space-y-5 max-w-4xl shadow-xs">
                <div>
                  <h3 className="text-lg font-bold text-[#0d131d]">
                    Import express depuis Excel / WhatsApp
                  </h3>
                  <p className="text-sm text-[#525e70] mt-1">
                    Copiez directement vos colonnes depuis Excel (séparées par
                    tabulation ou point-virgule{" "}
                    <code className="bg-[#f7f6f2] px-1.5 py-0.5 rounded font-mono">
                      ;
                    </code>
                    ) au format :{" "}
                    <strong className="text-[#0d131d]">
                      Nom ; Téléphone ; Description ; Poids(kg)
                    </strong>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-[#525e70] mb-1">
                    Lot de destination
                  </label>
                  <select
                    value={importBatchId}
                    onChange={(e) => setImportBatchId(e.target.value)}
                    disabled={batches.length === 0}
                    className="w-full sm:w-80 h-10 px-3.5 rounded-[12px] border border-[#0d131d]/14 bg-[#f7f6f2] text-[#0d131d] text-sm font-semibold disabled:opacity-50"
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
                  className="w-full p-3.5 rounded-[14px] border border-[#0d131d]/14 font-mono text-xs sm:text-sm bg-[#f7f6f2] text-[#0d131d]"
                />

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="text-sm text-[#0d131d]">
                    <strong className="font-mono text-[#c9410e]">
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
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#047857] hover:bg-[#065f46] text-white font-semibold text-sm cursor-pointer disabled:opacity-50 transition-colors w-full sm:w-auto"
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
                className="bg-white rounded-[18px] border border-[#0d131d]/8 p-5 sm:p-7 space-y-5 max-w-3xl shadow-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-[#0d131d]">
                    Configuration agence, tarifs et paiements Mobile Money
                  </h3>
                  <span className="text-xs font-mono font-semibold text-[#0d1522] bg-[#f7f6f2] border border-[#0d131d]/10 px-3 py-1 rounded-full">
                    Portail : /a/{agency.slug}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono font-bold text-[#525e70] mb-1">
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
                      className="w-full h-10 px-3.5 rounded-[12px] border border-[#0d131d]/14 bg-[#f7f6f2] text-[#0d131d] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-bold text-[#525e70] mb-1">
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
                      className="w-full h-10 px-3.5 rounded-[12px] border border-[#0d131d]/14 bg-[#f7f6f2] text-[#0d131d] text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-mono font-bold text-[#525e70] mb-1">
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
                      className="w-full h-10 px-3.5 rounded-[12px] border border-[#0d131d]/14 bg-[#f7f6f2] text-[#0d131d] text-sm"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#525e70] mb-1">
                      <BrandLogo brand="whatsapp" size="xs" decorative />
                      <span>Numéro WhatsApp support</span>
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
                      className="w-full h-10 px-3.5 rounded-[12px] border border-[#0d131d]/14 bg-[#f7f6f2] text-[#0d131d] text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#525e70] mb-1">
                      <BrandLogo brand="orange-money" size="xs" withWhiteSurface={false} decorative />
                      <span>Numéro Orange Money / MTN MoMo</span>
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
                      className="w-full h-10 px-3.5 rounded-[12px] border border-[#0d131d]/14 bg-[#f7f6f2] text-[#0d131d] text-sm font-mono"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#525e70] mb-1">
                      <BrandLogo brand="wave" size="xs" decorative />
                      <span>Lien marchand Wave Business</span>
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
                      className="w-full h-10 px-3.5 rounded-[12px] border border-[#0d131d]/14 bg-[#f7f6f2] text-[#0d131d] text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-bold text-[#525e70] mb-1">
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
                      className="w-full h-10 px-3.5 rounded-[12px] border border-[#0d131d]/14 bg-[#f7f6f2] text-[#0d131d] text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-bold text-[#525e70] mb-1">
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
                      className="w-full h-10 px-3.5 rounded-[12px] border border-[#0d131d]/14 bg-[#f7f6f2] text-[#0d131d] text-sm font-mono"
                    />
                  </div>
                </div>
                <button type="submit" className="tc-btn-primary w-full sm:w-auto">
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
