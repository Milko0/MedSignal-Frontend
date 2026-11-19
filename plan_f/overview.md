# Frontend integration plan — overview

This folder holds the plan for wiring the Vue frontend (`MedSignal-Frontend`) to the FastAPI backend
(`MedSignal-Backend`). One file per phase. Do the phases in order: each one leaves the app in a working,
tested, committed state, and the later phases build on the earlier ones.

| Phase | File | Goal | Views / FRs |
|---|---|---|---|
| 1 | [p1.md](p1.md) | Foundations: API base path, error model, layering fixes, mappers that match the real JSON, test harness | all (no UI yet) |
| 2 | [p2.md](p2.md) | Auth and session: register, log in, log out, session restore, 401 handling, guards | View 1 — FR-11, FR-12 |
| 3 | [p3.md](p3.md) | Search and dashboard: navbar search, typo-tolerant results, tiles, emerging signals, latest alerts | View 2 — FR-01, FR-06, FR-17, FR-18 |
| 4 | [p4.md](p4.md) | Drug 360: header, shortage, recalls, label, top reactions, monthly trend, alternatives, follow | View 3 — FR-02, FR-03, FR-10, FR-15 |
| 5 | [p5.md](p5.md) | Signals and statistics: filters, paginated table, emerging and label-gap tabs, reports drawer, real charts | View 4 — FR-04 to FR-09 |
| 6 | [p6.md](p6.md) | My medicines: followed drugs, alerts, dismiss one / all, alert bell and nav badge | View 5 — FR-15 to FR-18 |
| 7 | [p7.md](p7.md) | Profile and settings: edit profile, change password, alert settings, log out, delete account | View 6 — FR-13, FR-14 |
| 8 | [p8.md](p8.md) | Hardening and delivery: end-to-end runs on both storage backends, build, Nginx/Docker, docs | all |

Reference material: `../README.md` (frontend), `../../MedSignal-Backend/README.md`, Swagger at
`http://localhost:8000/docs`, `../../MedSignal_Mockups.pdf` (the six screens), `../../CLAUDE.md` (shared rules).

---

## 1. Rules that apply to every phase

### 1.1 Layering (do not break it)

```
presentation (views, components, router)  ->  application (stores, services)  ->  domain (models, rules)
                                   infrastructure (http, api adapters, mappers, token storage)
                                   is wired in only by  src/composition/container.js
```

- **Views and components** only talk to Pinia stores. Never import Axios, an API adapter, a mapper or `tokenStorage`.
- **Stores** call services from `services` (the container). They hold UI state: data, `loading`, `error`, filters, pagination.
- **Services** hold use-case logic (combine calls, decide what to fetch). They receive their adapters as arguments and
  must **not** import from `infrastructure/` (today `authService` imports `tokenStorage` and the services import the
  mappers — Phase 1 fixes this).
- **API adapters** (`infrastructure/api/*`) do the HTTP call **and** the mapping: they return domain models
  (camelCase), never raw snake_case JSON. Everything above infrastructure sees only camelCase.
- **Mappers** (`infrastructure/mappers/*`) are pure functions, one per backend DTO, each with a Vitest test fed with
  a JSON shape copied from the backend DTO (`app/application/dtos/*.py`) or from a real Swagger response.
- **Domain rules** (`domain/rules/*`) are pure, framework-free, and each has a Vitest test.
- **Charts** take plain data props (arrays/objects), never store objects. Reshaping for a chart happens in a
  domain rule or a store getter, not inside the chart component.

### 1.2 Contract discipline

- The backend DTOs in `MedSignal-Backend/app/application/dtos/` are the source of truth for field names.
  Before writing a mapper, open the DTO (or Swagger) — don't guess from the mock-ups.
- Base path is **`/api`** (backend `API_PREFIX`). The frontend currently says `/api/v1`; Phase 1 fixes it.
- Envelope: signal/label-gap endpoints return `{ data, meta: { disclaimer } }`; everything else returns the DTO
  directly. Adapters unwrap the envelope and return `{ ...model, disclaimer }` so callers never see `data`/`meta`.
- Pagination: query `page` (1-based) and `page_size` (max 100); responses carry `total`, `page`, `page_size`,
  `total_pages`. One shared `toPage(dto, mapItem)` mapper handles it.
- Enum values from the backend are UPPER_CASE (`CURRENT`, `SHORTAGE`, `FULL`, `HIGH`, …). Map them to UI
  tones/labels in one place (`core/constants/status.js` + a domain rule), never with string literals in components.
- Path params that are free text (reaction names) are always passed through `encodeURIComponent`.
- If the backend lacks something a screen needs, **do not invent fields**. Use the fallback written in the phase
  file, and add the request to the "Backend requests" table below so it is agreed with the backend owner.

