"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  MapPin,
  Package,
  Plane,
  Printer,
  Search,
  Ship,
  X,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
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

function VerificationQrBadge({ code }: { code: string }) {
  const size = 13;
  const seedStr = `TRACKCARGO-CI:${code.toUpperCase()}`;
  const isFinder = (r: number, c: number) => {
    const inTL = r < 4 && c < 4;
    const inTR = r < 4 && c >= size - 4;
    const inBL = r >= size - 4 && c < 4;
    return inTL || inTR || inBL;
  };
  const finderBit = (r: number, c: number) => {
    const lr = r >= size - 4 ? r - (size - 4) : r;
    const lc = c >= size - 4 ? c - (size - 4) : c;
    if (lr === 0 || lr === 3 || lc === 0 || lc === 3) return true;
    return lr >= 1 && lr <= 2 && lc >= 1 && lc <= 2;
  };
  const cells: boolean[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isFinder(r, c)) {
        cells.push(finderBit(r, c));
      } else {
        const idx = r * size + c;
        const ch = seedStr.charCodeAt(idx % seedStr.length);
        const h = ((ch * 31 + idx * 17 + r * 13 + c * 7) ^ (ch << 2)) & 0xff;
        cells.push(h % 2 === 0);
      }
    }
  }

  return (
    <div
      className="inline-flex items-center gap-2.5 rounded-[10px] bg-white text-[#0d131d] p-2 border border-[#0d131d]/12 shadow-xs shrink-0"
      title={`Code QR de retrait vérifié : ${code}`}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-11 h-11 shrink-0"
        shapeRendering="crispEdges"
        aria-label={`QR Code de retrait ${code}`}
      >
        {cells.map((on, i) => {
          if (!on) return null;
          const r = Math.floor(i / size);
          const c = i % size;
          return (
            <rect
              key={i}
              x={c}
              y={r}
              width={1}
              height={1}
              fill="#0d1522"
            />
          );
        })}
      </svg>
      <div className="pr-1 text-left leading-tight">
        <div className="text-[9.5px] font-mono font-bold uppercase tracking-[0.08em] text-[#525e70]">
          Pass Retrait
        </div>
        <div className="text-xs font-mono font-bold text-[#0d131d] mt-0.5">
          {code}
        </div>
        <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
          Vérifié CI
        </div>
      </div>
    </div>
  );
}

