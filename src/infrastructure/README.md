# infrastructure

HTTP client, API adapters, mappers, token storage.

## Tools used

- Axios (JWT header, 401 handling)
- `localStorage` for the token

## Rules

- Imports core only (and domain typedefs).
- Mappers convert API snake_case JSON to domain camelCase models.
- One adapter file per backend router; endpoints match `/api/v1` in the backend Swagger.

## Contents

| Item | Role |
|---|---|
| `http/httpClient.js` | Axios instance |
| `api/` | authApi, drugsApi, signalsApi, statisticsApi, cabinetApi, profileApi |
| `mappers/` | drug, signal, alert |
| `storage/tokenStorage.js` | JWT storage |
