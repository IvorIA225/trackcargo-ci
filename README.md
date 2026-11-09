# TrackCargo CI — SaaS Suivi Groupage & Agents Cloud 24/7 (Côte d'Ivoire)

Application Web B2B sécurisée pour les agences de groupage et transitaires **Chine / Dubaï / Turquie → Abidjan**, équipée d'agents autonomes Cloud 24/7 (Qualité & Cybersécurité) avec rapports sur **Telegram**.

## Architecture de sécurité appliquée (OWASP)

- **Authentification administrateur** ([`lib/auth.ts`](lib/auth.ts), [`app/login/page.tsx`](app/login/page.tsx)) :
  - Sessions signées HMAC-SHA256 stockées dans un cookie `httpOnly`, `sameSite=lax` (`secure` en production).
  - Mots de passe hachés via `scrypt` (`TRACKCARGO_ADMIN_PASSWORD_HASH`) et comparaison temps constant (`timingSafeEqual`).
  - Comportement *fail-closed* : toutes les routes d'écriture (`/api/overview`, `PATCH /api/agency`, `/api/batches/*`, `/api/packages/*`, `/api/reset`) exigent une session valide (`401`) et renvoient `503` si les secrets serveur ne sont pas configurés.
- **Anti-Brute-Force & Rate Limiting** ([`lib/rate-limit.ts`](lib/rate-limit.ts)) :
  - Limitation par IP sur `POST /api/auth/login` (`10` tentatives / 15 min → `429`) et `GET /api/track` (`30` requêtes / min → `429`).
- **Minimisation des données publiques (PII)** ([`lib/store.ts`](lib/store.ts)) :
  - `/api/track` masque le téléphone (`+22507••••56`) et le nom complet (`Awa K.`) et bloque l'énumération sur numéros partiels (`< 8` chiffres).
  - `GET /api/agency` n'expose que les informations publiques de vitrine.
- **Validation stricte & En-têtes HTTP** ([`lib/validation.ts`](lib/validation.ts), [`next.config.ts`](next.config.ts)) :
  - Liens Wave strictement contraints à `https://` (blocage XSS `javascript:`).
  - `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Strict-Transport-Security`, `poweredByHeader: false`.

## Lancement local

```bash
npm install
npm run setup:env   # génère .env.local si absent
npm run dev
```

Pages principales :
- `/` — Page commerciale B2B + calculateur ROI + widget suivi démo
- `/track` — Portail client public (code `TC-8841` ou téléphone complet)
- `/login` — Connexion sécurisée à l'espace agence
- `/dashboard` — Espace agence protégé (lots 1-clic, alertes WhatsApp, import Excel, Mode Démo Terrain)

## Vérifications locales complètes

```bash
npm run verify:all
```
Exécute successivement : `typecheck`, `lint`, `test:unit`, `build`, `security-audit.mjs` et la suite d'intrusion E2E `tests/security-e2e.mjs`.

## Activer les 2 Agents Cloud 24/7 + Rapports Telegram (PC éteint)

Les workflows sont prêts dans `.github/workflows/` :
1. **`qa-continuous-agent.yml`** : tourne toutes les 6 heures (`0 */6 * * *`) + à chaque push/PR. Vérifie types, lint, tests unitaires, build, E2E et crée une PR vérifiée si `GEMINI_API_KEY` ou `OPENAI_API_KEY` est configurée.
2. **`cybersecurity-agent.yml`** : tourne toutes les 6 heures en décalé (`30 */6 * * *`). Exécute `security-audit.mjs --npm-audit`, scan statique OWASP, tests d'intrusion `401`/`422`/`429` et crée une PR sécurité si anomalie corrigeable.
3. **`dependabot.yml`** : ouvre chaque lundi des PR pour mettre à jour les dépendances vulnérables.

### Secrets à ajouter sur GitHub (`Settings → Secrets and variables → Actions`) :
- `TELEGRAM_BOT_TOKEN` : token donné par `@BotFather` sur Telegram.
- `TELEGRAM_CHAT_ID` : votre identifiant chat Telegram (obtenu via `@userinfobot`).
- `GEMINI_API_KEY` *(ou `OPENAI_API_KEY`)* : permet à l'agent de rédiger et tester automatiquement des Pull Requests correctives.
