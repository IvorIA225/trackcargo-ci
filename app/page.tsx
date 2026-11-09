"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import TrackingLookup from "@/components/TrackingLookup";
import { formatFcfa } from "@/lib/format";

export default function HomePage() {
  const [weeklyParcels, setWeeklyParcels] = useState(250);
  const [messagesPerParcel, setMessagesPerParcel] = useState(4);

  const weeklyMessagesAvoided = weeklyParcels * messagesPerParcel;
  const hoursSavedPerMonth = Math.round((weeklyMessagesAvoided * 2 * 4) / 60);
  const monthlyCashGain = Math.round(weeklyParcels * 4 * 500);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-slate-950 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <span>🇨🇮 Conçu pour les Transitaires & Groupages d&apos;Abidjan</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.1]">
              Arrêtez de répondre 200 fois par jour{" "}
              <span className="text-amber-400">« Mon colis est où ? »</span> sur
              WhatsApp.
            </h1>

            <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
              Offrez à vos importateurs Chine, Dubaï et Turquie → Abidjan un{" "}
              <strong className="text-white">portail de suivi en direct</strong>,
              des{" "}
              <strong className="text-white">
                alertes WhatsApp en 1 clic par conteneur
              </strong>{" "}
              et le{" "}
              <strong className="text-white">
                paiement Wave / Orange Money
              </strong>{" "}
              avant le retrait.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href="/dashboard"
                className="px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm sm:text-base text-center transition-colors shadow-lg shadow-amber-500/20"
              >
                Ouvrir le Dashboard Agence →
              </Link>
              <Link
                href="/track"
                className="px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm sm:text-base text-center border border-slate-700 transition-colors"
              >
                Tester le Suivi Client
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800/80 text-xs sm:text-sm">
              <div>
                <div className="text-xl sm:text-2xl font-black text-amber-400">
                  -85 %
                </div>
                <div className="text-slate-400">Appels & messages stressants</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-emerald-400">
                  1 clic
                </div>
                <div className="text-slate-400">Mise à jour de tout un conteneur</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-cyan-400">
                  Wave / OM
                </div>
                <div className="text-slate-400">Encaissement avant retrait</div>
              </div>
            </div>
          </div>

          {/* Live Interactive Widget */}
          <div className="lg:col-span-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Démo Interactive en Direct
                  </div>
                  <div className="text-sm text-slate-300">
                    Ce que voient vos clients sur leur téléphone :
                  </div>
                </div>
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <TrackingLookup initialQuery="TC-8841" compact />
            </div>
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 w-full">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
              Calculateur Rentabilité Agence
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950">
              Combien coûte le chaos Excel + WhatsApp à votre agence chaque mois ?
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Ajustez vos volumes hebdomadaires pour estimer le temps d&apos;équipe
              récupéré et les impayés évités grâce au suivi automatisé.
            </p>

            <div className="space-y-4 pt-2">
              <div>
                <div className="flex justify-between text-sm font-semibold mb-1">
                  <span>Colis traités par semaine</span>
                  <span className="text-amber-700 font-mono">
                    {weeklyParcels} colis/sem
                  </span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={1500}
                  step={50}
                  value={weeklyParcels}
                  onChange={(e) => setWeeklyParcels(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-sm font-semibold mb-1">
                  <span>Relances client moyennes par colis</span>
                  <span className="text-amber-700 font-mono">
                    {messagesPerParcel} messages
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={messagesPerParcel}
                  onChange={(e) => setMessagesPerParcel(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-950 text-white rounded-2xl p-6 space-y-2">
              <div className="text-xs uppercase tracking-wider text-slate-400">
                Messages évités / mois
              </div>
              <div className="text-3xl font-black text-amber-400">
                {(weeklyMessagesAvoided * 4).toLocaleString("fr-FR")}
              </div>
              <div className="text-xs text-slate-300">
                Vos clients consultent le lien de suivi au lieu d&apos;appeler.
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 space-y-2">
              <div className="text-xs uppercase tracking-wider text-emerald-700 font-semibold">
                Temps d&apos;équipe sauvé
              </div>
              <div className="text-3xl font-black text-emerald-900">
                {hoursSavedPerMonth} h / mois
              </div>
              <div className="text-xs text-emerald-800">
                L&apos;équivalent d&apos;un assistant dédié à plein temps.
              </div>
            </div>

            <div className="sm:col-span-2 bg-amber-50 border border-amber-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-amber-800 font-bold">
                  Gain de trésorerie & productivité estimé
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-950 mt-1">
                  +{formatFcfa(monthlyCashGain)} / mois
                </div>
              </div>
              <Link
                href="/dashboard"
                className="px-5 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-sm text-center whitespace-nowrap"
              >
                Tester avec mes données →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 w-full space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950">
            Tarifs Clés en Main (Côte d&apos;Ivoire)
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            Mise en ligne sous 24h avec import de votre fichier Excel actuel et
            formation de vos agents à Treichville, Adjamé ou Cocody.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Plan 1 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="text-sm font-bold text-slate-500 uppercase">
                Pack Démarreur
              </div>
              <div className="text-3xl font-black text-slate-950">
                35 000 FCFA
                <span className="text-sm font-normal text-slate-500"> /mois</span>
              </div>
              <div className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 inline-block px-2.5 py-1 rounded-md">
                + 75 000 FCFA installation unique
              </div>
              <ul className="space-y-2 text-sm text-slate-600 pt-2">
                <li>✓ Jusqu&apos;à 400 colis / mois</li>
                <li>✓ Portail de suivi personnalisé</li>
                <li>✓ Messages WhatsApp générés en 1 clic</li>
                <li>✓ Calcul automatique kg / FCFA</li>
              </ul>
            </div>
            <Link
              href="/dashboard"
              className="w-full py-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-center font-bold text-sm text-slate-900"
            >
              Essayer le Dashboard
            </Link>
          </div>

          {/* Plan 2 */}
          <div className="bg-slate-950 text-white rounded-2xl border-2 border-amber-500 p-6 flex flex-col justify-between space-y-6 shadow-xl relative">
            <span className="absolute -top-3 right-6 bg-amber-500 text-slate-950 text-xs font-extrabold px-3 py-1 rounded-full">
              Le plus vendu
            </span>
            <div className="space-y-3">
              <div className="text-sm font-bold text-amber-400 uppercase">
                Pack Pro Cargo
              </div>
              <div className="text-3xl font-black">
                60 000 FCFA
                <span className="text-sm font-normal text-slate-400"> /mois</span>
              </div>
              <div className="text-xs font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 inline-block px-2.5 py-1 rounded-md">
                + 150 000 FCFA setup & import Excel
              </div>
              <ul className="space-y-2 text-sm text-slate-300 pt-2">
                <li>✓ Colis & Conteneurs illimités</li>
                <li>✓ Mise à jour en masse par lot (1 clic)</li>
                <li>✓ Import copier-coller depuis Excel</li>
                <li>✓ Paiement Wave & Orange Money intégré</li>
                <li>✓ Reçus / Bordereaux clients imprimables</li>
              </ul>
            </div>
            <Link
              href="/dashboard"
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-center font-extrabold text-sm text-slate-950"
            >
              Démarrer la Démo Pro →
            </Link>
          </div>

          {/* Plan 3 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="text-sm font-bold text-slate-500 uppercase">
                Pack Multi-Pays Sous-Région
              </div>
              <div className="text-3xl font-black text-slate-950">
                100 000 FCFA
                <span className="text-sm font-normal text-slate-500"> /mois</span>
              </div>
              <div className="text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 inline-block px-2.5 py-1 rounded-md">
                + 300 000 FCFA déploiement marque blanche
              </div>
              <ul className="space-y-2 text-sm text-slate-600 pt-2">
                <li>✓ Multi-agences (Abidjan, Bouaké, Ouaga, Bamako)</li>
                <li>✓ Domaine dédié (track.votreagence.ci)</li>
                <li>✓ Envoi automatique API WhatsApp Cloud</li>
                <li>✓ Comptes agents & livreurs illimités</li>
              </ul>
            </div>
            <Link
              href="/dashboard"
              className="w-full py-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-center font-bold text-sm text-slate-900"
            >
              Voir l&apos;architecture
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
