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
- Tests never call the network; live checks against the backend are done by hand per phase (`plan_f/pN_test/results.md`).

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
| `unit/stores/useDrugStore.test.js` | Drug store with mocked services |
| `unit/stores/useDrugStore.search.test.js` | Search: stale answers dropped, < 2 characters sends nothing, error state |
| `unit/stores/useDashboardStore.test.js` | Guest loads only emerging; user loads all three; one failure keeps the others; tile counts; latest alerts |
| `unit/relativeTime.test.js` | Minute / hour / yesterday / day / date boundaries |
| `components/DrugSearchBox.test.js` | Debounce, keyboard, "matched", empty and error states, chips |
| `components/DashboardView.test.js` | Guest and user dashboard, quarter title, disclaimer, error and Retry |
| `components/Sparkline.test.js` | Path for n values, nothing for empty |
| `components/StatusChip.test.js` | Chip label and tone, disclaimer footer text |