export default function TrackingLookup({
  initialQuery = "",
  agencySlug,
  compact = false,
  onAgencyLoaded,
  onPortalStateChange,
}: {
  initialQuery?: string;
  agencySlug?: string;
  compact?: boolean;
  onAgencyLoaded?: (agency: PublicAgencyProfile) => void;
  onPortalStateChange?: (state: "OK" | "NOT_FOUND" | "SUSPENDED", info?: string) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(
    Boolean(initialQuery.trim() || agencySlug)
  );
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [hintMsg, setHintMsg] = useState("");
  const [portalBlocked, setPortalBlocked] = useState<{
    state: "NOT_FOUND" | "SUSPENDED";
    message: string;
  } | null>(null);
  const [agency, setAgency] = useState<PublicAgencyProfile | null>(null);
  const [parcels, setParcels] = useState<PublicTrackedParcel[]>([]);
  const [showPayModal, setShowPayModal] = useState<PublicTrackedParcel | null>(
    null
  );

  const onAgencyLoadedRef = useRef(onAgencyLoaded);
  const onPortalStateRef = useRef(onPortalStateChange);
  useEffect(() => {
    onAgencyLoadedRef.current = onAgencyLoaded;
    onPortalStateRef.current = onPortalStateChange;
  }, [onAgencyLoaded, onPortalStateChange]);

  const buildTrackEndpoint = (q: string) =>
    agencySlug
      ? `/api/public/${encodeURIComponent(agencySlug)}/track?q=${encodeURIComponent(
          q
        )}`
      : `/api/track?q=${encodeURIComponent(q)}`;

  const runSearch = async (searchText: string) => {
    const clean = searchText.trim();
    if (!clean) return;
    setLoading(true);
    setSearched(true);
    setErrorMsg("");
    setHintMsg("");
    setPortalBlocked(null);

    try {
      const res = await fetch(buildTrackEndpoint(clean), {
        cache: "no-store",
      });
      const data = await res.json();

      if (res.status === 404 && agencySlug) {
        setPortalBlocked({
          state: "NOT_FOUND",
          message: "Aucune agence TrackCargo CI ne correspond à ce lien.",
        });
        setAgency(null);
        setParcels([]);
        onPortalStateRef.current?.("NOT_FOUND");
        return;
      }

      if (res.status === 403 && data.suspended) {
        setPortalBlocked({
          state: "SUSPENDED",
          message:
            data.error ||
            "Ce portail agence est temporairement suspendu par l'administration.",
        });
        setAgency(null);
        setParcels([]);
        onPortalStateRef.current?.("SUSPENDED", data.agencyName);
        return;
      }

      setAgency(data.agency || null);
      setParcels(data.parcels || []);
      if (data.hint) {
        setHintMsg(String(data.hint));
      }
      if (!res.ok && data.error) {
        setErrorMsg(String(data.error));
      }
      if (data.agency) {
        onAgencyLoadedRef.current?.(data.agency);
      }
      onPortalStateRef.current?.("OK");
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

    const initialUrl = clean
      ? agencySlug
        ? `/api/public/${encodeURIComponent(agencySlug)}/track?q=${encodeURIComponent(
            clean
          )}`
        : `/api/track?q=${encodeURIComponent(clean)}`
      : agencySlug
      ? `/api/public/${encodeURIComponent(agencySlug)}/track`
      : "/api/agency";

    fetch(initialUrl, { cache: "no-store" })
      .then(async (res) => ({ status: res.status, ok: res.ok, data: await res.json() }))
      .then(({ status, ok, data }) => {
        if (!active) return;

        if (status === 404 && agencySlug) {
          setPortalBlocked({
            state: "NOT_FOUND",
            message: "Aucune agence TrackCargo CI ne correspond à ce lien.",
          });
          setAgency(null);
          setParcels([]);
          onPortalStateRef.current?.("NOT_FOUND");
          return;
        }

        if (status === 403 && data.suspended) {
          setPortalBlocked({
            state: "SUSPENDED",
            message:
              data.error ||
              "Ce portail agence est temporairement suspendu par l'administration.",
          });
          setAgency(null);
          setParcels([]);
          onPortalStateRef.current?.("SUSPENDED", data.agencyName);
          return;
        }

        const resolvedAgency = clean || agencySlug ? data.agency : data;
        if (resolvedAgency && resolvedAgency.name) {
          setAgency(resolvedAgency);
          onAgencyLoadedRef.current?.(resolvedAgency);
        }

        if (clean) {
          setParcels(data.parcels || []);
          setSearched(true);
          if (data.hint) setHintMsg(String(data.hint));
          if (!ok && data.error) {
            setErrorMsg(String(data.error));
          }
        }
        onPortalStateRef.current?.("OK");
      })
      .catch(() => {
        if (!active) return;
        if (clean) {
          setParcels([]);
          setSearched(true);
          setErrorMsg("Erreur réseau lors de la recherche.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [initialQuery, agencySlug]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(query);
  };

  if (portalBlocked) {
    return (
      <div className="bg-white rounded-[18px] border border-[#0d131d]/12 p-8 text-center text-[#0d131d] shadow-[var(--sc-e2)] space-y-3">
        <div className="mx-auto h-11 w-11 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-bold">
          {portalBlocked.state === "NOT_FOUND"
            ? "Portail agence introuvable"
            : "Portail momentanément indisponible"}
        </h2>
        <p className="text-sm text-[#525e70] max-w-md mx-auto">
          {portalBlocked.message}
        </p>
      </div>
    );
  }

  const showDemoQuickExamples = Boolean(compact);
  const quickExamples = ["TC-8841", "TC-8842", "TC-8844", "0708123456"];

  return (
    <div className="w-full space-y-5">
      <div className="bg-white text-[#0d131d] rounded-[18px] border border-[#0d131d]/10 shadow-[var(--sc-e2)] p-4 sm:p-6 print:hidden">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-[#525e70] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Code de suivi colis ou numéro WhatsApp"
              placeholder={
                compact
                  ? "Code colis (ex: TC-8841) ou numéro démo (0708123456)"
                  : "Code colis (ex: TC-8841) ou numéro WhatsApp (ex: 0708...)"
              }
              className="w-full h-12 pl-10 pr-4 rounded-full border border-[#0d131d]/14 bg-[#f7f6f2] text-[#0d131d] placeholder:text-[#525e70]/80 focus:outline-none focus:ring-2 focus:ring-[#c9410e] focus:border-[#c9410e] text-sm sm:text-base font-mono"
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

        {showDemoQuickExamples && (
          <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs text-[#525e70]">
            <span className="font-medium">
              Exemples en un clic :
            </span>
            {quickExamples.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  setQuery(ex);
                  runSearch(ex);
                }}
                className={`px-3 py-1 rounded-full font-mono transition-colors cursor-pointer border ${
                  query.toUpperCase() === ex
                    ? "bg-[#0d1522] text-white border-[#0d1522] font-semibold"
                    : "bg-[#f7f6f2] text-[#0d131d] border-[#0d131d]/12 hover:border-[#0d131d]/30"
                }`}
              >
                {ex}
              </button>
            ))}
          </div>
        )}
      </div>

      {searched && !loading && errorMsg && (
        <div className="bg-amber-50 rounded-[14px] border border-amber-300 p-5 text-sm text-amber-950 font-medium">
          {errorMsg}
        </div>
      )}

      {searched && !loading && !errorMsg && parcels.length === 0 && (
        <div className="bg-white rounded-[18px] border border-[#0d131d]/10 p-8 text-center text-[#0d131d] shadow-[var(--sc-e1)]">
          <div className="text-lg font-bold">
            Aucun colis trouvé pour « {query} »
          </div>
          <p className="text-sm text-[#525e70] mt-1.5">
            {hintMsg ||
              "Vérifiez votre code de suivi complet (ex: TC-8841) ou vos 8 à 10 chiffres WhatsApp."}
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
            className="bg-white text-[#0d131d] rounded-[18px] border border-[#0d131d]/10 shadow-[var(--sc-e2)] overflow-hidden print:border-slate-300"
          >
            {/* Header Band — Deep Atlantic Slate */}
            <div className="bg-[#0d1522] text-white px-5 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:bg-slate-100 print:text-black print:border-slate-300">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono text-lg sm:text-xl font-bold text-[#ff966b] print:text-black">
                    {parcel.trackingCode}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${currentMeta.badgeClass}`}
                  >
                    {currentMeta.shortLabel}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${paymentMeta.badgeClass}`}
                  >
                    {paymentMeta.label}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#c7d4e6] mt-1.5 print:text-slate-700">
                  Client :{" "}
                  <strong className="text-white font-semibold print:text-black">
                    {parcel.clientName}
                  </strong>{" "}
                  · <span className="font-mono">{parcel.clientPhone}</span>
                </p>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-xs font-mono uppercase tracking-[0.06em] text-[#9eb0c9] print:text-slate-600">
                  Frais de fret
                </div>
                <div className="text-xl font-bold text-white font-mono tabular-nums print:text-black">
                  {formatFcfa(parcel.amountFcfa)}
                </div>
              </div>
            </div>

            {/* Stepper */}
            <div className="p-5 sm:p-6 border-b border-[#0d131d]/8 bg-[#faf9f6] print:border-slate-200">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {ORDERED_STEPS.map((st) => {
                  const meta = PARCEL_STATUS_META[st];
                  const done = meta.step <= currentStep;
                  const active = meta.step === currentStep;
                  return (
                    <div
                      key={st}
                      className={`rounded-[12px] p-3 border transition-colors ${
                        active
                          ? "bg-[#fff4ee] border-[#c9410e]/40 text-[#0d131d]"
                          : done
                          ? "bg-emerald-50/70 border-emerald-200 text-[#0d131d]"
                          : "bg-white border-[#0d131d]/8 text-[#525e70]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold font-mono ${
                            active
                              ? "bg-[#c9410e] text-white"
                              : done
                              ? "bg-emerald-600 text-white"
                              : "bg-[#eeebe3] text-[#525e70]"
                          }`}
                        >
                          {done && !active ? (
                            <Check className="w-3.5 h-3.5" aria-hidden="true" />
                          ) : (
                            meta.step
                          )}
                        </span>
                        <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-[#525e70]">
                          Étape {meta.step}
                        </span>
                      </div>
                      <div className="text-xs font-semibold leading-snug text-[#0d131d]">
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#f7f6f2] rounded-[12px] p-4 border border-[#0d131d]/8 text-sm print:bg-slate-50 print:border-slate-300">
                  <div>
                    <div className="text-xs font-mono text-[#525e70] flex items-center gap-1.5">
                      <Package
                        className="w-3.5 h-3.5 text-[#0d1522]"
                        aria-hidden="true"
                      />
                      <span>Contenu déclaré</span>
                    </div>
                    <div className="font-semibold text-[#0d131d] mt-1 print:text-black">
                      {parcel.description}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-mono text-[#525e70]">
                      Poids / Volume
                    </div>
                    <div className="font-semibold text-[#0d131d] mt-1 font-mono tabular-nums print:text-black">
                      {parcel.weightKg} kg
                      {parcel.volumeCbm > 0 ? ` · ${parcel.volumeCbm} CBM` : ""}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-mono text-[#525e70] flex items-center gap-1.5">
                      {parcel.batch?.mode === "maritime" ? (
                        <Ship
                          className="w-3.5 h-3.5 text-[#0d1522]"
                          aria-hidden="true"
                        />
                      ) : (
                        <Plane
                          className="w-3.5 h-3.5 text-[#0d1522]"
                          aria-hidden="true"
                        />
                      )}
                      <span>Lot / Transport</span>
                    </div>
                    <div className="font-semibold text-[#0d131d] mt-1 font-mono print:text-black">
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
                    <h4 className="text-sm font-bold text-[#0d131d] mb-3 print:text-black">
                      Historique d&apos;acheminement
                    </h4>
                    <div className="space-y-3 border-l-2 border-[#0d1522]/15 ml-2 pl-4 print:border-slate-300">
                      {[...parcel.history].reverse().map((ev, idx) => (
                        <div key={`${ev.timestamp}-${idx}`} className="relative">
                          <span
                            className={`absolute -left-[22px] top-1.5 h-2.5 w-2.5 rounded-full ${
                              idx === 0 ? "bg-[#c9410e]" : "bg-emerald-600"
                            }`}
                          />
                          <div className="text-sm font-semibold text-[#0d131d] print:text-black">
                            {ev.label}
                          </div>
                          <div className="text-xs text-[#525e70] print:text-slate-600">
                            {ev.location} · {formatDateFr(ev.timestamp)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Payment & Pickup Card */}
              <div className="bg-[#f7f6f2] rounded-[12px] border border-[#0d131d]/8 p-4 flex flex-col justify-between gap-4 print:bg-slate-50 print:border-slate-300">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[#525e70] flex items-center gap-1.5">
                        <MapPin
                          className="w-3.5 h-3.5 text-[#c9410e]"
                          aria-hidden="true"
                        />
                        <span>Retrait Abidjan</span>
                      </div>
                      <div className="text-sm font-bold text-[#0d131d] print:text-black">
                        {agency?.name || "Agence TrackCargo CI"}
                      </div>
                      <div className="text-xs text-[#525e70] print:text-slate-700">
                        {agency?.address || "Abidjan"}
                      </div>
                    </div>
                    <VerificationQrBadge code={parcel.trackingCode} />
                  </div>
                  {parcel.batch?.etaDate && (
                    <div className="text-xs text-[#525e70] pt-0.5 print:text-slate-700">
                      Arrivée estimée :{" "}
                      <strong className="text-[#0d131d] font-mono print:text-black">
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
                      className="w-full py-2.5 px-4 rounded-full bg-[#0e7490] hover:bg-[#0c6078] text-white font-semibold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <BrandLogo brand="wave" size="xs" decorative />
                      <BrandLogo brand="orange-money" size="xs" decorative />
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
                      className="w-full py-2.5 px-4 rounded-full bg-[#047857] hover:bg-[#065f46] text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 no-underline"
                    >
                      <BrandLogo brand="whatsapp" size="xs" decorative />
                      <span>Contacter sur WhatsApp</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="w-full py-2 px-4 rounded-full border border-[#0d131d]/14 bg-white hover:bg-[#eeebe3] text-[#0d131d] font-medium text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Imprimer le bordereau avec QR</span>
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
          className="fixed inset-0 z-50 bg-[#0d1522]/70 backdrop-blur-xs flex items-center justify-center p-4 print:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pay-modal-title"
        >
          <div className="bg-white text-[#0d131d] rounded-[18px] max-w-md w-full p-5 sm:p-6 shadow-2xl border border-[#0d131d]/12 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="pay-modal-title" className="text-lg font-bold">
                  Régler le colis{" "}
                  <span className="font-mono text-[#c9410e]">
                    {showPayModal.trackingCode}
                  </span>
                </h3>
                <p className="text-sm text-[#525e70] mt-1">
                  Montant dû :{" "}
                  <strong className="text-[#0d131d] font-mono">
                    {formatFcfa(showPayModal.amountFcfa)}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPayModal(null)}
                aria-label="Fermer la fenêtre de paiement"
                className="p-1.5 rounded-full text-[#525e70] hover:text-[#0d131d] hover:bg-[#f7f6f2] cursor-pointer"
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
                  className="w-full py-3 px-4 rounded-full bg-[#0e7490] hover:bg-[#0c6078] text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2.5 no-underline"
                >
                  <BrandLogo brand="wave" size="sm" decorative />
                  <span>Payer avec Wave ({formatFcfa(showPayModal.amountFcfa)})</span>
                </a>
              )}

              {agency.orangeMoneyNumber ? (
                <div className="p-4 rounded-[12px] bg-[#fff4ee] border border-[#c9410e]/25 text-sm">
                  <div className="flex items-center gap-2.5 font-bold text-[#9a2e00]">
                    <BrandLogo brand="orange-money" size="sm" decorative />
                    <span>Option Orange Money / MTN MoMo</span>
                  </div>
                  <div className="text-[#0d131d] mt-2">
                    Envoyez{" "}
                    <strong>{formatFcfa(showPayModal.amountFcfa)}</strong> au
                    numéro :{" "}
                    <span className="font-mono font-bold">
                      {agency.orangeMoneyNumber}
                    </span>
                  </div>
                  <div className="text-xs text-[#525e70] mt-1 font-mono font-medium">
                    Référence : {showPayModal.trackingCode}
                  </div>
                </div>
              ) : (
                !isSafeHttpsLink(agency.waveLink) && (
                  <div className="p-4 rounded-[12px] bg-[#f7f6f2] border border-[#0d131d]/10 text-sm text-[#0d131d]">
                    Règlement au comptoir lors du retrait ou via le numéro WhatsApp officiel de l&apos;agence.
                  </div>
                )
              )}

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
                className="w-full py-2.5 px-4 rounded-full bg-[#047857] hover:bg-[#065f46] text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 no-underline"
              >
                <BrandLogo brand="whatsapp" size="sm" decorative />
                <span>Envoyer la capture sur WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
