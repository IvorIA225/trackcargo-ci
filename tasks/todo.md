# Checklist d'implémentation — TrackCargo CI Multi-Agences

## Prérequis Infrastructure

- [x] **Tâche 0 : Provisionner Neon Postgres sur Vercel et synchroniser `.env.local`**
  - **Description :** Ajouter Neon Postgres sur le projet Vercel `trackcargo-ci` (Production, Preview, Development), configurer `DATABASE_URL` et les infos d'encaissement fondateur (`FOUNDER_WHATSAPP`, `FOUNDER_OM_NUMBER`, `FOUNDER_WAVE_LINK`, `SUPER_ADMIN_EMAIL`) puis synchroniser `.env.local`.
  - **Critères d'acceptation :**
    - [x] `DATABASE_URL` présent sur Vercel (`Production`, `Preview`, `Development`) sans exposition en clair dans Git.
    - [x] Initialisation paresseuse idempotente (`ensurePgInitialized`) prête pour Neon Postgres.
  - **Vérification :** `filter_project_envs` confirmant `DATABASE_URL`, `FOUNDER_*`, `SUPER_ADMIN_EMAIL`, `TRACKCARGO_SESSION_SECRET`, `TRACKCARGO_ADMIN_PASSWORD_HASH`.
  - **Dépendances :** Aucune (bloquant avant push DB de Phase 1).

---

## Phase 1 : `persistence-db` (Fondation PostgreSQL Multi-Tenant)

- [x] **Tâche 1 : Dépendances Drizzle/Neon, schéma SQL et client paresseux**
  - **Description :** Installer `@neondatabase/serverless`, `drizzle-orm` (et `drizzle-kit` en dev), configurer `drizzle.config.ts` et définir `db/schema.ts` (`platform_settings`, `agencies`, `users`, `batches`, `parcels`, `subscription_events`) avec index sur `agency_id` et initialisation paresseuse `getDb()` / `ensurePgInitialized()` dans `db/index.ts`.
  - **Critères d'acceptation :**
    - [x] Toutes les tables disposent des clés étrangères avec `onDelete: 'cascade'` et index sur `agency_id`, `slug`, `tracking_code` et `email`.
    - [x] DDL idempotente et compatible Neon Postgres via `ensurePgInitialized()`.
  - **Vérification :** `npx tsc --noEmit`, `npm run build`.
  - **Dépendances :** Tâche 0.
  - **Fichiers :** `package.json`, `drizzle.config.ts`, `db/schema.ts`, `db/index.ts`. (`S/M` : 4 fichiers)

- [x] **Tâche 2 : Logique d'abonnement pure, seed démo idempotent et repository typé**
  - **Description :** Créer `lib/subscription.ts` (calcul `TRIAL` / `ACTIVE` / `PAST_DUE` / `SUSPENDED` et jours restants), `lib/repository.ts` (requêtes CRUD multi-agences scopées par `agencyId` + génération atomique de `TC-xxxx`) et `db/seed.ts` créant l'agence de démonstration `ivoire-cargo-express` (`TC-8841`, `TC-8842`, `TC-8843`, `TC-8844`).
  - **Critères d'acceptation :**
    - [x] `resolveEffectiveSubscription(agency, now)` couvre essai actif, essai expiré -> `PAST_DUE`, période payée expirée -> `PAST_DUE`, et suspension manuelle -> `SUSPENDED`.
    - [x] Exécuter le seed deux fois ne crée pas de doublons.
  - **Vérification :** Tests unitaires dans `tests/unit-security.test.ts` (`14/14` passés).
  - **Dépendances :** Tâche 1.
  - **Fichiers :** `lib/subscription.ts`, `lib/repository.ts`, `db/seed.ts`, `db/seed-data.ts`, `tests/unit-security.test.ts`. (`M` : 5 fichiers)

### Checkpoint 1 : Fondation DB
- [x] Schéma DDL & seed idempotent prêts pour Neon Postgres
- [x] `npm run typecheck` et `npm run test:unit` passent à 100 %

---

## Phase 2 : `identity-auth` (Inscription Self-Service & Connexion Multi-Rôles)

- [x] **Tâche 3 : Étendre les sessions HMAC multi-rôles dans `lib/auth.ts` et garde-fous**
  - **Description :** Mettre à jour `AdminSessionPayload` pour porter `{ userId, agencyId, role: "AGENCY_ADMIN" | "SUPER_ADMIN", email }` et exposer `requireAgencySession()`, `requireActiveAgencySession()` et `requireSuperAdminSession()` tout en conservant `requireAdminSession()` / vérification `scrypt`.
  - **Critères d'acceptation :**
    - [x] Cookie `httpOnly`, `SameSite=Lax`, `Secure` sur HTTPS, rejetant tout jeton altéré ou expiré.
    - [x] Séparation stricte : un `AGENCY_ADMIN` reçoit `403` sur les routes `SUPER_ADMIN`.
  - **Vérification :** Tests unitaires étendus dans `tests/unit-security.test.ts`.
  - **Dépendances :** Tâche 2.
  - **Fichiers :** `lib/auth.ts`, `lib/types.ts`, `lib/validation.ts`, `tests/unit-security.test.ts`. (`M` : 4 fichiers)

