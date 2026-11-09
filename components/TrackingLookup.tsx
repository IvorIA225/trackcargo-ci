"use client";

import { useEffect, useRef, useState } from "react";
import {
  PARCEL_STATUS_META,
  ParcelStatus,
  PAYMENT_STATUS_META,
  PublicAgencyProfile,
  PublicTrackedParcel,
} from "@/lib/types";
import { formatDateFr, formatFcfa, normalizePhoneClient } from "@/lib/format";

const ORDERED_STEPS: ParcelStatus[] = [
  "RECUE_ORIGINE",
  "EN_TRANSIT",
  "ARRIVEE_ABIDJAN",
  "PRET_RETRAIT",
  "LIVRE",
];

function isSafeHttpsLink(raw: string): boolean {
  try {
    return new URL(raw).protocol === "https:";
  } catch {
    return false;
  }
}

export default function TrackingLookup({
  initialQuery = "",
  compact = false,
  onAgencyLoaded,
}: {
  initialQuery?: string;
  compact?: boolean;
  onAgencyLoaded?: (agency: PublicAgencyProfile) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(Boolean(initialQuery.trim()));
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [agency, setAgency] = useState<PublicAgencyProfile | null>(null);
  const [parcels, setParcels] = useState<PublicTrackedParcel[]>([]);
  const [showPayModal, setShowPayModal] = useState<PublicTrackedParcel | null>(
    null
  );

  const onAgencyLoadedRef = useRef(onAgencyLoaded);
  useEffect(() => {
    onAgencyLoadedRef.current = onAgencyLoaded;
  }, [onAgencyLoaded]);

  const runSearch = async (searchText: string) => {
    const clean = searchText.trim();
    if (!clean) return;
    setLoading(true);
    setSearched(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/track?q=${encodeURIComponent(clean)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      setAgency(data.agency || null);
      setParcels(data.parcels || []);
      if (!res.ok && data.error) {
        setErrorMsg(String(data.error));
      }
      if (data.agency) {
        onAgencyLoadedRef.current?.(data.agency);
      }
    } catch {
      setParcels([]);
      setErrorMsg("Erreur réseau lors de la recherche.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const clean = initialQuery.trim();

    if (clean) {
      fetch(`/api/track?q=${encodeURIComponent(clean)}`, {
        cache: "no-store",
      })
        .then(async (res) => ({ ok: res.ok, data: await res.json() }))
        .then(({ ok, data }) => {
          if (!active) return;
          setAgency(data.agency || null);
          setParcels(data.parcels || []);
          setSearched(true);
          if (!ok && data.error) {
            setErrorMsg(String(data.error));
          }
          if (data.agency) {
            onAgencyLoadedRef.current?.(data.agency);
          }
        })
        .catch(() => {
          if (!active) return;
          setParcels([]);
          setSearched(true);
          setErrorMsg("Erreur réseau lors de la recherche.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } else {
      fetch("/api/agency", { cache: "no-store" })
        .then((r) => r.json())
        .then((ag) => {
          if (!active) return;
          if (ag && ag.name) {
            setAgency(ag);
            onAgencyLoadedRef.current?.(ag);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (active) setLoading(false);
        });
    }

    return () => {
      active = false;
    };
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(query);
  };

  const quickExamples = ["TC-8841", "TC-8842", "TC-8844", "0708123456"];

  return (
    <div className="w-full space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 print:hidden">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Code colis (ex: TC-8841) ou numéro de téléphone (ex: 0708123456)..."
              className="w-full h-12 pl-4 pr-4 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-sm sm:text-base"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="h-12 px-6 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold text-sm sm:text-base transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
          >
            {loading ? "Recherche..." : "Suivre mon colis"}
          </button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>Tester en direct :</span>
          {quickExamples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setQuery(ex);
                runSearch(ex);
              }}
              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 font-mono transition-colors cursor-pointer"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {searched && !loading && errorMsg && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 text-sm text-amber-900">
          {errorMsg}
        </div>
      )}

      {searched && !loading && !errorMsg && parcels.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className="text-lg font-semibold text-slate-900">
            Aucun colis trouvé pour « {query} »
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Vérifiez votre code de suivi (ex: <span className="font-mono">TC-8841</span>) ou entrez les 8 à 10 chiffres de votre numéro WhatsApp.
          </p>
        </div>
      )}

      {parcels.map((parcel) => {
        const currentMeta = PARCEL_STATUS_META[parcel.status];
        const paymentMeta = PAYMENT_STATUS_META[parcel.paymentStatus];
        const currentStep = currentMeta.step;

        return (
          <div
            key={parcel.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
          >
            {/* Header */}
            <div className="bg-slate-950 text-white px-5 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono text-lg sm:text-xl font-bold text-amber-400">
                    {parcel.trackingCode}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${currentMeta.badgeClass}`}
                  >
                    {currentMeta.shortLabel}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${paymentMeta.badgeClass}`}
                  >
                    {paymentMeta.label}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  Client : <strong className="text-white">{parcel.clientName}</strong> • {parcel.clientPhone}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-xs text-slate-400">Frais de fret</div>
                <div className="text-xl font-extrabold text-white">
                  {formatFcfa(parcel.amountFcfa)}
                </div>
              </div>
            </div>

            {/* Stepper */}
            <div className="p-5 sm:p-6 border-b border-slate-100">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {ORDERED_STEPS.map((st) => {
                  const meta = PARCEL_STATUS_META[st];
                  const done = meta.step <= currentStep;
                  const active = meta.step === currentStep;
                  return (
                    <div
                      key={st}
                      className={`rounded-xl p-3 border transition-all ${
                        active
                          ? "bg-amber-50 border-amber-400 ring-1 ring-amber-400"
                          : done
                          ? "bg-emerald-50/70 border-emerald-200"
                          : "bg-slate-50 border-slate-200 opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            active
                              ? "bg-amber-500 text-slate-950"
                              : done
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {done && !active ? "✓" : meta.step}
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Étape {meta.step}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900">
                        {meta.shortLabel}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Details + Actions */}
            <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 rounded-xl p-4 border border-slate-200/80 text-sm">
                  <div>
                    <div className="text-xs text-slate-500">Contenu déclaré</div>
                    <div className="font-semibold text-slate-900 mt-0.5">
                      {parcel.description}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Poids / Volume</div>
                    <div className="font-semibold text-slate-900 mt-0.5">
                      {parcel.weightKg} kg
                      {parcel.volumeCbm > 0 ? ` • ${parcel.volumeCbm} CBM` : ""}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Lot / Transport</div>
                    <div className="font-semibold text-slate-900 mt-0.5">
                      {parcel.batch
                        ? `${parcel.batch.code} (${
                            parcel.batch.mode === "maritime"
                              ? "Maritime"
                              : "Aérien"
                          })`
                        : "Standard"}
                    </div>
                  </div>
                </div>

                {!compact && (
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 mb-3">
                      Historique d&apos;acheminement
                    </h4>
                    <div className="space-y-3 border-l-2 border-slate-200 ml-2 pl-4">
                      {[...parcel.history].reverse().map((ev, idx) => (
                        <div key={`${ev.timestamp}-${idx}`} className="relative">
                          <span
                            className={`absolute -left-[22px] top-1.5 h-2.5 w-2.5 rounded-full ${
                              idx === 0 ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                          />
                          <div className="text-sm font-semibold text-slate-900">
                            {ev.label}
                          </div>
                          <div className="text-xs text-slate-600">
                            {ev.location} • {formatDateFr(ev.timestamp)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Payment & Pickup Card */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Point de retrait Abidjan
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {agency?.name || "Ivoire Cargo Express"}
                  </div>
                  <div className="text-xs text-slate-600">
                    {agency?.address || "Treichville, Abidjan"}
                  </div>
                  {parcel.batch?.etaDate && (
                    <div className="text-xs text-slate-600 pt-1">
                      Arrivée estimée :{" "}
                      <strong className="text-slate-900">
                        {parcel.batch.etaDate}
                      </strong>
                    </div>
                  )}
                </div>

                <div className="space-y-2.5 print:hidden">
                  {!paymentMeta.isPaid && (
                    <button
                      type="button"
                      onClick={() => setShowPayModal(parcel)}
                      className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
                    >
                      Régler par Wave / Orange Money
                    </button>
                  )}

                  {agency && (
                    <a
                      href={`https://wa.me/${normalizePhoneClient(
                        agency.whatsappPhone
                      ).replace(/^\+/, "")}?text=${encodeURIComponent(
                        `Bonjour ${agency.name}, je souhaite des informations / organiser le retrait pour mon colis ${parcel.trackingCode}.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors"
                    >
                      Contacter sur WhatsApp
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="w-full py-2 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
                  >
                    Imprimer le bordereau / Reçu
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Mobile Money Payment Modal */}
      {showPayModal && agency && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Régler le colis {showPayModal.trackingCode}
                </h3>
                <p className="text-sm text-slate-500">
                  Montant dû :{" "}
                  <strong className="text-slate-900">
                    {formatFcfa(showPayModal.amountFcfa)}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPayModal(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {isSafeHttpsLink(agency.waveLink) && (
                <a
                  href={agency.waveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-sm transition-colors"
                >
                  Payer avec Wave ({formatFcfa(showPayModal.amountFcfa)}) →
                </a>
              )}

              <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-200 text-sm">
                <div className="font-bold text-orange-900">
                  Option Orange Money / MTN MoMo
                </div>
                <div className="text-orange-800 mt-1">
                  Envoyez <strong>{formatFcfa(showPayModal.amountFcfa)}</strong> au
                  numéro :{" "}
                  <span className="font-mono font-bold">
                    {agency.orangeMoneyNumber}
                  </span>
                </div>
                <div className="text-xs text-orange-700 mt-1">
                  Référence à indiquer : {showPayModal.trackingCode}
                </div>
              </div>

              <a
                href={`https://wa.me/${normalizePhoneClient(
                  agency.whatsappPhone
                ).replace(/^\+/, "")}?text=${encodeURIComponent(
                  `Bonjour ${agency.name}, je viens d'effectuer le paiement de ${formatFcfa(
                    showPayModal.amountFcfa
                  )} pour le colis ${showPayModal.trackingCode}. Voici la capture :`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors"
              >
                Envoyer la capture sur WhatsApp ✓
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
