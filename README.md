# MedSignal Frontend

Vue 3 single-page application of **MedSignal v2**. It shows drug safety signals, shortages and alternatives, and lets registered users follow medicines and manage alerts.
JavaScript only (no TypeScript); models are documented with JSDoc `@typedef`.

> Every screen that shows a signal, label gap or statistic displays the disclaimer: adverse event reports are voluntary and unverified and do not prove that a drug caused a reaction (NFR-11).

## 1. Architecture

The frontend mirrors the backend's clean architecture. Dependencies point inward.

| Layer | Folder | Responsibility | May import | Never imports |
|---|---|---|---|---|
| Domain | `src/domain` | Models (JSDoc typedefs) and pure rules: `signalSeverity`, `isEmerging`, `shortageStatus`, `alertTone` | nothing | Vue, Axios, Pinia |
| Application | `src/application` | Services (use-case logic) and Pinia stores (UI state) | domain, core | Axios, components |
| Infrastructure | `src/infrastructure` | Axios client (token getter, `ApiError`, 401 hook), API adapters that return models, mappers, token storage | core, domain | presentation |
| Presentation | `src/presentation` | Views, layouts, components, charts, router with guards, styles, composables | application, core | infrastructure |
| Core | `src/core` | API base URL, constants (disclaimer, status tones) | - | - |

`src/composition/container.js` is the **composition root**: the only file that wires the concrete API adapters into the services.
Data flow: view -> store -> service -> API adapter -> backend `/api`. Adapters call the mappers, which convert the API's snake_case JSON into camelCase domain models, so everything above infrastructure sees only models. Failed requests reject with one `ApiError { status, message, fieldErrors, url }`.

## 2. Folder structure

```
MedSignal-Frontend/
├── index.html  vite.config.js  jsconfig.json  package.json  .env.example
├── public/favicon.svg
├── Dockerfile  nginx.conf
├── src/
│   ├── main.js                      # Creates the app and Pinia, plugs in the 401 handler, restores the session, then installs the router
│   ├── App.vue
│   ├── composition/container.js     # Composition root
│   ├── core/
│   │   ├── config/env.js            # API base URL
│   │   └── constants/               # disclaimer.js, status.js (teal / amber / coral / green map), auth.js (401s that are not a session expiry)
│   ├── domain/
│   │   ├── models/                  # user, drug, signal, shortage, label, alert, cabinet, report, statistics, alertSettings, page (JSDoc typedefs)
│   │   └── rules/                   # signalSeverity.js, shortageStatus.js, alertTone.js, isEmerging.js, relativeTime.js, pivotTrend.js, formatShortage.js, alternatives.js, percent.js, signalFilters.js, statsShaping.js, cabinet.js, authValidation.js, safeRedirect.js, alertSettings.js
│   ├── application/
│   │   ├── services/                # authService, drugService, signalService, cabinetService, profileService
│   │   └── stores/                  # useAuthStore, useDrugStore, useSignalStore, useCabinetStore, useProfileStore, useDashboardStore, useUiStore
│   ├── infrastructure/
│   │   ├── http/                    # httpClient.js (Axios, token getter, 401 hook), apiError.js, query.js
│   │   ├── api/                     # authApi, drugsApi, shortagesApi, signalsApi, statisticsApi, cabinetApi, profileApi
│   │   ├── mappers/                 # one per backend DTO: common, user, drug, trend, labelGap, alternative, signal, report, statistics, cabinet, alert, profile
│   │   └── storage/tokenStorage.js
│   └── presentation/
│       ├── router/                  # index.js, routes.js (catch-all last), guards.js (guest vs authenticated), titles.js (tab title per page)
│       ├── layouts/                 # AppLayout (navbar), AuthLayout
│       ├── views/                   # LoginView, RegisterView, DashboardView, DrugDetailView,
│       │                            # SignalsView, MedicineCabinetView, ProfileView, NotFoundView
│       ├── components/
│       │   ├── common/              # AppNavbar, AlertBell, AppToast, StatusChip, DisclaimerFooter, ToggleSwitch
│       │   ├── drug/                # DrugSearchBox, DrugHeader, ShortageStatusCard, RecallsCard, LabelCard, DosageFormSelect
│       │   ├── dashboard/           # StatTile, EmergingSignalsCard, LatestAlertsCard
│       │   ├── signals/             # SignalTabs, FilterBar, SignalTable, PRRBadge, LabelGapChip, LabelGapsTable, ReportsDrawer, StatCard, SignalGlossary
│       │   ├── shortages/           # AlternativesTable
│       │   ├── cabinet/             # FollowedDrugRow, AlertList
│       │   ├── profile/             # ProfileForm, PasswordForm, AlertSettingsCard, AccountCard
│       │   └── charts/              # PlotlyChart, plotlyTheme, ReactionBars, TrendChart, DonutChart, AgeBarChart, Sparkline
│       ├── composables/             # useDebouncedSearch.js, useAsyncState.js
│       └── styles/                  # tokens.css (colour, type, spacing, motion tokens), base.css
└── tests/ {unit, components, helpers}   # Vitest + Vue Test Utils; helpers = fixtures, mock services, Pinia setup
```

