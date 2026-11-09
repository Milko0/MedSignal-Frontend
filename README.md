# MedSignal Frontend

Vue 3 single-page application of **MedSignal v2**. It shows drug safety signals, shortages and alternatives, and lets registered users follow medicines and manage alerts.
JavaScript only (no TypeScript); models are documented with JSDoc `@typedef`.

> Every screen that shows a signal, label gap or statistic displays the disclaimer: adverse event reports are voluntary and unverified and do not prove that a drug caused a reaction (NFR-11).

## 1. Architecture

The frontend mirrors the backend's clean architecture. Dependencies point inward.

| Layer | Folder | Responsibility | May import | Never imports |
|---|---|---|---|---|
| Domain | `src/domain` | Models (JSDoc typedefs) and pure rules: `signalSeverity`, `isEmerging`, `shortageStatus` | nothing | Vue, Axios, Pinia |
| Application | `src/application` | Services (use-case logic) and Pinia stores (UI state) | domain, core | Axios, components |
| Infrastructure | `src/infrastructure` | Axios client (JWT header, 401 handling), API adapters, mappers, token storage | core, domain | presentation |
| Presentation | `src/presentation` | Views, layouts, components, charts, router with guards, styles, composables | application, core | infrastructure |
| Core | `src/core` | API base URL, constants (disclaimer, status palette) | - | - |

`src/composition/container.js` is the **composition root**: the only file that wires the concrete API adapters into the services.
Data flow: view -> store -> service -> API adapter -> backend `/api/v1`. Mappers convert the API's snake_case JSON into camelCase domain models.

## 2. Folder structure

```
MedSignal-Frontend/
├── index.html  vite.config.js  jsconfig.json  package.json  .env.example
├── Dockerfile  nginx.conf
├── src/
│   ├── main.js                      # Creates the app, Pinia and the router
│   ├── App.vue
│   ├── composition/container.js     # Composition root
│   ├── core/
│   │   ├── config/env.js            # API base URL
│   │   └── constants/               # disclaimer.js, status.js (teal / amber / coral / green map)
│   ├── domain/
│   │   ├── models/                  # drug, signal, shortage, label, alert, user (JSDoc typedefs)
│   │   └── rules/                   # signalSeverity.js, shortageStatus.js, isEmerging.js
│   ├── application/
│   │   ├── services/                # authService, drugService, signalService, cabinetService, profileService
│   │   └── stores/                  # useAuthStore, useDrugStore, useSignalStore, useCabinetStore, useUiStore
│   ├── infrastructure/
│   │   ├── http/httpClient.js       # Axios, JWT header, 401 handling
│   │   ├── api/                     # authApi, drugsApi, signalsApi, statisticsApi, cabinetApi, profileApi
│   │   ├── mappers/                 # drugMapper, signalMapper, alertMapper
│   │   └── storage/tokenStorage.js
│   └── presentation/
│       ├── router/                  # index.js, routes.js, guards.js (guest vs authenticated)
│       ├── layouts/                 # AppLayout (navbar + footer), AuthLayout
│       ├── views/                   # AuthView, DashboardView, DrugDetailView,
│       │                            # SignalsView, MedicineCabinetView, ProfileView
│       ├── components/
│       │   ├── common/              # AppNavbar, AlertBell, StatusChip, DisclaimerFooter, ToggleSwitch
│       │   ├── drug/                # DrugSearchBox, DrugHeader, ShortageStatusCard, RecallsCard
│       │   ├── signals/             # FilterBar, SignalTable, PRRBadge, LabelGapChip
│       │   ├── shortages/           # AlternativesTable
│       │   ├── cabinet/             # FollowedDrugRow, AlertList
│       │   └── charts/              # PlotlyChart, plotlyTheme, ReactionBars, TrendChart, DonutChart, AgeBarChart
│       ├── composables/             # useDebouncedSearch.js, useAsyncState.js
│       └── styles/                  # tokens.css (palette), base.css
└── tests/ {unit, components}        # Vitest + Vue Test Utils
```

## 3. Views and functionalities

The six views come from the mock-ups. There is no admin view: admin functions (FR-19 to FR-27) are used through the backend Swagger.

