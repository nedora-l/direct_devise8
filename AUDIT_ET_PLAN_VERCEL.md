# Audit global + Plan déploiement Vercel

## Ce qui s’est passé / Problème éventuel

- **Base de données** : Le projet peut tourner en local avec SQLite (`prisma/schema.prisma` → `provider = "sqlite"`) ou avec PostgreSQL (Neon) si `DATABASE_URL` est défini. Le `lib/db.ts` utilise l’adapter PostgreSQL **uniquement** quand l’URL commence par `postgres`/`postgresql`, sinon Prisma utilise le client par défaut (SQLite si c’est le provider du schema). Donc en local sans `DATABASE_URL` ou avec un fichier SQLite, ça utilise la base locale. Aucun bug particulier si la config est cohérente.
- **Déploiement** : Pour Vercel, il faut une base **PostgreSQL** (ex. Neon). Le schema actuel est en `sqlite` → il faudra soit repasser en `postgresql` pour la prod, soit avoir deux configs (voir plan ci‑dessous).

---

## Audit global

### Ce qui marche

| Élément | État |
|--------|------|
| Next.js 16 + App Router | OK |
| Prisma (client généré, migrations) | OK |
| Auth NextAuth (credentials, JWT) | OK |
| Routes PME / Admin / Bank | OK |
| API health, KYC, SWIFT, auctions, register, etc. | OK |
| Middleware (protection routes, KYC redirect) | OK |
| Base locale SQLite | OK (schema actuel) |
| Base Neon (si DATABASE_URL postgres) | OK (db.ts gère les deux) |
| OCR / extraction (OCR_SPACE_KEY, GEMINI, etc.) | OK si clés configurées |
| Dossier `testing_files` | Présent (fichiers pour tests) |

### Ce qui manque ou bloque pour Vercel

| Élément | Problème |
|---------|----------|
| **Build Vercel** | Pas de `postinstall` ni `prisma generate` dans le script `build` → risque d’échec au build si le client Prisma n’est pas généré. |
| **Schema Prisma** | Actuellement `provider = "sqlite"`. Sur Vercel il faut PostgreSQL → schema en `postgresql` + `DATABASE_URL` Neon. |
| **Variables d’environnement** | Sur Vercel il faut au minimum : `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`. Optionnel : `GEMINI_API_KEY`, `OCR_SPACE_KEY`. |
| **Fichiers de test** | Aucune page ni API pour que les testeurs téléchargent les fichiers du dossier `testing_files`. |
| **vercel.json** | Absent (optionnel mais utile pour build/redirects). |

### Ce qui est optionnel

- **Agent ventilation** : Non déployé sur Vercel (serveur Node séparé). L’app a un fallback OCR / Gemini, donc pas bloquant.
- **Supabase** : Variables présentes dans `.env.local` mais pas obligatoires pour le cœur MVP (auth = NextAuth).

---

## Plan d’action

### 1. Déploiement Vercel (ordre recommandé)

1. **Prisma pour la prod**
   - Mettre `provider = "postgresql"` dans `prisma/schema.prisma` (datasource `db`).
   - Garder `DATABASE_URL` pour l’URL Neon (déjà prévu dans `prisma.config.ts` / env).

2. **Build**
   - Dans `package.json`, ajouter un script `postinstall` : `"postinstall": "prisma generate"`.
   - Ou modifier le script `build` : `"build": "prisma generate && next build"`.
   - Ainsi Vercel génère le client Prisma à chaque build.

3. **Variables d’environnement sur Vercel**
   - **Obligatoire** :  
     - `DATABASE_URL` = URL de connexion Neon (celle que tu as).  
     - `NEXTAUTH_SECRET` = chaîne aléatoire (ex. `openssl rand -base64 32`).  
     - `NEXTAUTH_URL` = URL du site (ex. `https://ton-projet.vercel.app`).
   - **Optionnel** : `GEMINI_API_KEY`, `OCR_SPACE_KEY`, etc. si tu veux les mêmes features qu’en local.

4. **Migrations**
   - Après le premier déploiement, lancer une fois (en local avec `DATABASE_URL` = Neon) :  
     `npx prisma migrate deploy`  
   - Pour automatiser plus tard : ajouter un script `prisma:migrate:deploy` et l’appeler en post‑deploy (ou via CI) si tu veux.

5. **Optionnel : vercel.json**
   - Créer `vercel.json` si tu as besoin de redirects, headers, ou d’un build command personnalisé (sinon les réglages ci‑dessus suffisent).

### 2. Section “Fichiers de test” pour les testeurs

- **Objectif** : Une page où les testeurs peuvent voir et télécharger les fichiers du dossier `testing_files` (PDF, TXT, etc.).
- **Implémentation proposée** :
  1. **API** :  
     - `GET /api/test-files` → liste des noms/fichiers disponibles (lecture du dossier `testing_files`).  
     - `GET /api/test-files/[filename]` → sert le fichier (stream ou redirect) pour téléchargement.  
  2. **Page** :  
     - Une route publique (ex. `/fichiers-de-test` ou `/testeurs`) qui affiche la liste des fichiers avec un lien “Télécharger” vers l’API ci‑dessus.  
  3. **Middleware** :  
     - Ajouter cette route dans les chemins exclus du middleware (comme `/login`, `/`) pour qu’elle soit accessible sans auth.
  4. **Nav / lien** :  
     - Lien depuis la home ou le footer vers “Fichiers de test” pour que les testeurs y accèdent facilement.

---

## Résumé

- **Problème potentiel** : Pas de “bug” évident ; le flou vient surtout de la double config SQLite (local) vs PostgreSQL (Vercel). En alignant le schema sur PostgreSQL et en configurant bien le build + env, le déploiement devient possible.
- **Pour déployer** : Schema `postgresql`, `postinstall` ou `prisma generate` dans le build, env Vercel (DATABASE_URL, NEXTAUTH_*), puis `prisma migrate deploy` une fois sur la base Neon.
- **Pour les testeurs** : Ajout d’une section “Fichiers de test” (page + API de liste/téléchargement) et d’un lien depuis l’accueil.
