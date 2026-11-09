# application

Services (use-case logic) and Pinia stores (UI state).

## Tools used

- Pinia (setup stores, Composition API)
- Plain async functions for services

## Rules

- Imports domain and core. Never imports Axios or components.
- Services receive API adapters as arguments (wired in `src/composition/container.js`).
- Stores call services only.

## Contents

| Item | Role |
|---|---|
| `services/` | auth, drug, signal, cabinet, profile |
| `stores/` | useAuthStore, useDrugStore, useSignalStore, useCabinetStore, useUiStore |
