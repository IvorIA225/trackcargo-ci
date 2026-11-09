"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <span className="inline-block text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
              Accès Agence Sécurisé
            </span>
            <h1 className="text-2xl font-extrabold text-slate-950">
              Connexion Espace Agence
            </h1>
            <p className="text-sm text-slate-600">
              Protégé par cookie <code className="font-mono">httpOnly</code>{" "}
              signé HMAC-SHA256 et limitation anti-brute-force.
            </p>
          </div>

          {!configured && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 space-y-1">
              <div className="font-bold">Configuration serveur requise</div>
              <p>
                Définissez <code className="font-mono">TRACKCARGO_SESSION_SECRET</code>{" "}
                et <code className="font-mono">TRACKCARGO_ADMIN_PASSWORD</code>{" "}
                (ou <code className="font-mono">TRACKCARGO_ADMIN_PASSWORD_HASH</code>) dans{" "}
                <code className="font-mono">.env.local</code> ou vos variables Vercel.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                Mot de passe administrateur agence
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Entrez votre mot de passe..."
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !configured}
              className="w-full h-11 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? "Vérification..." : "Se connecter au Dashboard →"}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-100 text-center text-xs text-slate-500">
            Client cherchant un colis ?{" "}
            <Link href="/track" className="text-amber-700 font-semibold hover:underline">
              Aller sur le suivi public
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
