# Admin section: what to build

Every endpoint below already exists in the backend (Swagger, tag "Admin"). They answer 401 without a token and 403 to
any account whose role is not `admin`, so the frontend only has to show or hide the screens; the security is on the
server. Admins are never created from the web: the first one comes from `scripts/create_admin.py` on the server, the
next ones from the Users screen below.

## Running the backend for this work

Docker Desktop running, both repositories pulled side by side (`MedSignal-Backend`, `MedSignal-Frontend`), and the
dataset from the GitHub release unzipped into `MedSignal-Backend/data/clean`. From `MedSignal-Backend`:

```bash
docker compose -f deploy/docker-compose.local.yml up -d                          # databases (first time: replica set)
docker compose -f deploy/docker-compose.local.yml --profile seed run --rm seed     # first time only: load the data (~3 min)
docker compose -f deploy/docker-compose.local.yml --profile app up -d --build      # API, worker, frontend (rebuild after a pull)
docker compose -f deploy/docker-compose.local.yml exec -it api python scripts/create_admin.py --username admin --email admin@medsignal.local
```

The last command asks for a password and creates your local admin (or `--promote <your username>`). Then log in with
it; an account that was already logged in needs to log out and in again to get the admin role.

- API and Swagger: http://localhost:8001/docs (press Authorize with the admin token to try every admin endpoint).
- Frontend in Docker: http://localhost:8080 (the built image; rebuild to see your changes). While developing, run the
  Vite dev server against the Docker API instead, from `MedSignal-Frontend` (keep `VITE_API_BASE_URL=/api`):

  ```powershell
  npm install
  $env:API_PROXY_TARGET="http://localhost:8001"; npm run dev
  ```

  Open http://localhost:5173; it reloads on every save. (macOS / Linux: `API_PROXY_TARGET=http://localhost:8001 npm run dev`.)
- Stop: `docker compose -f deploy/docker-compose.local.yml --profile app down` (the data stays).

## 0. Groundwork

- Route `/admin` with child routes, `meta: { requiresAuth: true, requiresAdmin: true }`.
- Router guard: `requiresAdmin` and `!auth.isAdmin` (already in `useAuthStore`) -> redirect to the dashboard. A 403
  from the API shows "Admins only" instead of logging the user out (only 401 clears the token).
- "Admin" link in the header, shown only when `auth.isAdmin`.
- `src/infrastructure/api/adminApi.js`, an `adminService` and a `useAdminStore`, wired in `composition/container.js`,
  following the existing layering (mappers snake_case -> camelCase).
- After a user is promoted, their role changes only with a new token: say "log out and in again".

## 1. Data updates (FR-19, FR-20, FR-21): the most useful screen

| Item | Endpoint | Notes |
|---|---|---|
| Run history table | `GET /api/admin/ingestion/runs` | Type, source, started/ended, loaded, skipped, errors, stats (e.g. `labels_changed`, `labels_untracked`, `since`, quarters dropped). Newest first, auto-refresh every ~5 s while a job runs |
| "Update shortages, labels and recalls now" | `POST /api/admin/ingestion/incremental?since_days=` | Answers 202 at once; 409 = "already running" (show it, disable the button). Optional "last N days" field (1-365, default 30). Explain that the worker already does this every day at 03:00 / 04:00 |
| Loaded quarters | `GET /api/admin/ingestion/quarters` | `{window_quarters: 6, quarters: ["2025Q2", ..., "2026Q3"]}`, oldest first. Show them as chips: "the 6 quarters in the database" |
| Files ready to load | `GET /api/admin/ingestion/faers-files` | `[{name, quarter, size_mb, modified_at, quarter_loaded}]`, newest quarter first. A checkbox list; files whose `quarter_loaded` is false are the new ones (pre-select them) |
| Preview before loading | `GET /api/admin/ingestion/quarters?adding=2026Q4` | Adds `would_drop: ["2025Q2"]`: show "Loading 2026Q4 will remove 2025Q2 (reports and signals)" in the confirmation dialog. 422 if `adding` is not a quarter |
| "Load new FAERS quarter" | `POST /api/admin/ingestion/faers` `{files, window_quarters}` | Send the selected `name`s. 202 = started; 409 = a load is already running; 422 = file missing. Warn: long job (new drug names are resolved through RxNav); signals of every quarter are recomputed |

How a new quarter arrives: about four times a year someone runs `python -m scripts.download_faers --latest 6
--parts-per-quarter 2 --prune` on the server, which puts the new files in `data/faers`; the screen above then lists them.

## 2. Excluded reaction terms (FR-26)

| Item | Endpoint |
|---|---|
| List | `GET /api/admin/excluded-terms` |
| Add a term | `POST /api/admin/excluded-terms` |
| Remove a term | `DELETE /api/admin/excluded-terms/{term}` |

Note on screen: changing the list affects the signals only after the next signal computation (FAERS load).

## 3. Reconciliation (FR-27)

- Button "Rebuild live data from MongoDB": `POST /api/admin/reconciliation`; show the result (summaries rebuilt).
- Short explanation: use it if Redis was emptied or looks out of date.

## 4. Users (FR-25)

| Item | Endpoint | Notes |
|---|---|---|
| Paginated table | `GET /api/admin/users` | username, email, role. Passwords are never returned |
| Create user or admin | `POST /api/admin/users` | role selector `user` / `admin` |
| Edit | `PUT /api/admin/users/{id}` | username, email, role, reset password |
| Delete | `DELETE /api/admin/users/{id}` | Confirmation dialog; also removes their follows and alerts |

The backend refuses (422) to demote or delete the last admin: show its message.

## 5. Data records (FR-22 to FR-24): lower priority

Generic table + form, one per collection, since the API shape is the same (`list`, `get`, `create`, `update`,
`delete`):

- Reports: `/api/admin/reports` (newest first; mostly view and delete).
- Labels: `/api/admin/labels`.
- Shortages: `/api/admin/shortages` (editing one refreshes the cached shortage status at once).

A JSON editor per record is enough for the course; nicer forms are optional.

## 6. Tests to add

- Router guard: user -> redirected from `/admin`; admin -> allowed; guest -> login.
- `adminService`: 202 / 409 / 422 handling, polling of runs.
- Users screen: last-admin 422 message shown, delete confirmation.
