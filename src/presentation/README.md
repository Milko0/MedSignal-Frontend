# presentation

Vue views, layouts, components, router and styles for the 6 mock-up views.

## Tools used

- Vue 3 (Composition API, `<script setup>`)
- Vue Router 4 (guards: guest vs authenticated)
- CSS custom properties (`styles/tokens.css`)

## Rules

- Reads state from stores; never calls Axios directly.
- Every screen with signals or statistics shows `DisclaimerFooter` (NFR-11). The view renders it, with the `meta.disclaimer` of its response when it has one; `AppLayout` does not.
- `DrugDetailView` loads the overview first; the trend and the alternatives then load and fail on their own (own Retry). Another `rxcui` in the URL reloads the page. Follow is optimistic and rolls back when the server refuses.
- `SignalsView` keeps the tab, filters and page in the URL (`/signals?tab=&rxcui=&drug=&reaction=&quarter=&min=&all=1&page=`): it reads `route.query` into `useSignalStore.applyQuery` and writes every change back with `router.push`. The filter bar edits a draft that only "Apply filters" sends. The statistics charts describe the same drug and quarter as the table and reload only when those change.
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
