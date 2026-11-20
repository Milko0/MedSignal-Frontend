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
- `useCabinetStore` is the one source for the followed drugs and alerts: the navbar (count, `AlertBell`), the dashboard, Drug 360 and `MedicineCabinetView` all read it. `load()` is skipped while the lists are under a minute old, a request already on its way is shared, and logout resets it. Unfollow and dismiss are optimistic and roll back with a toast. Alerts are re-read when the window comes back (no polling).
- `SignalsView` keeps the tab, filters and page in the URL (`/signals?tab=&rxcui=&drug=&reaction=&quarter=&min=&all=1&page=`): it reads `route.query` into `useSignalStore.applyQuery` and writes every change back with `router.push`. The filter bar edits a draft that only "Apply filters" sends. The statistics charts describe the same drug and quarter as the table and reload only when those change.
- `ProfileView` is one page (menu anchors, no sub-routes). `ProfileForm` sends only the changed fields ("Save changes" stays disabled until something differs; 409 and 422 show under the field); `PasswordForm` opens inline and shows a wrong current password under that field without logging the user out; `AlertSettingsCard` edits a copy of the settings and sends them only on "Save settings"; `AccountCard` asks for the username before deleting and then goes to `/auth?deleted=1`. `useProfileStore` holds the alert settings; the user stays in `useAuthStore`.
- The minimum reports of the alert settings is the default of the `min` filter on `/signals` for a logged-in user (All and Label gaps tabs, not Emerging, which keeps 3) when the URL has no `min`. `SignalsView` passes it into `filtersFromQuery` as `defaults` and waits for the settings once, so the table loads one time.
- `DrugSearchBox` keeps its results in `useDrugStore` but shows them only for the text typed in that box, so the navbar and the dashboard boxes never show each other's dropdown.
- Palette: teal actions, amber shortage, coral safety signals, green available.

## Contents

| Item | Role |
|---|---|
| `views/` | AuthView, DashboardView, DrugDetailView, SignalsView, MedicineCabinetView, ProfileView |
| `layouts/` | AppLayout (navbar), AuthLayout |
| `components/` | common, drug, dashboard, signals, shortages, cabinet, profile, charts |
| `router/` | routes, guards |
| `composables/` | useDebouncedSearch (300 ms, >= 2 characters, `flush()` for Enter), useAsyncState |
