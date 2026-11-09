# presentation

Vue views, layouts, components, router and styles for the 6 mock-up views.

## Tools used

- Vue 3 (Composition API, `<script setup>`)
- Vue Router 4 (guards: guest vs authenticated)
- CSS custom properties (`styles/tokens.css`)

## Rules

- Reads state from stores; never calls Axios directly.
- Every screen with signals or statistics shows `DisclaimerFooter` (NFR-11).
- Palette: teal actions, amber shortage, coral safety signals, green available.

## Contents

| Item | Role |
|---|---|
| `views/` | AuthView, DashboardView, DrugDetailView, SignalsView, MedicineCabinetView, ProfileView |
| `layouts/` | AppLayout (navbar + footer), AuthLayout |
| `components/` | common, drug, signals, shortages, cabinet, charts |
| `router/` | routes, guards |
| `composables/` | useDebouncedSearch, useAsyncState |
