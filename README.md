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
│   │   └── constants/               # disclaimer.js, status.js (teal / amber / coral / green map), auth.js (401s that are not a session expiry), admin.js (tabs, page size, polling)
│   ├── domain/
│   │   ├── models/                  # user, drug, signal, shortage, label, alert, cabinet, report, statistics, alertSettings, page, admin (JSDoc typedefs)
│   │   └── rules/                   # signalSeverity.js, shortageStatus.js, alertTone.js, isEmerging.js, relativeTime.js, pivotTrend.js, formatShortage.js, alternatives.js, percent.js, signalFilters.js, statsShaping.js, cabinet.js, authValidation.js, safeRedirect.js, alertSettings.js, admin.js (admin lists, users, shortages, JSON records, runs)
│   ├── application/
│   │   ├── services/                # authService, drugService, signalService, cabinetService, profileService, adminService
│   │   └── stores/                  # useAuthStore, useDrugStore, useSignalStore, useCabinetStore, useProfileStore, useDashboardStore, useUiStore,
│   │                                # useAdminCrudStore (users / reports / labels / shortages lists), useAdminTermsStore, useAdminIngestionStore, useAdminStores (reset)
│   ├── infrastructure/
│   │   ├── http/                    # httpClient.js (Axios, token getter, 401 hook), apiError.js, query.js
│   │   ├── api/                     # authApi, drugsApi, shortagesApi, signalsApi, statisticsApi, cabinetApi, profileApi, adminApi
│   │   ├── mappers/                 # one per backend DTO: common, user, drug, trend, labelGap, alternative, signal, report, statistics, cabinet, alert, profile, admin (runs, FAERS files, quarters)
│   │   └── storage/tokenStorage.js
│   └── presentation/
│       ├── router/                  # index.js, routes.js (catch-all last), guards.js (guest vs authenticated vs admin), titles.js (tab title per page)
│       ├── layouts/                 # AppLayout (navbar; wider page for meta.wide), AuthLayout (navbar + full-screen split: AuthShowcase | form), AdminLayout (title + tabs of /admin)
│       ├── views/                   # LoginView, RegisterView, DashboardView, DrugDetailView,
│       │                            # SignalsView, MedicineCabinetView, ProfileView, NotFoundView,
│       │                            # AdminIngestionView, AdminUsersView, AdminReportsView, AdminLabelsView, AdminShortagesView, AdminTermsView
│       ├── components/
│       │   ├── auth/                # AuthShowcase (animated brand half of Log in / Create account)
│       │   ├── common/              # AppNavbar, AlertBell, AppToast, StatusChip, DisclaimerFooter, ToggleSwitch
│       │   ├── drug/                # DrugSearchBox, DrugHeader, ShortageStatusCard, RecallsCard, LabelCard, DosageFormSelect
│       │   ├── dashboard/           # StatTile, EmergingSignalsCard, LatestAlertsCard
│       │   ├── signals/             # SignalTabs, FilterBar, SignalTable, PRRBadge, LabelGapChip, LabelGapsTable, ReportsDrawer, StatCard, SignalGlossary
│       │   ├── shortages/           # AlternativesTable
│       │   ├── cabinet/             # FollowedDrugRow, AlertList
│       │   ├── profile/             # ProfileForm, PasswordForm, AlertSettingsCard, AccountCard
│       │   ├── admin/               # AdminDialog, ConfirmDialog, JsonRecordDialog, UserFormDialog, ShortageFormDialog, AdminDocumentsPanel, PagerBar, FaersFilesTable, RunsTable
│       │   └── charts/              # PlotlyChart, plotlyTheme, ReactionBars, TrendChart, DonutChart, AgeBarChart, Sparkline
│       ├── composables/             # useDebouncedSearch.js, useAsyncState.js
│       └── styles/                  # tokens.css (colour, type, spacing, motion tokens), base.css
└── tests/ {unit, components, helpers}   # Vitest + Vue Test Utils; helpers = fixtures, mock services, Pinia setup
```

## 3. Views and functionalities

The six views come from the mock-ups. The admin area (FR-19 to FR-27) is a seventh group of pages under `/admin`, only for accounts with the `admin` role; the backend also enforces it (401 without a token, 403 for other users).

| View | Route | Access | Requirements | Main components | Store | Backend endpoints |
|---|---|---|---|---|---|---|
| Log in | `/login` | Guest only | FR-12 | `AuthLayout` (navbar kept, so users can always go home), `AuthShowcase`, one form, link to "Create an account" | `useAuthStore` | `POST /auth/login`, `GET /profile` |
| Create account | `/register` | Guest only | FR-11 | same layout, one form, link to "Log in" | `useAuthStore` | `POST /auth/register`, then log in |
| Dashboard | `/` | Guest and user | FR-01, FR-06, FR-17, FR-18 | `DrugSearchBox`, `StatTile`, `LatestAlertsCard`, `EmergingSignalsCard` | `useDrugStore` (search), `useDashboardStore`, `useCabinetStore` | `GET /drugs`, `GET /signals/emerging`, `GET /cabinet`, `GET /cabinet/alerts` |
| Drug details (Drug 360) | `/drugs/:rxcui` | Guest (follow needs login) | FR-02, FR-03, FR-10, FR-15 | `DrugHeader`, `DosageFormSelect`, `ShortageStatusCard`, `RecallsCard`, `LabelCard`, `ReactionBars`, `TrendChart`, `AlternativesTable` | `useDrugStore` | `GET /drugs/{rxcui}/overview`, `.../reaction-trend`, `GET /shortages/{rxcui}/alternatives`, `POST/DELETE /cabinet/follows` |
| Signals and statistics | `/signals` | Guest | FR-04 to FR-09 | `SignalTabs`, `FilterBar` (only the filters the tab uses), `SignalTable` (plain columns for guests: Description, Reports, In label, Shortage, Trend; rows come ranked by PRR from the backend but PRR, CI and chi-square are not shown; the Description filter matches any part of the term in either spelling, e.g. "anemia" finds ANAEMIA), `LabelGapChip`, `LabelGapsTable`, `SignalGlossary`, `ReportsDrawer`, `StatCard`, `AgeBarChart`, `DonutChart`, `TrendChart` (age and sex charts leave Unknown out and say its share underneath) | `useSignalStore` | `GET /signals`, `GET /signals/{rxcui}/{reaction}/reports`, `GET /statistics`, `GET /drugs/{rxcui}/label-gaps` |
| My medicines | `/my-medicines` | User | FR-15 to FR-18 | `FollowedDrugRow`, `AlertList`, filter chips; `AlertBell` and the count in the navbar | `useCabinetStore`, `useUiStore` | `GET /cabinet`, `DELETE /cabinet/follows/{rxcui}`, `GET /cabinet/alerts`, `DELETE /cabinet/alerts[/{id}]` |
| Profile and settings | `/profile` | User | FR-13, FR-14 | `ProfileForm`, `PasswordForm`, `AlertSettingsCard` (`ToggleSwitch`), `AccountCard` (log out, delete account) | `useProfileStore`, `useAuthStore` | `GET/PATCH/DELETE /profile`, `POST /profile/password`, `GET/PUT /profile/alert-settings` |
| Admin: data updates | `/admin/ingestion` (`/admin` redirects here) | Admin | FR-19, FR-20, FR-21, FR-27 | `FaersFilesTable`, `RunsTable`, `ConfirmDialog` | `useAdminIngestionStore` | `GET /admin/ingestion/faers-files`, `.../quarters?adding=`, `POST .../faers`, `POST .../incremental`, `GET .../runs`, `POST /admin/reconciliation` |
| Admin: users | `/admin/users` | Admin | FR-25 | `UserFormDialog`, `ConfirmDialog` (type the username), `PagerBar` | `useAdminUsersStore` | `GET/POST /admin/users`, `PUT/DELETE /admin/users/{id}` |
| Admin: reports | `/admin/reports` | Admin | FR-22 | `AdminDocumentsPanel`, `JsonRecordDialog`, `ConfirmDialog` | `useAdminReportsStore` | `GET/POST /admin/reports`, `GET/PUT/DELETE /admin/reports/{report_id}` |
| Admin: labels | `/admin/labels` | Admin | FR-23 | same panel | `useAdminLabelsStore` | `GET/POST /admin/labels`, `GET/PUT/DELETE /admin/labels/{set_id}` |
| Admin: shortages | `/admin/shortages` | Admin | FR-24 | `ShortageFormDialog`, `ConfirmDialog`, lookup by NDC | `useAdminShortagesStore` | `GET/POST /admin/shortages`, `GET/PUT/DELETE /admin/shortages/{package_ndc}` |
| Admin: excluded terms | `/admin/terms` | Admin | FR-26 | `ConfirmDialog` | `useAdminTermsStore` | `GET/POST /admin/excluded-terms`, `DELETE /admin/excluded-terms/{term}` |

Routing: `meta.requiresAuth` sends guests to `/login?redirect=<page>`; `meta.guestOnly` sends logged-in users to the dashboard, `meta.requiresAdmin` sends a logged-in user who is not an admin to the dashboard (`router/guards.js`; every `/admin` child inherits it from the parent route). `meta.wide` gives the page the wider admin width. After logging in or creating an account, `LoginView` / `RegisterView` return to the `redirect` page when it is an internal path (`safeRedirect`); the link between the two pages keeps it. The old `/auth` address redirects to `/login`. Views are lazy-loaded. Any other path shows `NotFoundView` (catch-all route, kept last). Each route has a `meta.title`; `router/titles.js` sets the browser tab to "<title> · MedSignal" after every navigation, and the drug page switches it to the drug name once loaded.

Admin area: the backend's admin lists are plain arrays without a total, so the tables only have Previous / Next (a full page may have a next one). Reports, labels and shortages are edited as documents in the backend's own shape (snake_case): reports and labels through a validated JSON editor, shortages through a form that keeps the fields it does not show. Users cannot delete or demote themselves here (Profile has its own delete), and the backend refuses to demote or delete the last admin (422, shown in the dialog). FAERS loads and incremental updates run in the background on the server and write their log entry only when they finish, so after starting one the screen shows "is running", reads the log every 5 s and stops when a new entry of that kind appears (up to one hour). The shortage list is replaced by the FDA's list at every poll, so manual shortage records can be overwritten. The first admin cannot be made from the web: see section 7.

Session: the JWT is kept in `localStorage` (`medsignal.token`). Login returns only a token, so the user comes from `GET /profile`; register logs in right after creating the account. On page load `main.js` calls `useAuthStore().restore()` before installing the router: a stored token that the server rejects is dropped and the page opens as a guest (an invalid token would otherwise make even guest pages answer 401). Any later 401 goes through `handleUnauthorized`, which clears the session and the user-scoped stores and, on a protected page, redirects to `/login?redirect=<page>`; a 401 from `/auth/login`, `/auth/logout` or `/profile/password` is ignored (wrong password, not an expired session; the list is `FORM_401_PATHS` in `core/constants/auth.js`). Deleting the account ends the session locally (`endSession`, no `/auth/logout`: the server revoked the token) and opens `/login?deleted=1`. There is no refresh token, so the user logs in again after `JWT_EXPIRE_MINUTES`.

## 4. Look and charts

- **Direction:** a calm analytical instrument, not a dashboard. Warm paper background (`--bg`), one dominant ink (`--ink`, `--ink-2` for secondary text), and a single cobalt accent (`--accent`) that only ever means "you can act on this" (links, primary buttons, active tab and nav, focus ring).
- **Semantic tones are separate from the accent:** coral = safety signal, amber = shortage, green = available, teal = label / information, slate = recall or below threshold. Each text colour passes WCAG AA (5.4:1 or more) on its `-soft` background, and every status also has a text label, so nothing relies on colour alone. The tone names are part of the JS (`core/constants/status.js`, `domain/rules`), so change their values in `tokens.css`, never the names.
- **Plain words for guests:** the tables show what was reported (Description: reaction, symptom or technical issue), how many reports, whether the label lists it and the FDA shortage status ("No shortage" when never listed). The statistics behind the ranking (PRR, CI, chi-square) stay in the API and Swagger. Nothing is solid red; a signal is not proof. Sparklines are neutral ink.
- **Log in / Create account:** full-screen split under the navbar. `AuthShowcase` fills the blue half with three rotating product scenes (a rising signal, a shortage with alternatives, alerts; every 5 s, pauses on hover, still under `prefers-reduced-motion`, hidden below 900 px) and real dataset figures.
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

**Development** (hot reload). Start the backend first (see the backend README, section 9), then:

```bash
npm install
cp .env.example .env
npm run dev        # http://localhost:5173 ; Vite forwards /api to http://localhost:8000
```

If the terminal shows `[vite] http proxy error ... ECONNREFUSED`, the backend is not running on port 8000.

```bash
npm test           # 1044 unit and component tests, no network needed
npm run build      # production build in dist/
```

**Everything in containers** (MongoDB replica set, Redis with Sentinel, API, worker and this app behind Nginx), from
the backend folder:

```bash
docker compose -f deploy/docker-compose.local.yml up -d
docker compose -f deploy/docker-compose.local.yml --profile seed run --rm seed
docker compose -f deploy/docker-compose.local.yml --profile app up -d --build
```

The app is then at http://localhost:8080 (Nginx serves `dist/` and proxies `/api/` to the `api` service).
Run the last command again after every pull of the backend or the frontend.

**First admin.** Accounts made on the web are always normal users; the admin area needs one made on the server. Choose your own username and email (not the example from the backend chat), and type the password when asked:

```bash
docker compose -f deploy/docker-compose.local.yml exec -it api python scripts/create_admin.py --username <your-username> --email <you>@example.com
# or promote an account you already registered:
docker compose -f deploy/docker-compose.local.yml exec api python scripts/create_admin.py --promote <username>
```

Log in with it (log out and in again after a promotion: the role comes with the session) and an **Admin** link appears in the navbar. The create-user form validates e-mails like the backend, which rejects reserved domains such as `.local`; the script does not check, but use a normal domain anyway.

## 8. State of the skeleton

- **Working:** full-screen login and register with the animated showcase, routing and guards, stores and services wired through the container, Axios client with JWT and `ApiError`, one mapper per backend DTO, adapters returning models, login and register with validation, session restore, expired-token handling, navbar with account menu, search box with dropdown, the dashboard (tiles, emerging signals, latest alerts), My medicines (followed drugs with status, filter chips, alert list, alert bell),  Profile and settings (edit username and email, change password, alert switches with explicit save, log out, delete account with the username typed to confirm), the signal explorer (tabs, filters in the URL, paginated table, label gaps, reports drawer, statistics charts), Drug 360 (header with follow, shortage, recalls, label, reactions, trend, alternatives, dosage-form filter), status chip, disclaimer footer, the Plotly chart components, toast messages, not-found page, page titles and favicon, theme tokens, Dockerfile and Nginx config.
- **Admin area:** data updates (FAERS files, quarters window preview, incremental update, update log with live waiting, rebuild of the live layer), users, reports and labels (JSON editor, open by id), shortages (form, open by NDC), excluded terms, behind the `requiresAdmin` guard.
- **Placeholders with TODOs:** none.

## 9. How to add a feature

1. Add the endpoint call to the matching file in `infrastructure/api` and a mapper if the JSON needs reshaping.
2. Expose it through a service in `application/services` (wire it in `composition/container.js`).
3. Call the service from a Pinia store action.
4. Use the store in the view or component; show `DisclaimerFooter` on any screen with signals.
5. Put pure rules in `domain/rules` with a Vitest test.
