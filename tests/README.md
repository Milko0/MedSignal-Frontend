# tests

Frontend tests.

## Tools used

- Vitest
- Vue Test Utils
- jsdom

## Rules

- `unit/`: domain rules, `ApiError`, `toQuery`, services, API adapters (Axios stubbed), stores.
- `unit/mappers/`: one test per mapper, input copied from the backend DTO shape (`helpers/fixtures.js`).
- `unit/stores/`: Pinia stores with a mocked `services` container (see `helpers/mockServices.js`).
- `components/`: component rendering.
- `helpers/`: shared fixtures and store-test helpers. Not test files.
- Tests never call the network; live checks against the running backend are done by hand.

## Contents

| Item | Role |
|---|---|
| `helpers/fixtures.js` | One realistic backend JSON object per DTO (snake_case) |
| `helpers/mockServices.js` | `services` object of `vi.fn()`s for store tests |
| `helpers/setupPinia.js` | Fresh Pinia before each test |
| `unit/rules.test.js` | Severity, emerging, shortage status, alert tone, label match, status/disclaimer constants |
| `unit/apiError.test.js` | FastAPI error bodies to `ApiError` |
| `unit/query.test.js` | `toQuery` |
| `unit/apiAdapters.test.js` | URL, params, body and returned model of every API adapter |
| `unit/authService.test.js` | Login / register / logout through the session port |
| `unit/mappers/*.test.js` | DTO to model mappers |
| `unit/stores/useDrugStore.detail.test.js` | Drug 360 store: load order, alternatives only in shortage, 404, per-section failures, dosage form, route change, optimistic follow with rollback |
| `unit/stores/useDrugStore.search.test.js` | Search: stale answers dropped, < 2 characters sends nothing, error state |
| `unit/stores/useDashboardStore.test.js` | Guest loads only emerging; user loads all three; one failure keeps the others; tile counts; latest alerts |
| `unit/relativeTime.test.js` | Minute / hour / yesterday / day / date boundaries |
| `components/DrugSearchBox.test.js` | Debounce, keyboard, "matched", empty and error states, chips |
| `components/DashboardView.test.js` | Guest and user dashboard, quarter title, disclaimer, error and Retry |
| `components/Sparkline.test.js` | Path for n values, nothing for empty |
| `components/StatusChip.test.js` | Chip label and tone, disclaimer footer text |
| `unit/pivotTrend.test.js`, `unit/formatShortage.test.js` | Trend pivot, shortage text, alternatives labels |
| `components/DrugHeader.test.js`, `components/DrugCards.test.js` | Header (guest login link, Follow/Following), shortage / recalls / label cards, dosage-form select, percent, chip overrides |
| `components/AlternativesTable.test.js`, `components/DrugDetailView.test.js` | Ranked rows and empty state; the whole Drug 360 page with its states |
| `unit/signalFilters.test.js`, `unit/statsShaping.test.js` | Filters <-> URL round trip, per-tab minimum, empty-state text; statistics reshaping |
| `unit/stores/useSignalStore*.test.js` | Signal store: tab -> service, stale answers, drawer incl. the `/` case, statistics scope and per-chart failures |
| `components/FilterBar.test.js`, `components/SignalTable.test.js`, `components/LabelGapsTable.test.js`, `components/ReportsDrawer.test.js`, `components/StatCard.test.js` | Filter bar per tab, table (sort, pager, chips, PRR popup, shortage column), glossary, label gaps states, drawer (focus, states, pager), chart card states |
| `unit/cabinetRules.test.js`, `unit/stores/useCabinetStore.test.js` | Row status and filters; freshness, shared requests, optimistic unfollow / dismiss with rollback, reset, rows and counts |
| `components/FollowedDrugRow.test.js`, `components/AlertList.test.js`, `components/MedicineCabinetView.test.js`, `components/AlertBell.test.js` | Chip per status and confirm-to-unfollow; dismiss and dismiss-all confirmation; the whole My medicines page; bell count and list |
| `components/SignalsView.test.js` | URL as source of truth with a real router, tabs, drawer, charts |
| `unit/adminApi.test.js`, `unit/adminRules.test.js`, `unit/adminShortageRules.test.js`, `unit/adminDocumentRules.test.js`, `unit/adminIngestionRules.test.js` | Admin adapters (URLs, paging, encoded ids, 204s); page guess, JSON record parsing and templates, user / shortage forms and server errors, report and label rows, runs, window and limits |
| `unit/stores/useAdminCrudStore.test.js`, `unit/stores/useAdminTermsStore.test.js`, `unit/stores/useAdminIngestionStore.test.js` | Admin lists (paging, stale answers, save / delete rethrow, step back a page), terms, and the ingestion store (waiting for a job by its log entry, 409, give-up, hidden tab, reset) |
| `components/AdminDialogs.test.js` | Dialog base, confirm (type to confirm, pending lock, focus return), JSON editor, pager |
| `components/AdminUsersView.test.js`, `components/AdminShortagesView.test.js`, `components/AdminDocumentViews.test.js`, `components/AdminTermsView.test.js`, `components/AdminIngestionView.test.js` | The admin screens end to end against a mocked service layer: lists, errors and Retry, create / edit / delete, server refusals, open by id / NDC, FAERS load, incremental update, log, rebuild |

The guard (`unit/guards.test.js`), the navbar link (`components/AppNavbar.test.js`) and the admin routes (`unit/routesAndTitles.test.js`) are covered in their existing files. The live run of the admin area against a real backend is kept in `plan_f/p9_test/` (not part of `npm test`).