| View | Route | Access | Requirements | Main components | Store | Backend endpoints |
|---|---|---|---|---|---|---|
| Log in and register | `/auth` | Guest only | FR-11, FR-12 | two forms, "Continue as guest" | `useAuthStore` | `POST /auth/login`, `POST /auth/register` |
| Dashboard | `/` | Guest and user | FR-01, FR-06, FR-17, FR-18 | `DrugSearchBox`, latest alerts, emerging signals | `useDrugStore`, `useSignalStore`, `useCabinetStore` | `GET /drugs`, `GET /signals/emerging`, `GET /cabinet/alerts` |
| Drug details (Drug 360) | `/drugs/:rxcui` | Guest (follow needs login) | FR-02, FR-03, FR-10, FR-15 | `DrugHeader`, `ShortageStatusCard`, `RecallsCard`, `ReactionBars`, `TrendChart`, `AlternativesTable` | `useDrugStore` | `GET /drugs/{rxcui}/overview`, `.../reaction-trend`, `GET /shortages/{rxcui}/alternatives`, `POST/DELETE /cabinet/follows` |
| Signals and statistics | `/signals` | Guest | FR-04 to FR-09 | `FilterBar`, `SignalTable`, `PRRBadge`, `LabelGapChip`, `AgeBarChart`, `DonutChart`, `TrendChart` | `useSignalStore` | `GET /signals`, `GET /signals/{rxcui}/{reaction}/reports`, `GET /statistics`, `GET /drugs/{rxcui}/label-gaps` |
| My medicines | `/my-medicines` | User | FR-15 to FR-18 | `FollowedDrugRow`, `AlertList` | `useCabinetStore` | `GET /cabinet`, `GET/DELETE /cabinet/alerts` |
| Profile and settings | `/profile` | User | FR-13, FR-14 | profile form, password form, `ToggleSwitch` alert settings | `useAuthStore` | `GET/PATCH/DELETE /profile`, `POST /profile/password`, `GET/PUT /profile/alert-settings` |

Routing: `meta.requiresAuth` sends guests to `/auth`; `meta.guestOnly` sends logged-in users to the dashboard (`router/guards.js`). Views are lazy-loaded.

## 4. Look and charts

- Palette from the mock-ups (`styles/tokens.css`): teal for actions, amber for shortage, coral for safety signals, green for available or unchanged.
- Charts use **Plotly.js** (`plotly.js-dist-min`): hover tooltips, zoom, responsive. `PlotlyChart.vue` wraps `Plotly.react`, resizes with its container and cleans up on unmount; `plotlyTheme.js` holds the shared look. Plotly is lazy-loaded as a separate chunk of about 4.6 MB, fetched only when a chart appears.
- Charts take plain data props, never store objects, so they stay reusable.

## 5. Tools

| Concern | Tool |
|---|---|
| Framework | Vue 3 (Composition API, `<script setup>`, JavaScript) |
| Build and dev server | Vite (proxies `/api` to `http://localhost:8000`) |
| Routing | Vue Router 4 |
| State | Pinia (setup stores) |
| HTTP | Axios |
| Charts | Plotly.js |
| Tests | Vitest, Vue Test Utils, jsdom |
| Production image | Node build, then Nginx serving the app and proxying `/api/` to the backend |

## 6. Configuration

Copy `.env.example` to `.env`. `VITE_API_BASE_URL` (default `/api/v1`) is the base path of the backend. In development Vite proxies `/api` to the API on port 8000; in production Nginx does (`nginx.conf`, upstream `api:8000`; change it to the VM address on the Virtual Lab).

## 7. Run, test, build

```bash
npm install
cp .env.example .env
npm run dev        # http://localhost:5173 (start the backend first)
npm test           # 3 tests
npm run build      # output in dist/
```

Docker: `docker build -t medsignal-frontend .` or start it with the backend compose file (`--profile app`, served at http://localhost:8080).

## 8. State of the skeleton

- **Working:** routing and guards, stores and services wired through the container, Axios client with JWT, mappers, login and register forms, navbar and search box, status chip, disclaimer footer, the Plotly chart components (shown with sample data in `SignalsView`), theme tokens, Dockerfile and Nginx config.
- **Placeholders with TODOs:** Dashboard, Drug details, My medicines and Profile content, and the table components (`SignalTable`, `FilterBar`, `AlternativesTable`, `FollowedDrugRow`, `AlertList` and similar).

## 9. How to add a feature

1. Add the endpoint call to the matching file in `infrastructure/api` and a mapper if the JSON needs reshaping.
2. Expose it through a service in `application/services` (wire it in `composition/container.js`).
3. Call the service from a Pinia store action.
4. Use the store in the view or component; show `DisclaimerFooter` on any screen with signals.
5. Put pure rules in `domain/rules` with a Vitest test.
