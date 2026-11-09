"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  Agency,
  Batch,
  Parcel,
  PARCEL_STATUS_META,
  ParcelStatus,
  PAYMENT_STATUS_META,
  PaymentStatus,
  TransportMode,
} from "@/lib/types";
import { buildWhatsappClientLink, formatFcfa } from "@/lib/format";

type TabId = "batches" | "parcels" | "import" | "settings";

export default function DashboardPage() {
  const router = useRouter();
  const [agency, setAgency] = useState<Agency | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("batches");
  const [toast, setToast] = useState<string>("");

  // Prospect Quick Demo Rebrander
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
      if (!res.ok) {
        return;
      }
      const data = await res.json();
      setAgency(data.agency);
      setBatches(data.batches || []);
      setParcels(data.parcels || []);
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
    notifyToast(`Portail rebrandé en direct pour "${demoName.trim()}" !`);
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
      `Lot mis à jour : ${data.updatedCount} colis passés à "${PARCEL_STATUS_META[status].shortLabel}" !`
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
    notifyToast(`Colis ${created.trackingCode} enregistré (${formatFcfa(created.amountFcfa)}).`);
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
    notifyToast(`${data.count} colis importés depuis Excel en 1 clic !`);
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
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/track/${trackingCode}`;
    try {
      await navigator.clipboard.writeText(url);
      notifyToast(`Lien copié : ${url}`);
    } catch {
      notifyToast(`Lien de suivi : /track/${trackingCode}`);
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

  if (loading || !agency) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">
        {loading
          ? "Chargement de l'espace agence..."
          : "Redirection vers la connexion sécurisée..."}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar agencyName={agency?.name} />

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-950 text-white px-4 py-3 rounded-xl shadow-xl border border-amber-500/40 text-sm font-semibold">
          ✓ {toast}
        </div>
      )}

      {/* Prospect Pitch Demo Bar */}
      <div className="bg-amber-500/15 border-b border-amber-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm">
          <div className="flex items-center gap-2 text-amber-950">
            <span className="font-bold">🎯 Mode Démo Terrain :</span>
            <span>
              Espace actif pour <strong>{agency?.name}</strong> ({agency?.commune})
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setDemoOpen((v) => !v)}
              className="px-3 py-1.5 rounded-lg bg-slate-950 text-white font-semibold text-xs hover:bg-slate-800 cursor-pointer"
            >
              {demoOpen
                ? "Fermer"
                : "Rebrander pour un Prospect (Pitch 3 min)"}
            </button>
            <button
              type="button"
              onClick={handleResetDemo}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 cursor-pointer"
            >
              Réinitialiser démo
            </button>
            <Link
              href="/track"
              target="_blank"
              className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-950 font-semibold text-xs hover:bg-amber-50"
            >
              Voir Portail Client ↗
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-semibold text-xs hover:bg-rose-100 cursor-pointer"
            >
              Déconnexion
            </button>
          </div>
        </div>

        {demoOpen && (
          <form
            onSubmit={handleApplyProspectDemo}
            className="max-w-7xl mx-auto px-4 sm:px-6 pb-4 pt-2 flex flex-col sm:flex-row gap-3 items-end"
          >
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nom du prospect (ex: A-Cargo Logistique, World Transit)
              </label>
              <input
                type="text"
                value={demoName}
                onChange={(e) => setDemoName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm"
                required
              />
            </div>
            <div className="w-full sm:w-56">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Commune Abidjan
              </label>
              <input
                type="text"
                value={demoCommune}
                onChange={(e) => setDemoCommune(e.target.value)}
                placeholder="Treichville / Adjamé / Cocody"
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm"
              />
            </div>
            <button
              type="submit"
              className="h-10 px-5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm cursor-pointer whitespace-nowrap"
            >
              Appliquer le Branding
            </button>
          </form>
        )}
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
            <div className="text-xs font-semibold text-slate-500 uppercase">
              Total Colis Actifs
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-950 mt-1">
              {stats.totalParcels}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Sur {batches.length} lots / conteneurs
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
            <div className="text-xs font-semibold text-emerald-700 uppercase">
              Prêts au retrait Abidjan
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">
              {stats.readyCount}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              À notifier sur WhatsApp
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
            <div className="text-xs font-semibold text-rose-700 uppercase">
              Reste à encaisser
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-700 mt-1">
              {formatFcfa(stats.unpaidFcfa)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Frais de fret en attente
            </div>
          </div>

          <div className="bg-slate-950 text-white rounded-2xl border border-slate-800 p-4 sm:p-5">
            <div className="text-xs font-semibold text-cyan-400 uppercase">
              Déjà encaissé
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">
              {formatFcfa(stats.collectedFcfa)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Wave, Orange Money & Cash
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {(
            [
              ["batches", "1. Lots & Conteneurs (1-Clic)"],
              ["parcels", "2. Colis & Alertes WhatsApp"],
              ["import", "3. Import Excel Rapide"],
              ["settings", "4. Tarifs & Liens Wave"],
            ] as Array<[TabId, string]>
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
                activeTab === id
                  ? "bg-slate-950 text-white"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* TAB 1: BATCHES */}
        {activeTab === "batches" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Batch List */}
            <div className="lg:col-span-2 space-y-4">
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
                    className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-mono font-black text-lg text-slate-950">
                            {batch.code}
                          </span>
                          <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {batch.mode === "maritime"
                              ? "🚢 Maritime"
                              : "✈️ Aérien"}
                          </span>
                          <span
                            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${meta.badgeClass}`}
                          >
                            {meta.shortLabel}
                          </span>
                        </div>
                        <div className="text-sm text-slate-600 mt-1">
                          {batch.origin} → <strong>{batch.destination}</strong>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <div className="text-sm font-bold text-slate-900">
                          {batchParcels.length} colis dans ce lot
                        </div>
                        <div className="text-xs text-rose-700 font-semibold">
                          Reste à encaisser : {formatFcfa(unpaidTotal)}
                        </div>
                      </div>
                    </div>

                    {batch.notes && (
                      <p className="text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                        {batch.notes}
                      </p>
                    )}

                    {/* 1-Click Bulk Update Buttons */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="text-xs font-bold text-slate-500 uppercase">
                        Mise à jour de masse (met à jour TOUS les colis du lot) :
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
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                              batch.status === st
                                ? "bg-slate-950 text-white border-slate-950"
                                : "bg-white hover:bg-amber-50 text-slate-700 border-slate-300"
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
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer ml-auto"
                        >
                          Notifier les {batchParcels.length} clients →
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
              className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs"
            >
              <h3 className="font-extrabold text-slate-950 text-lg">
                + Nouveau Lot / Conteneur
              </h3>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Code du lot / conteneur
                </label>
                <input
                  type="text"
                  value={batchCode}
                  onChange={(e) => setBatchCode(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mode de transport
                </label>
                <select
                  value={batchMode}
                  onChange={(e) =>
                    setBatchMode(e.target.value as TransportMode)
                  }
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm bg-white"
                >
                  <option value="aerien">✈️ Aérien (Facturation au kg)</option>
                  <option value="maritime">
                    🚢 Maritime (Conteneur / CBM)
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Origine
                </label>
                <input
                  type="text"
                  value={batchOrigin}
                  onChange={(e) => setBatchOrigin(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Entrepôt de destination
                </label>
                <input
                  type="text"
                  value={batchDest}
                  onChange={(e) => setBatchDest(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm cursor-pointer"
              >
                Créer le lot
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: PARCELS & WHATSAPP */}
        {activeTab === "parcels" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-4">
              {/* Filters */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Rechercher par code (TC-...), nom client ou téléphone..."
                  className="flex-1 h-10 px-3 rounded-lg border border-slate-300 text-sm"
                />
                <select
                  value={filterBatch}
                  onChange={(e) => setFilterBatch(e.target.value)}
                  className="h-10 px-3 rounded-lg border border-slate-300 text-sm bg-white"
                >
                  <option value="ALL">Tous les lots ({parcels.length})</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code}
                    </option>
                  ))}
                </select>
              </div>

              {/* Parcels List */}
              <div className="space-y-3">
                {filteredParcels.map((parcel) => {
                  const stMeta = PARCEL_STATUS_META[parcel.status];
                  const payMeta = PAYMENT_STATUS_META[parcel.paymentStatus];

                  return (
                    <div
                      key={parcel.id}
                      className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/track/${parcel.trackingCode}`}
                              target="_blank"
                              className="font-mono font-black text-base text-amber-700 hover:underline"
                            >
                              {parcel.trackingCode} ↗
                            </Link>
                            <span
                              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${stMeta.badgeClass}`}
                            >
                              {stMeta.shortLabel}
                            </span>
                            <span
                              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${payMeta.badgeClass}`}
                            >
                              {payMeta.label}
                            </span>
                          </div>
                          <div className="text-sm font-bold text-slate-900 mt-1">
                            {parcel.clientName} •{" "}
                            <span className="font-mono font-normal text-slate-600">
                              {parcel.clientPhone}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600">
                            {parcel.description} ({parcel.weightKg} kg
                            {parcel.volumeCbm > 0
                              ? ` • ${parcel.volumeCbm} CBM`
                              : ""}
                            )
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <div className="text-lg font-black text-slate-950">
                            {formatFcfa(parcel.amountFcfa)}
                          </div>
                          {parcel.notifiedWhatsappAt && (
                            <div className="text-[11px] text-emerald-700 font-medium">
                              ✓ Notifié WhatsApp
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => openWhatsappForParcel(parcel)}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                        >
                          Envoyer Alerte WhatsApp
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyTrackLink(parcel.trackingCode)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs cursor-pointer"
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
                              className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs cursor-pointer"
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
                              className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs cursor-pointer"
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
                              className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs cursor-pointer"
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
                          className="ml-auto h-8 px-2 rounded-lg border border-slate-300 text-xs bg-white"
                        >
                          {Object.entries(PARCEL_STATUS_META).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v.shortLabel}
                            </option>
                          ))}
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
              className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3.5 shadow-xs"
            >
              <h3 className="font-extrabold text-slate-950 text-lg">
                + Enregistrer un Colis
              </h3>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lot / Conteneur
                </label>
                <select
                  value={parcelBatchId}
                  onChange={(e) => setParcelBatchId(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm bg-white"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} ({b.mode})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nom complet du client
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="ex: Mariam Coulibaly"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Téléphone WhatsApp (CI)
                </label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+22507..."
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description du colis
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ex: 2 cartons chaussures femme"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Poids (kg)
                  </label>
                  <input
                    type="number"
                    min={0.1}
                    max={50000}
                    step="0.1"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Volume (CBM)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    step="0.01"
                    value={volumeCbm}
                    onChange={(e) => setVolumeCbm(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm cursor-pointer"
              >
                Enregistrer & Calculer le Tarif FCFA
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: BULK EXCEL IMPORT */}
        {activeTab === "import" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 max-w-4xl">
            <div>
              <h3 className="text-lg font-extrabold text-slate-950">
                Import Express depuis Excel / WhatsApp
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Copiez directement vos colonnes depuis Excel (séparées par
                tabulation ou point-virgule <code className="bg-slate-100 px-1 rounded">;</code>) au format :{" "}
                <strong>Nom ; Téléphone ; Description ; Poids(kg)</strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Lot de destination
              </label>
              <select
                value={importBatchId}
                onChange={(e) => setImportBatchId(e.target.value)}
                className="w-full sm:w-80 h-10 px-3 rounded-lg border border-slate-300 text-sm bg-white"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} — {b.origin}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              rows={6}
              value={excelText}
              onChange={(e) => setExcelText(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 font-mono text-xs sm:text-sm bg-slate-50"
            />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm text-slate-700">
                <strong>{parsedImportRows.length}</strong> lignes valides détectées
                prêtes à être converties en codes de suivi.
              </div>
              <button
                type="button"
                onClick={handleBulkImport}
                disabled={parsedImportRows.length === 0}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm cursor-pointer disabled:opacity-50"
              >
                Importer {parsedImportRows.length} colis maintenant →
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: AGENCY SETTINGS */}
        {activeTab === "settings" && (
          <form
            onSubmit={handleSaveSettings}
            className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 max-w-3xl"
          >
            <h3 className="text-lg font-extrabold text-slate-950">
              Configuration Agence, Tarifs & Paiements Mobile Money
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nom de l&apos;agence
                </label>
                <input
                  type="text"
                  value={settingsForm.name || ""}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, name: e.target.value })
                  }
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
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
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
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
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Numéro WhatsApp Support
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
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
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
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lien Marchand Wave Business
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
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tarif Aérien (FCFA / kg)
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
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tarif Maritime (FCFA / CBM)
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
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-sm cursor-pointer"
            >
              Enregistrer la configuration
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
