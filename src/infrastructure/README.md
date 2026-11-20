# infrastructure

HTTP client, API adapters, mappers, token storage.

## Tools used

- Axios (JWT header, error normalisation)
- `localStorage` for the token

## Rules

- Imports core only (and domain typedefs).
- Mappers convert API snake_case JSON to domain camelCase models. One pure mapper per backend DTO, each with a test fed by `tests/helpers/fixtures.js`.
- Adapters call the HTTP client **and** the mapper: they return models, never raw JSON. Signal and label-gap envelopes are unwrapped (`{ ...model, disclaimer }`).
- One adapter file per backend router; endpoints match `/api` in the backend Swagger.
- The HTTP client does not know about storage or sessions: `configureHttp({ getToken, onUnauthorized })` is called from `composition/container.js`.
- Every failed request rejects with an `ApiError` (`status`, `message`, `fieldErrors`; status 0 = no response).

## Contents

| Item | Role |
|---|---|
| `http/httpClient.js` | Axios instance, token getter, 401 hook, error conversion |
| `http/apiError.js` | `ApiError` and `toApiError` (FastAPI `detail` string / 422 array) |
| `http/query.js` | `toQuery`: camelCase to snake_case, drops null / undefined / empty strings |
| `api/` | authApi, drugsApi, shortagesApi, signalsApi, statisticsApi, cabinetApi, profileApi |
| `mappers/` | common (page, envelope), user, drug, trend, labelGap, alternative, signal, report, statistics, cabinet, alert, profile |
| `storage/tokenStorage.js` | JWT storage |
