"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.configured === "boolean") {
          setConfigured(data.configured);
        }
        if (data.authenticated) {
          router.replace(data.redirectTo || "/dashboard");
        }
      })
      .catch(() => {});
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Connexion refusée.");
        return;
      }
      router.replace(data.redirectTo || "/dashboard");
    } catch {
      setError("Erreur réseau lors de la connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f3ec] text-[#09152b]">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-[16px] border border-[#09152b]/16 shadow-[var(--sc-e3)] p-6 sm:p-8 space-y-6">
          <div className="space-y-2.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-[0.06em] text-emerald-900 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-[6px]">
              <ShieldCheck
                className="w-3.5 h-3.5 text-emerald-700"
                aria-hidden="true"
              />
              <span>Accès agence sécurisé</span>
            </span>
            <h1 className="sc-display sc-display--md text-[#09152b] font-bold">
              Connexion à votre espace
            </h1>
            <p className="text-sm text-[#43506b] leading-relaxed">
              Connectez-vous avec l&apos;adresse email et le mot de passe de
              votre agence TrackCargo CI.
            </p>
          </div>

          {!configured && (
            <div className="p-3.5 rounded-[10px] bg-amber-50 border border-amber-400 text-xs text-amber-950 space-y-1">
              <div className="font-bold text-amber-900">
                Configuration serveur requise
              </div>
              <p>
                Définissez{" "}
                <code className="font-mono">TRACKCARGO_SESSION_SECRET</code> dans{" "}
                <code className="font-mono">.env.local</code> ou vos variables
                Vercel.
              </p>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-[10px] bg-rose-50 border border-rose-400 text-sm text-rose-900 font-semibold"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-mono font-bold uppercase tracking-[0.05em] text-[#43506b] mb-1.5"
              >
                Adresse email professionnelle
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="contact@monagence.ci"
                className="w-full h-11 px-3.5 rounded-[8px] border border-[#09152b]/22 bg-[#f6f3ec] text-[#09152b] placeholder:text-[#5c6a84] focus:outline-none focus:ring-2 focus:ring-[#0a2e6e] focus:border-[#0a2e6e] text-sm"
                required
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-mono font-bold uppercase tracking-[0.05em] text-[#43506b] mb-1.5"
              >
                Mot de passe
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Entrez votre mot de passe"
                className="w-full h-11 px-3.5 rounded-[8px] border border-[#09152b]/22 bg-[#f6f3ec] text-[#09152b] placeholder:text-[#5c6a84] focus:outline-none focus:ring-2 focus:ring-[#0a2e6e] focus:border-[#0a2e6e] text-sm"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !configured}
              className="tc-btn-primary w-full disabled:opacity-50"
            >
              <span>{loading ? "Vérification..." : "Se connecter"}</span>
              <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </form>

          <div className="pt-3 border-t border-[#09152b]/10 space-y-2 text-center text-xs text-[#43506b]">
            <div>
              Pas encore de compte agence ?{" "}
              <Link
                href="/register"
                className="text-[#0a2e6e] font-bold hover:text-[#ff5c1b] hover:underline"
              >
                Essayer 14 jours gratuits
              </Link>
            </div>
            <div>
              Client cherchant un colis ?{" "}
              <Link
                href="/track"
                className="text-[#0a2e6e] font-bold hover:text-[#ff5c1b] hover:underline"
              >
                Aller sur le suivi public
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