### 1.3 Errors, loading, empty states

- `httpClient` turns every Axios error into one `ApiError { status, message, fieldErrors }` (Phase 1).
  FastAPI sends `{ detail: string }` for domain errors (401/403/404/409) and `{ detail: [{loc, msg}] }` for 422.
- Every screen section has three states: loading (skeleton or muted text), error (message + retry), empty
  (explains why: "No signals for this quarter with at least 20 reports").
- 401 anywhere → session cleared, user sent to `/auth?redirect=<current path>` (Phase 2). 404 on a drug → a
  "drug not found" state, not a blank page.

### 1.4 Disclaimer (NFR-11)

Every screen that shows signals, label gaps, reactions or statistics shows `DisclaimerFooter`. Prefer the
`meta.disclaimer` text from the API when the response has one; otherwise the constant in
`core/constants/disclaimer.js` (Phase 1 aligns its text with the backend `DISCLAIMER`).

### 1.5 Traceability

Each view, store action and API adapter function names its FR/NFR in a one-line comment
(e.g. `// FR-09: reports behind a signal`). The test results of each phase list which FRs it covers.

---

## 2. Coordination

### 2.1 Branches and ownership

- Work on the personal branch `bazil` in `MedSignal-Frontend` (or a short-lived feature branch off it,
  e.g. `feat/p3-dashboard`, merged back into `bazil`). Never commit to `main` / `Development` directly.
- **Never push** without the user's explicit go-ahead. Pushing, PRs and merges into `Development` are the user's call.
- Before starting a phase: `git fetch origin` and look at `origin/Development`, `origin/Macarena`,
  `origin/Marlon` for frontend changes in the same files. If a teammate touched a file this phase rewrites, stop and
  tell the user before editing.
- The backend repo is a shared team repo. A frontend phase **does not edit the backend**. Anything the backend
  needs goes into the "Backend requests" table and to the user, who agrees it with the backend owner. The only
  exception is if the user explicitly asks us to make that backend change.

### 2.2 Commits

Follow `../../CLAUDE.md` section 5 exactly:

- Commit after each finished slice (each phase lists its planned commits). Don't mix unrelated changes.
- Short, imperative, lower-case subject, under ~60 chars, light `feat:` / `fix:` / `test:` / `docs:` /
  `refactor:` prefix. Plain words, no essay, no emoji.
- **No AI attribution of any kind** — no `Co-Authored-By`, no "Generated with" line.
- Stage files by name. Never commit `.env`, `node_modules/`, `dist/`.
- `npm test` and `npm run build` pass before each code commit.

### 2.3 Definition of done for a phase

1. All tasks in the phase file are done or explicitly moved (with a reason) to a later phase.
2. `npm test` green, `npm run build` green, no console errors in the browser for the screens touched.
3. Live check against a running backend done (section 3), results written to `plan_f/pN_test/results.md`.
4. Work committed in the planned slices (not pushed).
5. `MedSignal-Frontend/README.md` (state section, endpoints table) and `MedSig/CLAUDE.md` (section 4 and
   "Decisions & Learnings") updated with anything durable.

---

## 3. Phase testing scheme

Each phase is tested the same way before moving on.

1. **Vitest first.** `npm test` — the whole suite, not just the new files. New code needs:
   mapper tests (real-shaped JSON in, model out), domain rule tests, store tests (Pinia with a mocked
   `services` container via `vi.mock('@/composition/container')`), and component tests for components with logic.
2. **Live run against the backend.** Start the backend (`uvicorn app.main:app --reload`, `STORAGE_BACKEND=memory`
   with a built `data/clean`, or `databases` once the Mongo/Redis adapters are in) and the frontend (`npm run dev`).
   Drive the screens in the browser and confirm, in DevTools Network, that each call hits the right URL with the
   right params and that the screen shows the response. Register throw-away test users (`p<N>_test_<x>`) for
   user-only flows.
3. **Clean up.** Delete the test users created (via `DELETE /api/profile` from the UI or Swagger) so the shared
   dataset is left as found.
4. **Write up** `plan_f/pN_test/results.md`: summary with pass counts; table of Vitest tests and what each covers;
   table of live checks (screen, action, request, expected, result); what was implemented; FRs covered; anything
   that could not be exercised live (e.g. no alerts exist because the worker never dispatched one) and what covers
   it instead; environment (backend commit, storage backend, browser).

> Dataset note: `MedSignal-Backend/data/` is empty on this machine. Live checks need a built `data/clean`
> (backend README section 9: `scripts/download_raw.py`, `scripts/download_faers.py`, `scripts/build_clean_dataset.py`)
> or a seeded Mongo/Redis. If neither exists when a phase starts, ask the user / backend owner for the dataset or a
> small dev seed (see Backend request B1) — don't fake responses in the app to get around it.

