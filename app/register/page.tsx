"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { PLAN_META, PlanTier } from "@/lib/types";
import { formatFcfa } from "@/lib/format";

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlanParam = searchParams.get("plan")?.toUpperCase();
  const initialPlan: PlanTier =
    initialPlanParam === "DEPART" ||
    initialPlanParam === "PRO" ||
    initialPlanParam === "MULTI"
      ? initialPlanParam
      : "PRO";

  const [agencyName, setAgencyName] = useState("");
  const [commune, setCommune] = useState("Treichville");
  const [whatsappPhone, setWhatsappPhone] = useState("+225");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState<PlanTier>(initialPlan);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          router.replace(data.redirectTo || "/dashboard");
        }
      })
      .catch(() => {});
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agencyName,
          commune,
          whatsappPhone,
          fullName,
          email,
          password,
          plan,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Impossible de créer votre agence.");
        if (data.details && typeof data.details === "object") {
          setFieldErrors(data.details);
        }
        return;
      }
      router.replace("/dashboard");
    } catch {
      setError("Erreur réseau lors de la création de l'agence.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Value Panel — Cargo Cobalt */}
      <aside className="lg:col-span-5 bg-[#0a2e6e] text-white rounded-[16px] border-2 border-[#09152b] shadow-[var(--sc-e3)] p-6 sm:p-7 space-y-5">
        <span className="inline-flex items-center gap-1.5 text-xs font-mono font-extrabold uppercase tracking-[0.06em] px-2.5 py-1 rounded-[6px] bg-[#ff5c1b] text-[#09152b] border border-[#09152b]">
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          <span>14 jours gratuits</span>
        </span>
        <div className="space-y-2">
          <h1 className="sc-display sc-display--md text-white font-extrabold">
            Lancez le portail de votre agence en 2 minutes.
          </h1>
          <p className="text-sm text-[#dce7fa] leading-relaxed">
            Aucune carte bancaire requise pour démarrer. Importez vos premiers
            colis et partagez immédiatement votre lien client personnalisé.
          </p>
        </div>

        <ul className="space-y-3 text-sm text-[#f8fafc] pt-1">
          <li className="flex items-start gap-2.5">
            <Check
              className="w-4 h-4 text-[#ff5c1b] shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>
              Page de suivi dédiée à votre nom (<code className="font-mono text-[#fef08a]">/a/votre-agence</code>)
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <Check
              className="w-4 h-4 text-[#ff5c1b] shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>
              Mises à jour de masse par conteneur et alertes WhatsApp prêtes
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <Check
              className="w-4 h-4 text-[#ff5c1b] shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>
              Zéro commission sur vos encaissements Wave Business et Orange Money
            </span>
          </li>
        </ul>

        <div className="pt-4 border-t border-white/15 text-xs text-[#c7d9f7]">
          À la fin des 14 jours d&apos;essai, réglez facilement par Wave ou
          Orange Money sans interruption pour vos clients.
        </div>
      </aside>

      {/* Right Registration Card */}
      <div className="lg:col-span-7 bg-white rounded-[16px] border border-[#09152b]/16 shadow-[var(--sc-e3)] p-6 sm:p-8 space-y-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-[0.06em] text-emerald-900 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-[6px]">
            <ShieldCheck
              className="w-3.5 h-3.5 text-emerald-700"
              aria-hidden="true"
            />
            <span>Compte administrateur agence</span>
          </div>
          <h2 className="font-[family-name:var(--font-archivo)] text-2xl font-extrabold text-[#09152b] pt-1">
            Créer mon espace TrackCargo CI
          </h2>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-[10px] bg-rose-50 border border-rose-400 text-sm text-rose-900 font-semibold"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="reg-agency-name"
                className="block text-xs font-mono font-bold uppercase tracking-[0.05em] text-[#43506b] mb-1.5"
              >
                Nom de votre agence
              </label>
              <input
                id="reg-agency-name"
                type="text"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                placeholder="ex: Horizon Cargo CI"
                className="w-full h-11 px-3.5 rounded-[8px] border border-[#09152b]/22 bg-[#f6f3ec] text-[#09152b] placeholder:text-[#5c6a84] focus:outline-none focus:ring-2 focus:ring-[#0a2e6e] text-sm"
                required
              />
              {fieldErrors.agencyName && (
                <p className="text-xs text-rose-700 mt-1 font-medium">
                  {fieldErrors.agencyName}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="reg-commune"
                className="block text-xs font-mono font-bold uppercase tracking-[0.05em] text-[#43506b] mb-1.5"
              >
                Commune / Ville
              </label>
              <input
                id="reg-commune"
                type="text"
                value={commune}
                onChange={(e) => setCommune(e.target.value)}
                placeholder="Treichville, Adjamé, Marcory..."
                className="w-full h-11 px-3.5 rounded-[8px] border border-[#09152b]/22 bg-[#f6f3ec] text-[#09152b] placeholder:text-[#5c6a84] focus:outline-none focus:ring-2 focus:ring-[#0a2e6e] text-sm"
                required
              />
              {fieldErrors.commune && (
                <p className="text-xs text-rose-700 mt-1 font-medium">
                  {fieldErrors.commune}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="reg-whatsapp"
                className="block text-xs font-mono font-bold uppercase tracking-[0.05em] text-[#43506b] mb-1.5"
              >
                WhatsApp agence
              </label>
              <input
                id="reg-whatsapp"
                type="text"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                placeholder="+2250708123456"
                className="w-full h-11 px-3.5 rounded-[8px] border border-[#09152b]/22 bg-[#f6f3ec] text-[#09152b] placeholder:text-[#5c6a84] focus:outline-none focus:ring-2 focus:ring-[#0a2e6e] text-sm font-mono"
                required
              />
              {fieldErrors.whatsappPhone && (
                <p className="text-xs text-rose-700 mt-1 font-medium">
                  {fieldErrors.whatsappPhone}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="reg-fullname"
                className="block text-xs font-mono font-bold uppercase tracking-[0.05em] text-[#43506b] mb-1.5"
              >
                Nom du gérant
              </label>
              <input
                id="reg-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="ex: Seydou Diallo"
                className="w-full h-11 px-3.5 rounded-[8px] border border-[#09152b]/22 bg-[#f6f3ec] text-[#09152b] placeholder:text-[#5c6a84] focus:outline-none focus:ring-2 focus:ring-[#0a2e6e] text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="reg-email"
                className="block text-xs font-mono font-bold uppercase tracking-[0.05em] text-[#43506b] mb-1.5"
              >
                Email de connexion
              </label>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="contact@monagence.ci"
                className="w-full h-11 px-3.5 rounded-[8px] border border-[#09152b]/22 bg-[#f6f3ec] text-[#09152b] placeholder:text-[#5c6a84] focus:outline-none focus:ring-2 focus:ring-[#0a2e6e] text-sm"
                required
              />
              {fieldErrors.email && (
                <p className="text-xs text-rose-700 mt-1 font-medium">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="reg-password"
                className="block text-xs font-mono font-bold uppercase tracking-[0.05em] text-[#43506b] mb-1.5"
              >
                Mot de passe (min. 8 car.)
              </label>
              <input
                id="reg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Au moins 8 caractères"
                minLength={8}
                className="w-full h-11 px-3.5 rounded-[8px] border border-[#09152b]/22 bg-[#f6f3ec] text-[#09152b] placeholder:text-[#5c6a84] focus:outline-none focus:ring-2 focus:ring-[#0a2e6e] text-sm"
                required
              />
              {fieldErrors.password && (
                <p className="text-xs text-rose-700 mt-1 font-medium">
                  {fieldErrors.password}
                </p>
              )}
            </div>
          </div>

          <div>
            <div className="block text-xs font-mono font-bold uppercase tracking-[0.05em] text-[#43506b] mb-2">
              Formule souhaitée après l&apos;essai de 14 jours
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {(Object.keys(PLAN_META) as PlanTier[]).map((tier) => {
                const meta = PLAN_META[tier];
                const selected = plan === tier;
                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setPlan(tier)}
                    aria-pressed={selected}
                    className={`text-left p-3 rounded-[10px] border transition-all cursor-pointer ${
                      selected
                        ? "bg-[#dce7fa] border-[#0a2e6e] ring-2 ring-[#0a2e6e]/30"
                        : "bg-[#f6f3ec] border-[#09152b]/18 hover:border-[#0a2e6e]"
                    }`}
                  >
                    <div className="text-xs font-mono font-extrabold text-[#0a2e6e] uppercase">
                      {meta.label}
                    </div>
                    <div className="text-sm font-extrabold font-mono text-[#09152b] mt-0.5">
                      {formatFcfa(meta.priceFcfa)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="tc-btn-primary w-full disabled:opacity-50"
          >
            <span>
              {loading
                ? "Création de votre espace..."
                : "Démarrer mes 14 jours gratuits"}
            </span>
            <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </form>

        <div className="pt-3 border-t border-[#09152b]/10 flex flex-wrap items-center justify-between gap-2 text-xs text-[#43506b]">
          <span>
            Déjà inscrit ?{" "}
            <Link
              href="/login"
              className="text-[#0a2e6e] font-bold hover:text-[#ff5c1b] hover:underline"
            >
              Se connecter ici
            </Link>
          </span>
          <Link
            href="/a/ivoire-cargo-express"
            className="text-[#0a2e6e] font-bold hover:text-[#ff5c1b] hover:underline"
          >
            Voir un portail client démo
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f6f3ec] text-[#09152b]">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:py-14">
        <Suspense
          fallback={
            <div className="text-sm font-semibold text-[#43506b]">
              Chargement du formulaire d&apos;inscription...
            </div>
          }
        >
          <RegisterFormContent />
        </Suspense>
      </main>
    </div>
  );
}
