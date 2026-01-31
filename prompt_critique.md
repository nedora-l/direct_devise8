go sans oublier
RAPPEL CRITIQUE :

- Lire TOUS les fichiers avant modification
- Ne JAMAIS dupliquer du code existant
- Tester chaque changement immédiatement
- Garder une copie de sauvegarde avant gros changements
- Vérifier que le build passe après chaque modification
  RÈGLES ABSOLUES (non négociables):
- Avant TOUTE modification: exécuter `npm run build`; si ça échoue, réparer d’abord les 43 erreurs TS
- Jamais de `any`, jamais de `!` (non-null assertion) sans justification claire et documentée
- Jamais de `console.log` qui reste en production
- À chaque patch: message clair + numéro de vague + "build OK / dev OK"
- Si un fichier n’est pas compris à 100%: demander avant d’y toucher
- Si une erreur TS vient d’une lib tierce mal typée: créer un `.d.ts` dédié au lieu de forcer
- Interdiction d’utiliser `localStorage`/`globalStore` pour l’état métier — tout en DB via APIs (`/api/data/*`, `/api/kyc/*`).
- Aucune mock data côté client; données dynamiques uniquement depuis la base.
  EST APRÈS CHAQUE VAGUE :
  □ npm run build (DOIT passer)
  □ npm run dev (DOIT démarrer)
  □ Tester login/logout
  □ Tester upload document
  □ Tester création enchère
  □ Tester calcul 70/30
  □ Vérifier aucune régression
  □ Scanner le repo pour `localStorage`/`globalStore` (aucune occurrence)