- [x] **Tâche 4 : Inscription agence en libre-service (`POST /api/auth/register` & `/register`)**
  - **Description :** Créer la route `POST /api/auth/register` (rate-limit par IP, validation stricte nom/commune/WhatsApp/email/mot de passe, génération de slug unique, création atomique agence en essai `14` jours + utilisateur `scrypt`, ouverture de session immédiate) et la page `/register` dans la charte claire *Atelier Portuaire Lumineux*.
  - **Critères d'acceptation :**
    - [x] Un prospect crée son agence en moins de 30 s et arrive directement sur `/dashboard`.
    - [x] Email dupliqué rejeté (`409`) ; deux agences de même nom reçoivent des slugs distincts (`mon-agence`, `mon-agence-2`).
  - **Vérification :** `npm run typecheck`, `npm run lint`, test inscription Playwright + E2E.
  - **Dépendances :** Tâche 3.
  - **Fichiers :** `app/api/auth/register/route.ts`, `app/register/page.tsx`, `scripts/security-audit.mjs`. (`S` : 3 fichiers)

- [x] **Tâche 5 : Connexion unifiée `/login` et `/api/auth/login` (Agence + Super-Admin)**
  - **Description :** Adapter `/api/auth/login` pour authentifier par `email + mot de passe` (utilisateur agence ou email/mot de passe fondateur `SUPER_ADMIN`), adapter `/api/auth/session` pour renvoyer `{ configured, authenticated, role, agencySlug, subscription }`, et mettre à jour `/login` avec lien vers `/register` et redirection vers `/super-admin` ou `/dashboard`.
  - **Critères d'acceptation :**
    - [x] Connexion agence ouvre `/dashboard` ; connexion fondateur ouvre `/super-admin`.
    - [x] Protection anti-brute-force `429` maintenue après 10 échecs.
  - **Vérification :** `npm run typecheck`, `npm run build`, test login agence & super-admin.
  - **Dépendances :** Tâche 4.
  - **Fichiers :** `app/api/auth/login/route.ts`, `app/api/auth/session/route.ts`, `app/login/page.tsx`. (`S` : 3 fichiers)

### Checkpoint 2 : Identité & Onboarding
- [x] Inscription `/register` et connexion `/login` fonctionnelles et vérifiées par E2E + Playwright
- [x] Rate-limit et tests auth au vert

---

## Phase 3 : `tenant-portals` (Isolation & Portails `/a/[slug]`)

