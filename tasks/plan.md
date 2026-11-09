# Plan d'implémentation : TrackCargo CI — SaaS Multi-Agences

> Basé sur [docs/SPEC-multitenant.md](../docs/SPEC-multitenant.md)

## Vue d'ensemble

Passage de TrackCargo CI d'une démonstration mono-agence (`data/trackcargo.json`) à une plateforme SaaS multi-agences persistante sous **PostgreSQL (Neon Postgres sur Vercel)** via `@neondatabase/serverless` et `drizzle-orm`, avec inscription self-service en essai 14 jours (`/register`), isolation stricte par agence, portails publics dédiés (`/a/[slug]`), verrouillage automatique `PAST_DUE` à l'échéance et console fondateur `/super-admin` en 1 clic pour les validations Wave / Orange Money.

## Décisions d'architecture clés

1. **Stockage PostgreSQL managé :** Neon Postgres + `@neondatabase/serverless` + `drizzle-orm` avec initialisation paresseuse `getDb()` sûre au moment de `next build` (zéro appel DB au top-level).
2. **Modèle de données strictement cloisonné :** tables `agencies`, `users`, `batches`, `parcels`, `subscription_events`. Toute requête ou mutation agence côté serveur porte `WHERE agency_id = session.agencyId` issu exclusivement du cookie HMAC signé, jamais du payload client.
3. **Comptes et rôles :** 1 compte `AGENCY_ADMIN` (email + mot de passe haché `scrypt`) par agence au lancement, plus rôle `SUPER_ADMIN` dédié au fondateur (email fondateur ou mot de passe maître `TRACKCARGO_ADMIN_PASSWORD_HASH` existant pour préserver la compatibilité opérationnelle).
4. **Règle d'expiration :**
   - `TRIAL` (14 jours) ou `ACTIVE` : accès total.
   - `PAST_DUE` : `/dashboard` et APIs d'écriture répondent `402` et affichent l'écran Wave / Orange Money ; `/a/[slug]` reste lisible en consultation pour les clients existants.
   - `SUSPENDED` (action manuelle `/super-admin`) : blocage complet du dashboard et de `/a/[slug]`.
5. **Cohabitation tests unitaires / CI locale :** les tests unitaires hors base réseau gardent des tests purs (`auth`, `validation`, `rate-limit`, `subscription`, `masking`) sans dépendre d'un serveur Postgres distant, tandis que les scripts de migration/E2E valident les requêtes SQL et les routes HTTP.

## Ordre d'exécution et points de contrôle

- **Prérequis infra (Gate avant Phase 1 code DB) :** Création de la base **Neon Postgres** sur Vercel (`ivoria225s-projects/trackcargo-ci`) injectant `DATABASE_URL` en Production / Preview / Development, et récupération locale dans `.env.local`.
- **Phase 1 (`persistence-db`) :** Tâches 1 à 2 -> Checkpoint Fondation DB.
- **Phase 2 (`identity-auth`) :** Tâches 3 à 5 -> Checkpoint Authentification multi-tenant & Inscription libre.
- **Phase 3 (`tenant-portals`) :** Tâches 6 à 8 -> Checkpoint Isolation agences & Portails `/a/[slug]`.
- **Phase 4 (`billing-superadmin`) :** Tâches 9 à 10 -> Checkpoint Abonnement Wave/OM, `/super-admin`, Audit sécurité & Déploiement Vercel.

## Risques et mesures d'atténuation

| Risque | Impact | Mesure d'atténuation |
|---|---|---|
| Fuite inter-agences (IDOR) sur lots ou colis | Critique | Aucune route API ne lit `agencyId` du body ; filtrage systématique `and(eq(table.id, id), eq(table.agencyId, session.agencyId))`. |
| Échec `next build` si `DATABASE_URL` absente au build | Élevé | `getDb()` initialisé paresseusement à l'exécution des requêtes uniquement. |
| Collision de codes `TC-xxxx` entre deux agences | Moyen | Contrainte `UNIQUE` sur `parcels.tracking_code` en base avec génération à 5 ou 6 chiffres si besoin + retry. |
| Érosion du style visuel *Atelier Portuaire Lumineux* | Moyen | Aucun changement sur le Hero 3D/Peak d'accueil hors liens d'inscription ; nouvelles pages (`/register`, `/a/[slug]`, `/super-admin`) strictement calquées sur `#F6F3EC`, `#0A2E6E` et `#FF5C1B`. |

## Liste ordonnée des tâches

Voir la checklist détaillée (critères d'acceptation, vérification et dépendances) dans [tasks/todo.md](todo.md).