## 3. Views and functionalities

The six views come from the mock-ups. There is no admin view: admin functions (FR-19 to FR-27) are used through the backend Swagger.

| View | Route | Access | Requirements | Main components | Store | Backend endpoints |
|---|---|---|---|---|---|---|
| Log in | `/login` | Guest only | FR-12 | one form, links to "Create an account" and "Continue as guest" | `useAuthStore` | `POST /auth/login` |
| Create account | `/register` | Guest only | FR-11 | one form, links to "Log in" and "Continue as guest" | `useAuthStore` | `POST /auth/register` |
| Dashboard | `/` | Guest and user | FR-01, FR-06, FR-17, FR-18 | `DrugSearchBox`, `StatTile`, `LatestAlertsCard`, `EmergingSignalsCard` | `useDrugStore` (search), `useDashboardStore`, `useCabinetStore` | `GET /drugs`, `GET /signals/emerging`, `GET /cabinet`, `GET /cabinet/alerts` |
| Drug details (Drug 360) | `/drugs/:rxcui` | Guest (follow needs login) | FR-02, FR-03, FR-10, FR-15 | `DrugHeader`, `DosageFormSelect`, `ShortageStatusCard`, `RecallsCard`, `LabelCard`, `ReactionBars`, `TrendChart`, `AlternativesTable` | `useDrugStore` | `GET /drugs/{rxcui}/overview`, `.../reaction-trend`, `GET /shortages/{rxcui}/alternatives`, `POST/DELETE /cabinet/follows` |
| Signals and statistics | `/signals` | Guest | FR-04 to FR-09 | `SignalTabs`, `FilterBar` (only the filters the tab uses), `SignalTable` (CI lower bound and chi-square in the `PRRBadge` popup; Shortage column once rows carry `in_shortage`), `LabelGapChip`, `LabelGapsTable`, `SignalGlossary`, `ReportsDrawer`, `StatCard`, `AgeBarChart`, `DonutChart`, `TrendChart` (age and sex charts leave Unknown out and say its share underneath) | `useSignalStore` | `GET /signals`, `GET /signals/{rxcui}/{reaction}/reports`, `GET /statistics`, `GET /drugs/{rxcui}/label-gaps` |
| My medicines | `/my-medicines` | User | FR-15 to FR-18 | `FollowedDrugRow`, `AlertList`, filter chips; `AlertBell` and the count in the navbar | `useCabinetStore`, `useUiStore` | `GET /cabinet`, `DELETE /cabinet/follows/{rxcui}`, `GET /cabinet/alerts`, `DELETE /cabinet/alerts[/{id}]` |
| Profile and settings | `/profile` | User | FR-13, FR-14 | `ProfileForm`, `PasswordForm`, `AlertSettingsCard` (`ToggleSwitch`), `AccountCard` (log out, delete account) | `useProfileStore`, `useAuthStore` | `GET/PATCH/DELETE /profile`, `POST /profile/password`, `GET/PUT /profile/alert-settings` |

Routing: `meta.requiresAuth` sends guests to `/login?redirect=<page>`; `meta.guestOnly` sends logged-in users to the dashboard (`router/guards.js`). After logging in or creating an account, `LoginView` / `RegisterView` return to the `redirect` page when it is an internal path (`safeRedirect`); the link between the two pages keeps it. The old `/auth` address redirects to `/login`. Views are lazy-loaded. Any other path shows `NotFoundView` (catch-all route, kept last). Each route has a `meta.title`; `router/titles.js` sets the browser tab to "<title> · MedSignal" after every navigation, and the drug page switches it to the drug name once loaded.

