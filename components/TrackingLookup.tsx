"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  MapPin,
  MessageSquare,
  Package,
  Printer,
  Search,
  Ship,
  Plane,
  Smartphone,
  X,
} from "lucide-react";
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
    <div className="w-full space-y-5">
      <div className="bg-white text-[#09152b] rounded-[16px] border border-[#09152b]/14 shadow-[var(--sc-e2)] p-4 sm:p-6 print:hidden">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-[#43506b] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Code de suivi colis ou numéro WhatsApp"
              placeholder="Code colis (ex: TC-8841) ou numéro WhatsApp (ex: 0708123456)"
              className="w-full h-12 pl-10 pr-4 rounded-[10px] border border-[#09152b]/22 bg-[#f6f3ec] text-[#09152b] placeholder:text-[#5c6a84] focus:outline-none focus:ring-2 focus:ring-[#0a2e6e] focus:border-[#0a2e6e] text-sm sm:text-base font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="tc-btn-primary shrink-0 disabled:opacity-60"
          >
            {loading ? "Recherche..." : "Suivre mon colis"}
          </button>
        </form>

        <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs text-[#43506b]">
          <span className="font-semibold">Codes de démonstration en direct :</span>
          {quickExamples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setQuery(ex);
                runSearch(ex);
              }}
              className={`px-2.5 py-1 rounded-[6px] font-mono transition-colors cursor-pointer border ${
                query.toUpperCase() === ex
                  ? "bg-[#0a2e6e] text-white border-[#0a2e6e] font-bold"
                  : "bg-[#f6f3ec] text-[#09152b] border-[#09152b]/18 hover:border-[#0a2e6e] hover:bg-[#dce7fa]/50"
              }`}
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {searched && !loading && errorMsg && (
        <div className="bg-amber-50 rounded-[14px] border border-amber-400 p-5 text-sm text-amber-950 font-medium">
          {errorMsg}
        </div>
      )}

      {searched && !loading && !errorMsg && parcels.length === 0 && (
        <div className="bg-white rounded-[16px] border border-[#09152b]/14 p-8 text-center text-[#09152b] shadow-[var(--sc-e1)]">
          <div className="text-lg font-bold">
            Aucun colis trouvé pour « {query} »
          </div>
          <p className="text-sm text-[#43506b] mt-1.5">
            Vérifiez votre code de suivi (ex:{" "}
            <span className="font-mono font-bold text-[#0a2e6e]">TC-8841</span>) ou
            entrez les 8 à 10 chiffres de votre numéro WhatsApp.
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
            className="bg-white text-[#09152b] rounded-[16px] border border-[#09152b]/16 shadow-[var(--sc-e2)] overflow-hidden print:border-slate-300"
          >
            {/* Header Band — Crisp Cargo Cobalt */}
            <div className="bg-[#0a2e6e] text-white px-5 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#09152b] print:bg-slate-100 print:text-black print:border-slate-300">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono text-lg sm:text-xl font-extrabold text-[#ff966b] print:text-black">
                    {parcel.trackingCode}
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-[6px] border ${currentMeta.badgeClass}`}
                  >
                    {currentMeta.shortLabel}
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-[6px] border ${paymentMeta.badgeClass}`}
                  >
                    {paymentMeta.label}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#dce7fa] mt-1.5 print:text-slate-700">
                  Client : <strong className="text-white print:text-black">{parcel.clientName}</strong> ·{" "}
                  <span className="font-mono">{parcel.clientPhone}</span>
                </p>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-xs font-mono uppercase tracking-[0.06em] text-[#b9d0f6] print:text-slate-600">
                  Frais de fret
                </div>
                <div className="text-xl font-extrabold text-white font-mono tabular-nums print:text-black">
                  {formatFcfa(parcel.amountFcfa)}
                </div>
              </div>
            </div>

            {/* Stepper */}
            <div className="p-5 sm:p-6 border-b border-[#09152b]/10 bg-[#faf8f4] print:border-slate-200">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {ORDERED_STEPS.map((st) => {
                  const meta = PARCEL_STATUS_META[st];
                  const done = meta.step <= currentStep;
                  const active = meta.step === currentStep;
                  return (
                    <div
                      key={st}
                      className={`rounded-[10px] p-3 border transition-colors ${
                        active
                          ? "bg-[#fff1eb] border-[#ff5c1b] text-[#09152b] shadow-xs"
                          : done
                          ? "bg-emerald-50 border-emerald-400 text-[#09152b]"
                          : "bg-white border-[#09152b]/12 text-[#43506b]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-[6px] text-xs font-extrabold font-mono ${
                            active
                              ? "bg-[#ff5c1b] text-[#09152b] border border-[#09152b]"
                              : done
                              ? "bg-emerald-600 text-white"
                              : "bg-[#ebe5d8] text-[#09152b]"
                          }`}
                        >
                          {done && !active ? (
                            <Check className="w-3.5 h-3.5" aria-hidden="true" />
                          ) : (
                            meta.step
                          )}
                        </span>
                        <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#43506b]">
                          Étape {meta.step}
                        </span>
                      </div>
                      <div className="text-xs font-bold leading-snug text-[#09152b]">
                        {meta.shortLabel}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Details + Actions */}
            <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#f6f3ec] rounded-[10px] p-4 border border-[#09152b]/12 text-sm print:bg-slate-50 print:border-slate-300">
                  <div>
                    <div className="text-xs font-mono text-[#43506b] flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-[#0a2e6e]" aria-hidden="true" />
                      <span>Contenu déclaré</span>
                    </div>
                    <div className="font-bold text-[#09152b] mt-1 print:text-black">
                      {parcel.description}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-mono text-[#43506b]">Poids / Volume</div>
                    <div className="font-bold text-[#09152b] mt-1 font-mono tabular-nums print:text-black">
                      {parcel.weightKg} kg
                      {parcel.volumeCbm > 0 ? ` · ${parcel.volumeCbm} CBM` : ""}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-mono text-[#43506b] flex items-center gap-1.5">
                      {parcel.batch?.mode === "maritime" ? (
                        <Ship className="w-3.5 h-3.5 text-[#0a2e6e]" aria-hidden="true" />
                      ) : (
                        <Plane className="w-3.5 h-3.5 text-[#0a2e6e]" aria-hidden="true" />
                      )}
                      <span>Lot / Transport</span>
                    </div>
                    <div className="font-bold text-[#09152b] mt-1 font-mono print:text-black">
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
                    <h4 className="text-sm font-extrabold text-[#09152b] mb-3 print:text-black">
                      Historique d&apos;acheminement
                    </h4>
                    <div className="space-y-3 border-l-2 border-[#0a2e6e]/25 ml-2 pl-4 print:border-slate-300">
                      {[...parcel.history].reverse().map((ev, idx) => (
                        <div key={`${ev.timestamp}-${idx}`} className="relative">
                          <span
                            className={`absolute -left-[22px] top-1.5 h-2.5 w-2.5 rounded-full ${
                              idx === 0 ? "bg-[#ff5c1b]" : "bg-emerald-600"
                            }`}
                          />
                          <div className="text-sm font-bold text-[#09152b] print:text-black">
                            {ev.label}
                          </div>
                          <div className="text-xs text-[#43506b] print:text-slate-600">
                            {ev.location} · {formatDateFr(ev.timestamp)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Payment & Pickup Card */}
              <div className="bg-[#f6f3ec] rounded-[12px] border border-[#09152b]/14 p-4 flex flex-col justify-between gap-4 print:bg-slate-50 print:border-slate-300">
                <div className="space-y-2">
                  <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#0a2e6e] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#ff5c1b]" aria-hidden="true" />
                    <span>Point de retrait Abidjan</span>
                  </div>
                  <div className="text-sm font-extrabold text-[#09152b] print:text-black">
                    {agency?.name || "Ivoire Cargo Express"}
                  </div>
                  <div className="text-xs text-[#43506b] print:text-slate-700">
                    {agency?.address || "Treichville, Abidjan"}
                  </div>
                  {parcel.batch?.etaDate && (
                    <div className="text-xs text-[#43506b] pt-1 print:text-slate-700">
                      Arrivée estimée :{" "}
                      <strong className="text-[#09152b] font-mono print:text-black">
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
                      className="w-full py-2.5 px-4 rounded-[8px] bg-[#22d3ee] hover:bg-[#38bdf8] text-[#09152b] font-extrabold text-sm border border-[#09152b]/20 transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Smartphone className="w-4 h-4" aria-hidden="true" />
                      <span>Régler par Wave / Orange Money</span>
                    </button>
                  )}

                  {agency && (
                    <a
                      href={`https://wa.me/${normalizePhoneClient(
                        agency.whatsappPhone
                      ).replace(/^\+/, "")}?text=${encodeURIComponent(
                        `Bonjour ${agency.name}, je souhaite des informations pour mon colis ${parcel.trackingCode}.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-4 rounded-[8px] bg-[#10b981] hover:bg-[#34d399] text-[#042318] font-extrabold text-sm transition-colors flex items-center justify-center gap-2 no-underline"
                    >
                      <MessageSquare className="w-4 h-4" aria-hidden="true" />
                      <span>Contacter sur WhatsApp</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="w-full py-2 px-4 rounded-[8px] border border-[#09152b]/22 bg-white hover:bg-[#ebe5d8] text-[#09152b] font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Imprimer le bordereau</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Mobile Money Payment Modal */}
      {showPayModal && agency && (
        <div
          className="fixed inset-0 z-50 bg-[#09152b]/70 backdrop-blur-xs flex items-center justify-center p-4 print:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pay-modal-title"
        >
          <div className="bg-white text-[#09152b] rounded-[16px] max-w-md w-full p-6 shadow-2xl border border-[#09152b]/20 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="pay-modal-title" className="text-lg font-extrabold">
                  Régler le colis{" "}
                  <span className="font-mono text-[#0a2e6e]">
                    {showPayModal.trackingCode}
                  </span>
                </h3>
                <p className="text-sm text-[#43506b] mt-1">
                  Montant dû :{" "}
                  <strong className="text-[#09152b] font-mono">
                    {formatFcfa(showPayModal.amountFcfa)}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPayModal(null)}
                aria-label="Fermer la fenêtre de paiement"
                className="p-1.5 rounded-[6px] text-[#43506b] hover:text-[#09152b] hover:bg-[#ebe5d8] cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-3">
              {isSafeHttpsLink(agency.waveLink) && (
                <a
                  href={agency.waveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center py-3 px-4 rounded-[8px] bg-[#22d3ee] hover:bg-[#38bdf8] text-[#09152b] font-extrabold text-sm border border-[#09152b]/20 transition-colors no-underline"
                >
                  Payer avec Wave ({formatFcfa(showPayModal.amountFcfa)})
                </a>
              )}

              <div className="p-3.5 rounded-[10px] bg-[#fff4ee] border border-[#ff5c1b]/40 text-sm">
                <div className="font-extrabold text-[#9a2e00]">
                  Option Orange Money / MTN MoMo
                </div>
                <div className="text-[#09152b] mt-1">
                  Envoyez <strong>{formatFcfa(showPayModal.amountFcfa)}</strong> au
                  numéro :{" "}
                  <span className="font-mono font-extrabold">
                    {agency.orangeMoneyNumber}
                  </span>
                </div>
                <div className="text-xs text-[#43506b] mt-1 font-mono font-semibold">
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
                className="w-full py-2.5 px-4 rounded-[8px] bg-[#10b981] hover:bg-[#34d399] text-[#042318] font-extrabold text-sm transition-colors flex items-center justify-center gap-2 no-underline"
              >
                <Check className="w-4 h-4" aria-hidden="true" />
                <span>Envoyer la capture sur WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
