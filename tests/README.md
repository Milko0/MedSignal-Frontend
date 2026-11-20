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
| `components/StatusChip.test.js` | Chip label and tone, disclaimer footer text |
