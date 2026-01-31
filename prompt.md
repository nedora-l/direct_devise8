Je suis en train de construire un MVP pour une plateforme de financement international PME. 

ÉTAT ACTUEL :
- Build OK (après fix des erreurs react-is, Suspense, null user)
- Demo avec localStorage uniquement (pas de vraie BDD)
- Mock auth (pas de vraie authentification)
- 43 erreurs TypeScript à fixer (Vague 0)
- Code fonctionnel mais fragile

PROBLÈMES RÉCURRENTS À ÉVITER :
1. NE JAMAIS modifier des fichiers fonctionnels sans les lire COMPLETEMENT
2. NE JAMAIS dupliquer du code (vérifier l'existant avant d'ajouter)
3. NE JAMAIS faire de changements "à la va-vite" - toujours comprendre le contexte
4. Vérifier les imports et dépendances avant tout changement
5. Tester que le changement ne casse rien d'existant

STRUCTURE DU PROJET :
- Next.js 16.0.0 avec App Router
- React 19.2.0
- TypeScript avec 43 erreurs à fixer
- Components UI dans /components/ui/
- Pages PME dans /app/pme/
- Utilitaires dans /lib/

À FAIRE MAINTENANT : [VAGUE X]

VAGUE 0 - SOCLE TECHNIQUE (CRITIQUE) :
□ Lire CHAQUE fichier avec erreur TypeScript AVANT de le modifier
□ Fixer les 43 erreurs une par une sans casser la logique
□ Vérifier que npm run build fonctionne toujours
□ Vérifier que npm run dev démarre sans erreur
□ Tester toutes les pages PME après chaque changement

VAGUE 1 - INFRASTRUCTURE :
□ Setup Prisma + PostgreSQL managé (Neon/Supabase)
□ Créer schéma : User, Company, Document, Auction, Bid, Transaction
□ Implémenter NextAuth avec sessions
□ Migrer données localStorage → Postgres
□ Vérifier que l'auth fonctionne sur toutes les pages
□ Configurer env: DATABASE_URL, NEXTAUTH_SECRET, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

VAGUE 2 - OCR & DOCUMENTS :
□ Implémenter upload fichiers (local d'abord, S3 après)
□ Intégrer OCR pour lire SWIFT (Gemini Vision API)
□ Parser SWIFT : MT103, MT202, etc.
□ Calcul automatique 70/30 selon règles IGOC
□ Stocker documents avec métadonnées

VAGUE 3 - ENCHÈRES :
□ Système d'enchères multi-banques
□ Notifications WebSocket/SSE
□ Tableau de bord banques
□ Gestion des offres et contre-offres

VAGUE 4 - COMPLIANCE :
□ PEP/sanctions screening
□ Audit trails pour toutes les actions
□ Sécurité : CSRF, CSP, rate limiting
□ Conformité IGOC complète

TEST APRÈS CHAQUE VAGUE :
□ npm run build (DOIT passer)
□ npm run dev (DOIT démarrer)
□ Tester login/logout
□ Tester upload document
□ Tester création enchère
□ Tester calcul 70/30
□ Vérifier aucune régression

RAPPEL CRITIQUE :
- Lire TOUS les fichiers avant modification
- Ne JAMAIS dupliquer du code existant
- Tester chaque changement immédiatement
- Garder une copie de sauvegarde avant gros changements
- Vérifier que le build passe après chaque modification

Données BDD : DATABASE_URL Postgres managé (Neon/Supabase)

RÈGLES ABSOLUES (non négociables):
- Avant TOUTE modification: exécuter `npm run build`; si ça échoue, réparer d’abord les 43 erreurs TS
- Jamais de `any`, jamais de `!` (non-null assertion) sans justification claire et documentée
- Jamais de `console.log` qui reste en production
- À chaque patch: message clair + numéro de vague + "build OK / dev OK"
- Si un fichier n’est pas compris à 100%: demander avant d’y toucher
- Si une erreur TS vient d’une lib tierce mal typée: créer un `.d.ts` dédié au lieu de forcer

ORDRE PRIORITAIRE ACTUEL (décembre 2025):
- VAGUE 0: corriger les 43 erreurs TypeScript → rien d’autre tant que ce n’est pas à 0
- VAGUE 1 ensuite: BDD + Auth
- OCR/document ensuite: Gemini 2.5 Flash (gratuit) ou Grok si bloqué

LLM & Vision: 
Provider par défaut: OCR.space (gratuit, stable), `LLM_PROVIDER=ocrspace`
Clé: `OCR_SPACE_KEY`, endpoint `https://api.ocr.space/parse/image`, output JSON (ParsedResults)
Grok/Gemini: optionnel en fallback uniquement sur demande explicite

KYC & Scoring:
□ Adapter l’agent pour KYC/AML
□ Ajouter scoring 0-100 basé sur champs présents: nom, adresse, date, montant, UBO, signature
□ Retourner `KYC.score` et `KYC.status` pour revue admin
