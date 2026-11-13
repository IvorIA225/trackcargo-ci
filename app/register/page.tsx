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
import BrandLogo from "@/components/BrandLogo";
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
      {/* Left Value Panel — Deep Atlantic Slate */}
      <aside className="relative overflow-hidden lg:col-span-5 bg-[#0d1522] text-white rounded-[20px] border border-white/10 shadow-[0_24px_54px_-16px_rgba(13,21,34,0.28)] p-6 sm:p-7 space-y-5">
        <div
          className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-[#c9410e]/20 blur-3xl"
          aria-hidden="true"
        />
        <span className="relative inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-[0.06em] px-3 py-1 rounded-full bg-[#c9410e] text-white">
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          <span>14 jours gratuits</span>
        </span>
        <div className="relative space-y-2">
          <h1 className="sc-display sc-display--md text-white font-bold">
            Lancez le portail de votre agence en 2 minutes.
          </h1>
          <p className="text-sm text-[#cbd5e1] leading-relaxed">
            Aucune carte bancaire requise pour démarrer. Importez vos premiers
            colis et partagez immédiatement votre lien client personnalisé.
          </p>
        </div>

        <ul className="relative space-y-3 text-sm text-[#f1f5f9] pt-1">
          <li className="flex items-start gap-2.5">
            <Check
              className="w-4 h-4 text-[#f0642d] shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>
              Page de suivi dédiée à votre nom (<code className="font-mono text-[#fde68a]">/a/votre-agence</code>)
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <Check
              className="w-4 h-4 text-[#f0642d] shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>
              Mises à jour de masse par conteneur et alertes WhatsApp prêtes
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <Check
              className="w-4 h-4 text-[#f0642d] shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>
              Zéro commission sur vos encaissements Wave Business et Orange Money
            </span>
          </li>
        </ul>

        <div className="relative pt-4 border-t border-white/12 space-y-2.5">
          <div className="flex items-center gap-2">
            <BrandLogo brand="wave" size="sm" decorative />
            <BrandLogo brand="orange-money" size="sm" decorative />
            <BrandLogo brand="whatsapp" size="sm" decorative />
          </div>
          <p className="text-xs text-[#cbd5e1]">
            À la fin des 14 jours d&apos;essai, réglez facilement par Wave ou
            Orange Money sans interruption pour vos clients.
          </p>
        </div>
      </aside>

      {/* Right Registration Card */}
      <div className="lg:col-span-7 bg-white rounded-[20px] border border-[#0d131d]/10 shadow-[0_22px_50px_-18px_rgba(13,21,34,0.14)] p-5 sm:p-8 space-y-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-[0.06em] text-emerald-900 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            <ShieldCheck
              className="w-3.5 h-3.5 text-emerald-700"
              aria-hidden="true"
            />
            <span>Compte administrateur agence</span>
          </div>
          <h2 className="font-[family-name:var(--font-archivo)] text-2xl font-bold text-[#0d131d] pt-1">
            Créer mon espace TrackCargo CI
          </h2>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-[12px] bg-rose-50 border border-rose-300 text-sm text-rose-900 font-semibold"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="reg-agency-name"
                className="block text-xs font-mono font-bold uppercase tracking-[0.05em] text-[#525e70] mb-1.5"
              >
                Nom de votre agence
              </label>
              <input
                id="reg-agency-name"
                type="text"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                placeholder="ex: Horizon Cargo CI"
                className="w-full h-11 px-3.5 rounded-[12px] border border-[#0d131d]/14 bg-[#f7f6f2] text-[#0d131d] placeholder:text-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#c9410e] text-sm"
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
                className="block text-xs font-mono font-bold uppercase tracking-[0.05em] text-[#525e70] mb-1.5"
              >
                Commune / Ville
              </label>
              <input
                id="reg-commune"
                type="text"
                value={commune}
                onChange={(e) => setCommune(e.target.value)}
                placeholder="Treichville, Adjamé, Marcory..."
                className="w-full h-11 px-3.5 rounded-[12px] border border-[#0d131d]/14 bg-[#f7f6f2] text-[#0d131d] placeholder:text-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#c9410e] text-sm"
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
                className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-[0.05em] text-[#525e70] mb-1.5"
              >
                <BrandLogo brand="whatsapp" size="xs" decorative />
                <span>WhatsApp agence</span>
              </label>
              <input
                id="reg-whatsapp"
                type="text"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                placeholder="+2250708123456"
                className="w-full h-11 px-3.5 rounded-[12px] border border-[#0d131d]/14 bg-[#f7f6f2] text-[#0d131d] placeholder:text-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#c9410e] text-sm font-mono"
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
                className="block text-xs font-mono font-bold uppercase tracking-[0.05em] text-[#525e70] mb-1.5"
              >
                Nom du gérant
              </label>
              <input
                id="reg-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="ex: Seydou Diallo"
                className="w-full h-11 px-3.5 rounded-[12px] border border-[#0d131d]/14 bg-[#f7f6f2] text-[#0d131d] placeholder:text-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#c9410e] text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="reg-email"
                className="block text-xs font-mono font-bold uppercase tracking-[0.05em] text-[#525e70] mb-1.5"
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
                className="w-full h-11 px-3.5 rounded-[12px] border border-[#0d131d]/14 bg-[#f7f6f2] text-[#0d131d] placeholder:text-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#c9410e] text-sm"
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
                className="block text-xs font-mono font-bold uppercase tracking-[0.05em] text-[#525e70] mb-1.5"
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
                className="w-full h-11 px-3.5 rounded-[12px] border border-[#0d131d]/14 bg-[#f7f6f2] text-[#0d131d] placeholder:text-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#c9410e] text-sm"
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
            <div className="block text-xs font-mono font-bold uppercase tracking-[0.05em] text-[#525e70] mb-2">
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
                    className={`text-left p-3 rounded-[12px] border transition-all cursor-pointer ${
                      selected
                        ? "bg-[#fff4ee] border-[#c9410e] ring-2 ring-[#c9410e]/25"
                        : "bg-[#f7f6f2] border-[#0d131d]/12 hover:border-[#0d131d]/30"
                    }`}
                  >
                    <div
                      className={`text-xs font-mono font-bold uppercase ${
                        selected ? "text-[#c9410e]" : "text-[#525e70]"
                      }`}
                    >
                      {meta.label}
                    </div>
                    <div className="text-sm font-bold font-mono text-[#0d131d] mt-0.5">
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

        <div className="pt-3 border-t border-[#0d131d]/10 flex flex-wrap items-center justify-between gap-2 text-xs text-[#525e70]">
          <span>
            Déjà inscrit ?{" "}
            <Link
              href="/login"
              className="text-[#0d1522] font-bold hover:text-[#c9410e] hover:underline"
            >
              Se connecter ici
            </Link>
          </span>
          <Link
            href="/a/ivoire-cargo-express"
            className="text-[#0d1522] font-bold hover:text-[#c9410e] hover:underline"
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
    <div className="min-h-screen flex flex-col bg-[#f7f6f2] text-[#0d131d]">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <Suspense
          fallback={
            <div className="text-sm font-semibold text-[#525e70]">
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