- [x] **Tâche 6 : Isoler toutes les routes API d'agence sur `session.agencyId`**
  - **Description :** Brancher `/api/overview`, `/api/agency`, `/api/batches`, `/api/batches/[id]`, `/api/packages`, `/api/packages/[id]` et `/api/reset` sur `lib/repository.ts` scopé par `session.agencyId` (en réservant `/api/reset` à l'agence démo ou `SUPER_ADMIN`).
  - **Critères d'acceptation :**
    - [x] Aucun endpoint n'accepte un `agencyId` arbitraire venant du client.
    - [x] Tenter de modifier un lot ou colis d'une autre agence renvoie `404`.
  - **Vérification :** Test croisé Agence A vs Agence B + `npm run typecheck`.
  - **Dépendances :** Tâche 5.
  - **Fichiers :** `app/api/overview/route.ts`, `app/api/agency/route.ts`, `app/api/batches/**`, `app/api/packages/**`, `app/api/reset/route.ts`. (`M` : ~6 fichiers API simples)

- [x] **Tâche 7 : Portail client dédié par agence (`/a/[slug]` et `/api/public/[slug]/track`)**
  - **Description :** Créer la route API publique `GET /api/public/[slug]/track` (rate-limit IP, recherche code ou WhatsApp limitée strictement à l'agence `[slug]`, masquage PII, blocage si `SUSPENDED` tout en restant lisible si `PAST_DUE`) et la page `/a/[slug]` réutilisant [`TrackingLookup`](../components/TrackingLookup.tsx) avec l'enseigne et les coordonnées de l'agence.
  - **Critères d'acceptation :**
    - [x] `/a/ivoire-cargo-express` affiche uniquement les colis et infos Wave/OM d'Ivoire Cargo Express.
    - [x] Slug inconnu -> 404 propre ; agence `SUSPENDED` -> écran d'indisponibilité claire.
  - **Vérification :** `npm run build` + test Playwright sur `/a/ivoire-cargo-express`.
  - **Dépendances :** Tâche 6.
  - **Fichiers :** `app/api/public/[slug]/track/route.ts`, `app/a/[slug]/page.tsx`, `components/TrackingLookup.tsx`. (`S` : 3 fichiers)

- [x] **Tâche 8 : Adaptation `/track`, partage du lien `/a/[slug]` au Dashboard et CTAs vitrine**
  - **Description :** Mettre à jour `/api/track` (recherche par code unique `TC-xxxx` résolvant l'agence propriétaire si non suspendue, ou recherche téléphone sur la démo publique uniquement), afficher le lien `/a/[slug]` copiable en 1 clic dans [`DashboardPage`](../app/dashboard/page.tsx), et orienter les boutons *"Tester sur un vrai lot / Essayer 14 jours"* de [`HomePage`](../app/page.tsx) vers `/register` tout en gardant un accès démo clair.
  - **Critères d'acceptation :**
    - [x] Le gérant copie facilement son lien client `.../a/mon-agence` depuis `/dashboard`.
    - [x] Aucun débordement ni cassure du design Hero 3D / Peak sur `app/page.tsx`.
  - **Vérification :** `npm run build` + contrôle visuel Home / Dashboard / Track.
  - **Dépendances :** Tâche 7.
  - **Fichiers :** `app/api/track/route.ts`, `app/track/page.tsx`, `app/track/[code]/page.tsx`, `app/dashboard/page.tsx`, `app/page.tsx`. (`M` : 5 fichiers)

### Checkpoint 3 : Multi-Tenant & Portails Isolés
- [x] Agence A et Agence B fonctionnent en parallèle sans aucun mélange de données
- [x] `/a/[slug]` et `/track/TC-8841` vérifiés de bout en bout

---

## Phase 4 : `billing-superadmin` (Verrouillage `PAST_DUE` & Console Fondateur)

- [x] **Tâche 9 : Gestion d'abonnement `PAST_DUE` / `SUSPENDED` côté API et Dashboard**
  - **Description :** Ajouter `requireActiveAgencySession()` sur les écritures du tableau de bord (`POST/PATCH` lots, colis, profil -> HTTP `402` si `PAST_DUE`), afficher la bannière de jours restants en `TRIAL`/`ACTIVE`, et remplacer la zone d'action du `/dashboard` par l'écran de renouvellement Wave / Orange Money quand l'agence est expirée (`PAST_DUE`).
  - **Critères d'acceptation :**
    - [x] Une agence expirée voit clairement son montant FCFA et les instructions de paiement Wave / OM du fondateur.
    - [x] Toute tentative d'import ou de création API directe en `PAST_DUE` retourne `402`.
  - **Vérification :** Test E2E expiration d'une agence -> `402` + vérification `/a/[slug]` encore lisible.
  - **Dépendances :** Tâche 8.
  - **Fichiers :** `lib/auth.ts`, `app/api/batches/**`, `app/api/packages/**`, `app/dashboard/page.tsx`. (`M` : 4-5 fichiers)

- [x] **Tâche 10 : Console `/super-admin`, APIs de gestion d'abonnements et Audit Sécurité / E2E complet**
  - **Description :** Créer `/api/super-admin/agencies` et `/api/super-admin/agencies/[id]` (changer forfait, prolonger `+30` jours, suspendre / réactiver, journal `subscription_events`), construire `/super-admin` dans la charte *Atelier Portuaire Lumineux*, mettre à jour `scripts/security-audit.mjs` et `tests/security-e2e.mjs` (isolation multi-tenant, `402`, `403`, OWASP) puis vérifier et déployer sur Vercel.
  - **Critères d'acceptation :**
    - [x] Depuis `/super-admin`, activer `+30 jours` débloque immédiatement le `/dashboard` d'une agence `PAST_DUE`.
    - [x] `npm run verify:all` (`0` erreur, `0` finding) et `npm run security:scan` au vert avant déploiement.
  - **Vérification :** `npm run verify:all`, `npm run security:scan`.
  - **Dépendances :** Tâche 9.
  - **Fichiers :** `app/api/super-admin/**`, `app/super-admin/page.tsx`, `scripts/security-audit.mjs`, `tests/security-e2e.mjs`. (`M` : 4-5 fichiers)

### Checkpoint 4 : Mise en production complète
- [x] `npm run verify:all` + `npm run security:scan` au vert
- [ ] Schéma poussé/initialisé et seed exécuté sur Neon Postgres en production
- [ ] Parcours complet vérifié sur `https://trackcargo-ci.vercel.app`
