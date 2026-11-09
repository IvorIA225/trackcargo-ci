# Spécification SaaS Multi-Agences — TrackCargo CI

> Statut : **En attente de validation utilisateur** (Phase 0 Capability Map + Phase 1 Spec)

## 1. Capability Map (Découpage & Ordre de construction)

| Module ID | Responsabilité | Dépend de |
|---|---|---|
| `persistence-db` | Schéma PostgreSQL (`agencies`, `users`, `batches`, `parcels`, `subscription_events`) via `@neondatabase/serverless` + `drizzle-orm`, indexation sur `agency_id`, isolation multi-tenant | — |
| `identity-auth` | Inscription self-service (`/register` -> 1 admin par agence + essai 14j), connexion `/login` (email + mot de passe `scrypt` / accès `SUPER_ADMIN`), sessions HMAC signées portant `{ userId, agencyId, role }` | `persistence-db` |
| `tenant-portals` | Isolation stricte des routes `/api/overview`, `/api/batches`, `/api/packages`, `/api/agency` par `agency_id`, portail client dédié `/a/[slug]`, et recherche `/track` par code unique ou démo sans fuite inter-agences | `persistence-db`, `identity-auth` |
| `billing-superadmin` | Cycle d'abonnement (`TRIAL` -> `ACTIVE` -> `PAST_DUE` verrouillant `/dashboard` sur écran Wave/OM tout en gardant `/a/[slug]` lisible -> `SUSPENDED` blocage total) + console `/super-admin` en 1 clic | `persistence-db`, `identity-auth`, `tenant-portals` |

**Ordre de construction :** `persistence-db` -> `identity-auth` -> `tenant-portals` -> `billing-superadmin`

---

## 2. Objectif et Acteurs

Faire passer TrackCargo CI d'une démonstration mono-agence sur fichier local JSON (`data/trackcargo.json`) à une plateforme SaaS multi-agences hébergée sur Vercel avec base PostgreSQL persistante :

1. **Agences clientes (`AGENCY_ADMIN`) :** s'inscrivent seules sur `/register` (14 jours d'essai gratuit), accèdent à leur `/dashboard` isolé, gèrent leurs lots/colis/tarifs FCFA et partagent leur lien client dédié `/a/[slug]`.
2. **Fondateur (`SUPER_ADMIN`) :** pilote toutes les agences depuis `/super-admin`, vérifie les règlements Wave / Orange Money, active ou prolonge (+30 jours), change de forfait (`35 000` / `60 000` / `100 000 FCFA`) ou suspend manuellement une agence.
3. **Clients finaux :** suivent leurs colis sans créer de compte sur `/a/[slug]` (code colis ou WhatsApp de cette agence uniquement) ou sur `/track` (code unique `TC-xxxx` ou vitrine de démonstration).

---

## 3. Stack, Commandes & Structure Cible

- **Framework :** Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS v4.
- **Base de données cible :** PostgreSQL managé (**Neon Postgres** via Vercel Marketplace, pilote `@neondatabase/serverless` + `drizzle-orm`), avec initialisation paresseuse sûre au build (`getDb()`).
- **Commandes de validation :**
  - `npm run typecheck` (`tsc --noEmit`)
  - `npm run lint` (`eslint`)
  - `npm run test:unit` (`tsc -p tsconfig.test.json && node --test ".tmp-test/tests/**/*.test.js"`)
  - `npm run build` (`next build`)
  - `npm run test:security-e2e` (`node scripts/security-audit.mjs && node tests/security-e2e.mjs`)
  - `npm run security:scan` (`node scripts/security-audit.mjs --npm-audit`)
  - `npm run verify:all`
- **Structure ajoutée / adaptée :**
  - `db/schema.ts`, `db/index.ts`, `drizzle.config.ts`, `db/seed.ts`
  - `lib/auth.ts`, `lib/tenant-guard.ts`, `lib/subscription.ts`, `lib/repository.ts`
  - `app/register/page.tsx`, `app/a/[slug]/page.tsx`, `app/super-admin/page.tsx`
  - `app/api/auth/register/route.ts`, `app/api/public/[slug]/track/route.ts`, `app/api/super-admin/**`

---

## 4. Contrat de Sécurité, Abonnement & Style

