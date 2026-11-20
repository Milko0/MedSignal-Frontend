# application

Services (use-case logic) and Pinia stores (UI state).

## Tools used

- Pinia (setup stores, Composition API)
- Plain async functions for services

## Rules

- Imports domain and core. Never imports Axios, `infrastructure/` or components (`rg infrastructure src/application` must be empty).
- Services receive API adapters (and the session port for auth) as arguments, wired in `src/composition/container.js`. Adapters already return models, so services do no mapping.
- Stores call services only.

## Contents

| Item | Role |
|---|---|
| `services/` | auth, drug, signal, cabinet, profile |
| `stores/` | useAuthStore, useDrugStore, useSignalStore, useCabinetStore, useProfileStore, useDashboardStore, useUiStore |
