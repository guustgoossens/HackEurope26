# Handoff — Reprendre en local (Antigravity / prochain dev)

État du projet au moment de la passation pour reprendre là où Emeric en est en local.

---

## 1. Reproduire l'environnement local

### Prérequis

- **Node** : 18+ (ou Bun si tu préfères)
- **Convex** : compte ou mode local (`npx convex dev`)

### Clone + install

```bash
cd HackEurope26
bun install   # ou npm install
```

### Variables d'environnement

Fichier **`.env.local`** à la racine du projet. Les variables utilisées en local :

| Variable | Rôle | Valeur actuelle |
|----------|------|-----------------|
| `VITE_DEMO_SKIP_AUTH` | **Mode démo sans WorkOS** | `true` → landing + démo sans login |
| `VITE_CONVEX_URL` | URL du backend Convex | Déjà renseigné (cloud Convex) |
| `VITE_WORKOS_CLIENT_ID` | WorkOS (si tu réactives l'auth) | Optionnel en mode démo |
| `VITE_WORKOS_REDIRECT_URI` | Callback WorkOS | `http://localhost:5173/callback` si besoin |
| `CONVEX_DEPLOYMENT` | Déploiement Convex utilisé par `convex dev` | Déjà renseigné |

En mode démo, **WorkOS est désactivé** : pas de login, pas de `WORKOS_CLIENT_ID` requis.

> **Important :** Toujours redémarrer le serveur Vite depuis le dossier `HackEurope26` après avoir modifié `.env.local`. Sinon les variables ne sont pas chargées et le mode démo ne s'active pas — résultat : page blanche.

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
|-----|---------|
| **`/`** | **Landing** (marketing, thème clair, graph D3 hero animé, CTA « Voir la démo ») |
| **`/demo`** | **DemoIndex** : UI démo complète, 3 phases (Explorer → Structurer → Vérifier), client Convex « Cabinet Dupont & Associés » |

Comportement :

- Sur **`/`** : clic sur « Voir la démo » / zone du graph → navigation vers **`/demo`**.
- Sur **`/demo`** : bouton « Accueil » (TopNav) → retour vers **`/`**.
- Pas de router externe : géré par `useState` + `history.pushState` dans `src/DemoApp.tsx`.

**i18n** : Landing et démo sont bilingues (EN/FR). `src/i18n.ts` + `src/locales/{en,fr}.json`. `LanguageSwitcher` dans la TopNav démo et sur la landing.

---

## 3. Ce qui est en place

### Landing (`src/pages/Landing.tsx`)

Design marketing, thème clair. Sections : hero (graph D3 animé), problème, how-it-works (5 étapes), comparison (flat search vs Folio), data moat, who it's for, vision, early access.

**Graph hero** : `src/components/landing/LandingGraph.tsx` — D3 force-directed avec nœuds blob organiques (SVG paths navy `#0b172a`), liens quadratiques bezier, labels radially outward dans un layer séparé. Nœuds révélés progressivement via `gVis` state (interval de 150ms). `alphaDecay(0)` → simulation toujours active, nœuds draggables.

**Boutons landing** : classes CSS organiques (`.btn-organic`, `.btn-organic-secondary`, `.btn-organic-pill`, `.input-organic`) dans `src/index.css` — border-radius légèrement asymétrique pour un rendu handcrafted.

> Note : `src/components/landing/LandingGraphEditorial.tsx` est un SVG statique éditorial (nœuds blob + arêtes courbes, monochrome navy). Pas utilisé actuellement dans la landing, disponible si besoin d'une version sans D3.

### Démo (`/demo`)

La démo est rendue par **`src/pages/DemoIndex.tsx`** (pas `Layout + ClientDetail`). Elle a une TopNav propre (`src/components/TopNav.tsx`) et 3 phases numérotées :

#### Phase 1 — Explorer (`src/components/ExplorePhase.tsx`)

Stepper vertical 3 étapes :
1. **Connexion des sources** : cartes par source (Gmail/Drive/Sheets) avec statut de connexion et bouton « Connecter via Composio ». La connexion ouvre un popup OAuth Composio via `src/hooks/useComposioConnect.ts` (hook pleinement implémenté : crée la data source en Convex, ouvre le popup, poll jusqu'à fermeture).
2. **Exploration en cours** : barres de progression par source + log animé de découverte de fichiers.
3. **Bilan** : stats globales (éléments analysés, signalés) + CTA « Passer à la structuration ».

#### Phase 2 — Structurer

Layout : `KnowledgeGraph` (flex-1) + `AgentFeed` (w-72 droite).

**KnowledgeGraph** (`src/components/KnowledgeGraph.tsx`) : graphe D3 force-directed. Prop `cleanMode: boolean` (défaut `false`) :
- `cleanMode=false` : tous les nœuds Convex (46 nœuds de `insertDemoMessy`), répulsion forte.
- `cleanMode=true` : filtre sur `type === 'domain' || type === 'skill'` uniquement, layout plus organisé.

Animation « dirty → clean » : bouton « Structurer ▶ » déclenche un overlay de 3 lignes séquentielles (« Suppression des doublons… / Regroupement par domaine… / Validation des liens… » via setInterval), puis `cleanMode` passe à `true`.

#### Phase 3 — Vérifier

Layout : `KnowledgeGraph` (flex-1) + `VerifyPhase` (w-96 droite) — panel latéral, pas d'overlay centré.

**VerifyPhase** (`src/components/VerifyPhase.tsx`) : affiche les questions de vérification avec le **contexte de la contradiction** (sourceA, sourceB, valueA, valueB depuis `api.contradictions.listByClient`). Options en style radio-card. État final « Base vérifiée » dans le même panel.

### Backend démo (Convex — inchangé)

- **Client** : « Cabinet Dupont & Associés » (`createdBy: "demo"`).
- **Seed** : `convex/demoData.ts` — `createDemoClient` + `insertDemoMessy` (knowledge tree 46 nœuds, contradictions, data_sources, explorations, agent_events).
- **Query** : `api.clients.getDemo` récupère le client demo par `createdBy: "demo"`.
- Schéma complet : `convex/SCHEMA.md`.

### Agent pipeline (Python — inchangé)

Agents Python dans `agents/` — 4 phases (Explore → Structure → Verify → Use). Voir `docs/agent_pipeline.md`. Aucune modification dans ce PR.

---

## 4. Architecture des providers (mode démo vs auth)

### Mode démo (`VITE_DEMO_SKIP_AUTH=true`)

```
ErrorBoundary
  └── ConvexProvider
        └── div[data-demo-mode]
              └── DemoApp
                    ├── path=/ → Landing
                    └── path=/demo → DemoIndex (3 phases)
```

`AuthKitProvider` est **omis** en mode démo — il causait une page blanche (WorkOS en loading/redirect bloquait le rendu des enfants).

### Mode auth (`VITE_DEMO_SKIP_AUTH=false` ou absent)

```
ErrorBoundary
  └── AuthKitProvider
        └── ConvexProviderWithAuthKit
              └── App
                    ├── unauthenticated → Landing (sign-in CTA)
                    └── authenticated → Layout → Dashboard / ClientDetail
```

---

## 5. Réactiver WorkOS (auth)

Pour repasser en mode « avec login » :

1. Dans **`.env.local`** : `VITE_DEMO_SKIP_AUTH=false` (ou supprimer la variable).
2. Dans le **dashboard Convex** : définir `WORKOS_CLIENT_ID`.
3. Redémarrer le front.

---

## 6. Fichiers clés

| Fichier | Rôle |
|---------|------|
| `src/main.tsx` | Branchement démo / auth (providers) |
| `src/DemoApp.tsx` | Routing `/` vs `/demo`, chargement client démo, rendu Landing ou DemoIndex |
| `src/pages/DemoIndex.tsx` | UI démo 3 phases (Explorer / Structurer / Vérifier), orchestration état |
| `src/components/ExplorePhase.tsx` | Phase 1 : stepper + Composio connect |
| `src/components/KnowledgeGraph.tsx` | Phase 2/3 : graphe D3 light theme + prop cleanMode |
| `src/components/VerifyPhase.tsx` | Phase 3 : panel latéral vérification + contexte contradictions |
| `src/components/TopNav.tsx` | Barre de navigation démo (logo + phases + play/pause + retour) |
| `src/components/AgentFeed.tsx` | Feed temps réel des événements agents (Phase 2) |
| `src/components/landing/LandingGraph.tsx` | Graph D3 hero landing (nœuds blob, liens courbes) |
| `src/hooks/useComposioConnect.ts` | Hook OAuth Composio (crée data source + popup + poll) |
| `src/i18n.ts` | Config i18next (EN/FR) |
| `src/locales/{en,fr}.json` | Traductions landing + démo |
| `src/components/LanguageSwitcher.tsx` | Sélecteur langue (TopNav + landing) |
| `src/App.tsx` | App avec auth (Dashboard, ClientDetail, 5 phases) |
| `convex/clients.ts` | `getDemo`, `get` — queries clients |
| `convex/demoData.ts` | Seed démo : `createDemoClient`, `insertDemoMessy`, `insertDemoClean`, `clearDemo` |
| `convex/http.ts` | 11 endpoints HTTP pour le bridge agent Python → Convex |
| `convex/SCHEMA.md` | Documentation du schéma Convex (11 tables) |
| `docs/agent_pipeline.md` | Architecture du pipeline agent Python (4 phases, outils, LLM adapters) |
| `docs/architecture.md` | Architecture système (3 couches : frontend, Convex, Python) |
| `docs/DECISIONS.md` | Décisions techniques clés avec rationale |

---

## 7. Suite possible

- Intégrer Composio en prod (les credentials Composio ne sont pas configurés en démo — le hook gère l'erreur gracieusement).
- Ajouter un vrai router (ex. React Router) pour gérer `/`, `/demo`, et `/callback` proprement.
- Relier `DemoIndex` au pipeline agent réel : pour l'instant la Phase 1 est mockée (animationStep/exploreStep en local), les phases 2/3 sont branchées Convex.
- Auto-play démo : `isPlaying` state dans DemoIndex, progression automatique entre phases.
- Vérifier que le build Vite (`bun run build`) sert correctement la SPA avec fallback sur `/demo`.

---

*Dernière mise à jour : i18n EN/FR (landing + démo), polish composants (ExploreMetrics, AgentEventFeed, VerifyPhase, KnowledgeGraph, TopNav), 22 fév. 2026.*
