"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";

export default function LoginPage() {
  const router = useRouter();
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
          router.replace("/dashboard");
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
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Connexion refusée.");
        return;
      }
      router.replace("/dashboard");
    } catch {
      setError("Erreur réseau lors de la connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0d12] text-[#f3f1ec]">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-[#121721] rounded-[14px] border border-white/15 shadow-2xl p-6 sm:p-8 space-y-6">
          <div className="space-y-2.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-[0.06em] text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-[6px]">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Accès agence protégé</span>
            </span>
            <h1 className="sc-display sc-display--md text-[#f3f1ec]">
              Connexion espace agence
            </h1>
            <p className="text-sm text-[#9ca6b8] leading-relaxed">
              Session protégée par cookie <code className="font-mono text-[#d6dce7]">httpOnly</code>{" "}
              signé HMAC-SHA256 et limitation anti-brute-force.
            </p>
          </div>

          {!configured && (
            <div className="p-3.5 rounded-[10px] bg-amber-950/50 border border-amber-500/40 text-xs text-amber-100 space-y-1">
              <div className="font-bold text-[#e89b2d]">Configuration serveur requise</div>
              <p>
                Définissez <code className="font-mono">TRACKCARGO_SESSION_SECRET</code>{" "}
                et <code className="font-mono">TRACKCARGO_ADMIN_PASSWORD</code>{" "}
                (ou <code className="font-mono">TRACKCARGO_ADMIN_PASSWORD_HASH</code>) dans{" "}
                <code className="font-mono">.env.local</code> ou vos variables Vercel.
              </p>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-[10px] bg-rose-950/60 border border-rose-500/40 text-sm text-rose-200 font-medium"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-mono font-semibold uppercase tracking-[0.05em] text-[#b6c0d0] mb-1.5"
              >
                Mot de passe administrateur agence
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Entrez votre mot de passe"
                className="w-full h-11 px-3.5 rounded-[8px] border border-white/20 bg-[#0b0f17] text-[#f3f1ec] placeholder:text-[#7f8ba0] focus:outline-none focus:ring-2 focus:ring-[#e89b2d] focus:border-[#e89b2d] text-sm"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !configured}
              className="tc-btn-primary w-full disabled:opacity-50"
            >
              <span>{loading ? "Vérification..." : "Ouvrir l'espace agence"}</span>
              <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </form>

          <div className="pt-3 border-t border-white/10 text-center text-xs text-[#9ca6b8]">
            Client cherchant un colis ?{" "}
            <Link
              href="/track"
              className="text-[#e89b2d] font-semibold hover:underline"
            >
              Aller sur le suivi public
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