### Cycle d'abonnement (`subscriptionStatus` + `trialEndsAt` / `currentPeriodEnd`)
- **`TRIAL` (14 jours à l'inscription) / `ACTIVE` :** accès complet à `/dashboard` et `/a/[slug]`.
- **`PAST_DUE` (essai ou mois expiré non renouvelé) :**
  - `/dashboard` et les mutations API (`POST/PATCH` lots, colis, profil) bloquent sur un écran clair affichant le montant du forfait en FCFA et les instructions Wave / Orange Money du fondateur.
  - Le lien public `/a/[slug]` reste lisible pour ne pas pénaliser les clients finaux ayant déjà un colis en cours.
- **`SUSPENDED` (décision manuelle depuis `/super-admin`) :** blocage total de `/dashboard`, des APIs et de `/a/[slug]` avec message de suspension.

### Règles d'isolation & OWASP
- Chaque requête SQL sur `batches` et `parcels` filtre impérativement par `agency_id = session.agencyId` côté serveur (jamais par un identifiant envoyé par le client).
- Les codes de suivi (`TC-xxxx` / `TC-xxxxx`) restent uniques globalement en base tout en protégeant l'isolation sur `/a/[slug]` (`WHERE agency_id = slugAgency.id`).
- Les mots de passe utilisateurs utilisent `scrypt` salé et comparaison temps constant (`crypto.timingSafeEqual`).
- Toute route `/api/*` non explicitement publique applique `requireAgencySession()` ou `requireSuperAdminSession()`, vérifiée par `scripts/security-audit.mjs`.
- Conservation complète du système visuel *Atelier Portuaire Lumineux* (`#F6F3EC` / `#0A2E6E` / `#FF5C1B`) sur toutes les pages.

```ts
// Exemple de garde serveur réutilisable pour chaque route agence
const gate = await requireActiveAgencySession(request);
if (!gate.ok) return gate.response; // 401 si non connecté, 402 si PAST_DUE/SUSPENDED
const batches = await listAgencyBatches(gate.session.agencyId);
```

---

## 5. Stratégie de Tests

- **Tests unitaires (`tests/*.test.ts`) :** hachage `scrypt`, validation de sessions multi-rôles, calcul d'état d'abonnement (`TRIAL`, `ACTIVE`, `PAST_DUE`, `SUSPENDED`), validation des slugs et entrées Excel, masquage PII.
- **Tests sécurité & E2E (`tests/security-e2e.mjs`) :** inscription agence A et agence B, tentative d'accès croisé (`agency A` vers un colis/lot de `agency B` -> `404`/`403`), expiration simulée bloquant `/dashboard` tout en gardant `/a/[slug]` lisible, activation par `SUPER_ADMIN`, vérification des en-têtes OWASP et limitation brute-force `429`.

---

## 6. Limites (Boundaries)

- **Toujours faire :** exiger `agency_id` côté serveur, valider toutes les entrées avec erreurs `422`, exécuter `npm run verify:all` avant tout commit.
- **Demander d'abord :** provisionnement de la base PostgreSQL sur Vercel, variables d'environnement de production (`DATABASE_URL`, identifiants Super-Admin), modification de tarifs publics.
- **Ne jamais faire :** exposer les listes de clients d'une agence à une autre, commiter `.env*` ou secrets, utiliser `dangerouslySetInnerHTML`, remplacer la base de production par un stockage en mémoire silencieux.

---

## 7. Critères de Réussite (Vérifiables)

1. L'inscription sur `/register` crée une agence (`slug` unique), un utilisateur `AGENCY_ADMIN` et 14 jours d'essai en PostgreSQL, puis redirige vers `/dashboard`.
2. Deux agences A et B créent des lots/colis simultanément sans jamais voir ni modifier les données l'une de l'autre.
3. `/a/[slug-A]` n'affiche que l'enseigne, les liens Wave/OM et les colis de l'agence A.
4. Une agence passée en `PAST_DUE` voit son `/dashboard` verrouillé avec écran de renouvellement Wave/OM, tandis que `/a/[slug-A]` reste lisible ; en `SUSPENDED`, tout est bloqué.
5. Depuis `/super-admin`, le fondateur prolonge une agence (+30 jours) en 1 clic et débloque immédiatement son `/dashboard`.
6. `npm run verify:all` et `npm run security:scan` passent avec `0` erreur et `0` alerte critique.
