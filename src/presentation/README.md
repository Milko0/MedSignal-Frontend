# presentation

Vue views, layouts, components, router and styles for the 6 mock-up views.

## Tools used

- Vue 3 (Composition API, `<script setup>`)
- Vue Router 4 (guards: guest vs authenticated)
- CSS custom properties (`styles/tokens.css`)

## Rules

- Reads state from stores; never calls Axios directly.
- Every screen with signals or statistics shows `DisclaimerFooter` (NFR-11). The view renders it, with the `meta.disclaimer` of its response when it has one; `AppLayout` does not.
- `DrugSearchBox` keeps its results in `useDrugStore` but shows them only for the text typed in that box, so the navbar and the dashboard boxes never show each other's dropdown.
- Palette: teal actions, amber shortage, coral safety signals, green available.

## Contents

| Item | Role |
|---|---|
| `views/` | AuthView, DashboardView, DrugDetailView, SignalsView, MedicineCabinetView, ProfileView |
| `layouts/` | AppLayout (navbar), AuthLayout |
| `components/` | common, drug, dashboard, signals, shortages, cabinet, charts |
| `router/` | routes, guards |
| `composables/` | useDebouncedSearch (300 ms, >= 2 characters, `flush()` for Enter), useAsyncState |