---

## 4. Current contract mismatches (found while planning, fixed in the phase named)

| # | Where (frontend) | Frontend today | Backend actually | Fixed in |
|---|---|---|---|---|
| M1 | `.env.example`, `core/config/env.js` | base `/api/v1` | `/api` | P1 |
| M2 | `authService`, `AuthView` | login body `{ login, password }` | `{ identifier, password }` | P2 |
| M3 | `authService` | expects `res.user` from login | login returns `{ access_token, token_type }` only; user comes from `GET /profile` | P2 |
| M4 | `authService.register` | stores `res.access_token` (undefined → stores `"undefined"`) | register returns `UserResponse`, no token → log in after register | P2 |
| M5 | `useAuthStore.loggedIn` | `computed` over `localStorage` (not reactive) | — | P2 |
| M6 | `authService.logout` | only clears storage | `POST /auth/logout` revokes the token (jti) | P2 |
| M7 | `cabinetService.list` | reads `r.followed` | returns a plain array of `FollowedDrug` | P6 |
| M8 | `alertMapper` | `id, rxcui, title, detail` | `alert_id, type (SIGNAL/LABEL/SHORTAGE/RECALL), drug_rxcui, message, created_at`; list is a plain array | P1/P6 |
| M9 | `drugMapper` | `description, drug_class, dosage_form, expected_return, top_signals`, status `'None'` | `brand_names, atc_classes[], selected_dosage_form, selected_route, shortage{status\|null, packages_*, dosage_forms, since, reasons}, recalls{…, not_classified, total, linked_share}, label{available, product_types, effective_date, has_boxed_warning, description}, top_reactions[{reaction, reports}], is_followed, match_coverage` | P1/P4 |
| M10 | `shortageStatus.isInShortage` | `'Current'`, `'To Be Discontinued'` | `CURRENT`, `TO_BE_DISCONTINUED`, `RESOLVED`, `null` | P1 |
| M11 | `useDrugStore` | alternatives at `.alternatives` | `AlternativesData{ target_dosage_form, target_routes, items[] }` | P4 |
| M12 | `signalMapper` | `in_label, novelty` | `label_match (FULL/PARTIAL/NONE), is_signal, is_emerging, quarter, a,b,c,d` | P1/P5 |
| M13 | `signalService` | reads `r.items` | `{ data: SignalList, meta }` | P1 |
| M14 | `useSignalStore` | filter `drug`, quarter hard-coded `2026Q3` | param `rxcui`; quarter omitted = latest quarter (response tells which) | P5 |
| M15 | `useSignalStore` | `GET /statistics` without `group_by` (422) | `group_by` required: `age_group\|sex\|country\|seriousness\|report_type\|quarter` | P5 |
| M16 | `ReactionBars` | `[{ term, count }]` | `[{ reaction, reports }]` → mapper gives `{ reaction, reports }`; chart prop updated | P4 |
| M17 | `TrendChart` | `[{ reaction, months, counts }]` | `/reaction-trend` is flat `[{ month, reaction, reports }]` → pivot rule | P4 |
| M18 | `disclaimer.js` | different wording | backend `DISCLAIMER` | P1 |
| M19 | services | import infrastructure (mappers, tokenStorage) | layering violation | P1 |

---

## 5. Backend requests (agree with the backend owner; each has a frontend fallback)

| # | Need | Why | Frontend fallback until done |
|---|---|---|---|
| B1 | A small dev dataset or seed script (e.g. built from `tests/fixtures/raw.py`) that `STORAGE_BACKEND=memory` can load | live checks need data; `data/` is empty locally | ask for a built `data/clean` folder; Vitest with mocked services |
| B2 | `GET /signals/{rxcui}/{reaction}/reports` breaks for reactions containing `/` (Starlette decodes `%2F` before routing) | MedDRA terms like "Nausea/vomiting" exist | encode anyway; show "reports unavailable" on 404 for such rows |
| B3 | A list of available quarters (e.g. `GET /signals/quarters`) | quarter dropdown | `GET /statistics?group_by=quarter` → bucket names |
| B4 | Serious vs all reports per quarter (e.g. `group_by=quarter&serious=true`, or a two-level grouping) | "Serious reports over time" chart | one `group_by=seriousness&quarter=Q` call per quarter, last 6 quarters only |
| B5 | `FollowedDrug` with ATC class / dosage form and latest event | My-medicines row subtitle and status chip | chip from the newest alert for that rxcui; subtitle from shortage status only |
| B6 | Drug description text | mock-up shows a description | `label.description`; hide the line if null |
| B7 | Refresh token or longer session | JWT expires after 60 min | on 401, clear session and send to `/auth?redirect=…` |
| B8 | `GET /auth/me` (optional) | session restore | `GET /profile` (same `UserResponse`) |