Session: the JWT is kept in `localStorage` (`medsignal.token`). Login returns only a token, so the user comes from `GET /profile`; register logs in right after creating the account. On page load `main.js` calls `useAuthStore().restore()` before installing the router: a stored token that the server rejects is dropped and the page opens as a guest (an invalid token would otherwise make even guest pages answer 401). Any later 401 goes through `handleUnauthorized`, which clears the session and the user-scoped stores and, on a protected page, redirects to `/login?redirect=<page>`; a 401 from `/auth/login`, `/auth/logout` or `/profile/password` is ignored (wrong password, not an expired session; the list is `FORM_401_PATHS` in `core/constants/auth.js`). Deleting the account ends the session locally (`endSession`, no `/auth/logout`: the server revoked the token) and opens `/login?deleted=1`. There is no refresh token, so the user logs in again after `JWT_EXPIRE_MINUTES`.

## 4. Look and charts

- **Direction:** a calm analytical instrument, not a dashboard. Warm paper background (`--bg`), one dominant ink (`--ink`, `--ink-2` for secondary text), and a single cobalt accent (`--accent`) that only ever means "you can act on this" (links, primary buttons, active tab and nav, focus ring).
- **Semantic tones are separate from the accent:** coral = safety signal, amber = shortage, green = available, teal = label / information, slate = recall or below threshold. Each text colour passes WCAG AA (5.4:1 or more) on its `-soft` background, and every status also has a text label, so nothing relies on colour alone. The tone names are part of the JS (`core/constants/status.js`, `domain/rules`), so change their values in `tokens.css`, never the names.
- **Weight follows statistical strength:** `PRRBadge` shows a PRR below 2 as a plain figure, 2-3 outlined in amber, 3 or more with a pale coral fill. Nothing is solid red; a signal is not proof. Sparklines are neutral ink.
- **Type:** Source Serif 4 for page and section headings, IBM Plex Sans for the interface, IBM Plex Mono for statistics (PRR, CI, chi-square, counts, RxCUI, quarters). Fonts are self-hosted with `@fontsource` (imported in `main.js`), so the app works offline on the Virtual Lab. Use the `--fs-*`, `--s-*`, `--radius*` and `--t-*` tokens instead of raw values.
- **Disclaimer (NFR-11):** `DisclaimerFooter` is body-sized in `--ink-2` with a rule above it. Never make it smaller or fainter.
- **Feedback:** `useUiStore.notify(message, tone)` shows a short message through `AppToast` (rendered once in `AppLayout`; coral messages are announced as alerts). Motion is limited to feedback (120-180 ms) and switched off under `prefers-reduced-motion`.
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

Copy `.env.example` to `.env`. `VITE_API_BASE_URL` (default `/api`) is the base path of the backend. In development Vite proxies `/api` to the API on port 8000; in production Nginx does (`nginx.conf`, upstream `api:8000`; change it to the VM address on the Virtual Lab).

## 7. Run, test, build

```bash
npm install
cp .env.example .env
npm run dev        # http://localhost:5173 (start the backend first)
npm test           # unit tests, no network needed
npm run build      # output in dist/
```

Docker: `docker build -t medsignal-frontend .` or start it with the backend compose file (`--profile app`, served at http://localhost:8080).

## 8. State of the skeleton

- **Working:** routing and guards, stores and services wired through the container, Axios client with JWT and `ApiError`, one mapper per backend DTO, adapters returning models, login and register with validation, session restore, expired-token handling, navbar with account menu, search box with dropdown, the dashboard (tiles, emerging signals, latest alerts), My medicines (followed drugs with status, filter chips, alert list, alert bell),  Profile and settings (edit username and email, change password, alert switches with explicit save, log out, delete account with the username typed to confirm), the signal explorer (tabs, filters in the URL, paginated table, label gaps, reports drawer, statistics charts), Drug 360 (header with follow, shortage, recalls, label, reactions, trend, alternatives, dosage-form filter), status chip, disclaimer footer, the Plotly chart components, toast messages, not-found page, page titles and favicon, theme tokens, Dockerfile and Nginx config.
- **Placeholders with TODOs:** none.

## 9. How to add a feature

1. Add the endpoint call to the matching file in `infrastructure/api` and a mapper if the JSON needs reshaping.
2. Expose it through a service in `application/services` (wire it in `composition/container.js`).
3. Call the service from a Pinia store action.
4. Use the store in the view or component; show `DisclaimerFooter` on any screen with signals.
5. Put pure rules in `domain/rules` with a Vitest test.
