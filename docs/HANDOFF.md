# Handoff — Reprendre en local (Antigravity / prochain dev)

État du projet au moment de la passation pour reprendre là où Emeric en est en local.

---

## 1. Reproduire l’environnement local

### Prérequis

- **Node** : 18+ (ou Bun si tu préfères)
- **Convex** : compte ou mode local (`npx convex dev`)

### Clone + install

```bash
cd HackEurope26
bun install   # ou npm install
```

### Variables d’environnement

Fichier **`.env.local`** à la racine du projet. Les variables utilisées en local :

| Variable | Rôle | Valeur actuelle (à garder ou adapter) |
|----------|------|----------------------------------------|
| `VITE_DEMO_SKIP_AUTH` | **Mode démo sans WorkOS** | `true` → landing + démo sans login |
| `VITE_CONVEX_URL` | URL du backend Convex | Déjà renseigné (cloud Convex) |
| `VITE_WORKOS_CLIENT_ID` | WorkOS (si tu réactives l’auth) | Optionnel en mode démo |
| `VITE_WORKOS_REDIRECT_URI` | Callback WorkOS | `http://localhost:5173/callback` si besoin |
| `CONVEX_DEPLOYMENT` | Déploiement Convex utilisé par `convex dev` | Déjà renseigné |

En mode démo, **WorkOS est désactivé** : pas de login, pas de `WORKOS_CLIENT_ID` requis pour faire tourner le front.

### Lancer le projet

```bash
bun run dev
# ou: npm run dev
```

- **Front** : http://localhost:5173  
- **Convex** : suit selon la config (cloud ou local).

---

## 2. URLs et flux (mode démo)

En local avec `VITE_DEMO_SKIP_AUTH=true` :

| URL | Contenu |
|-----|--------|
| **`/`** | **Landing** (design marketing, thème clair, graph D3 hero, CTA « Voir la démo ») |
| **`/demo`** | **App démo** : Layout + fiche client « Cabinet Dupont & Associés » branchée Convex (phases Onboard / Explore / Structure / Verify / Use, graph, agents, etc.) |

Comportement :

- Sur **`/`** : clic sur « Get Started » / « Voir la démo » ou sur la zone du graph → navigation vers **`/demo`** (pas de WorkOS).
- Sur **`/demo`** : bouton « Back to Dashboard » (ou équivalent) renvoie vers **`/`** (landing).
- Pas de router externe : tout est géré en state + `history.pushState` dans `src/DemoApp.tsx`.

À faire attention : ne pas casser la synchro URL ↔ écran (landing vs démo) si tu ajoutes des routes ou un router.

---

## 3. Ce qui est en place (design + démo)

- **Landing** (`src/pages/Landing.tsx`) : design Lovable (folio), thème clair, graph D3 hero, sections produit, CTA.
- **Démo** : même code que l’app « réelle » (Layout + `ClientDetail`), mais alimentée par le **client démo Convex** (sans auth).
- **Backend démo** :
  - `convex/clients.ts` : `getDemo` (query) + `createDemo` (mutation) pour un client `createdBy: "demo"` avec données minimales (sources, explorations, knowledge tree, agent events, questionnaire).
- **Design de la démo** : la page démo **est** la page app (Layout sombre + ClientDetail avec graph D3, ExploreVisualization, NodeDetailPanel, Verify questionnaire, etc.). Le « design de la démo » = ce que tu vois sur **`/demo`** (pas un second design à part).

---

## 4. Réactiver WorkOS (auth)

Pour repasser en mode « avec login » :

1. Dans **`.env.local`** : `VITE_DEMO_SKIP_AUTH=false` (ou supprimer la variable).
2. Dans le **dashboard Convex** : définir `WORKOS_CLIENT_ID` (et éventuellement les autres variables WorkOS si besoin).
3. Redémarrer le front.

Alors : **`/`** affiche la landing, et « Get Started » déclenche le flux WorkOS (redirect, callback, puis app authentifiée avec Dashboard → clients).

---

## 5. Fichiers utiles pour la suite

- **`src/main.tsx`** : choix entre mode démo (`DemoApp`) et mode auth (`App` + WorkOS).
- **`src/DemoApp.tsx`** : routing landing vs démo (`/` vs `/demo`), chargement du client démo, rendu `ClientDetail`.
- **`src/App.tsx`** : app avec auth (Dashboard, ClientDetail, etc.).
- **`convex/clients.ts`** : `getDemo`, `createDemo` (données démo).
- **`docs/README.md`** : contexte produit et vision.
- **`CLAUDE.md`** : commandes, archi, conventions Convex.

---

## 6. Suite possible (idées)

- Ajouter un vrai router (ex. React Router) et garder `/` et `/demo` propres.
- Réactiver WorkOS en prod / pour certains environnements tout en gardant le mode démo en dev.
- Enrichir les données démo (`createDemo`) ou le seed pour des scénarios de démo plus poussés.
- Vérifier que le déploiement (Vite build + Convex) sert bien la landing en `/` et la démo en `/demo` (config serveur / SPA fallback).

---

*Dernière mise à jour : handoff Emeric → Antigravity (Google).*
