<script setup>
// Any URL that matches no route (the catch-all in routes.js). Shown inside AppLayout so the navbar and search stay.
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <section class="card state" aria-labelledby="nf-title">
    <h1 id="nf-title">Page not found</h1>
    <p class="muted">Nothing lives at <code>{{ route.fullPath }}</code>. The link may be old or mistyped.</p>
    <p class="links">
      <RouterLink to="/" class="btn">Go to the dashboard</RouterLink>
      <RouterLink to="/signals" class="btn outline">Browse signals</RouterLink>
    </p>
  </section>
</template>

<style scoped>
.state { max-width: 560px; margin: var(--s-6) auto; }
.muted { margin: var(--s-2) 0 0; }
code { font-family: var(--font-mono); font-size: var(--fs-sm); background: var(--slate-soft); color: var(--ink); border-radius: var(--radius-sm); padding: 0 .375rem; overflow-wrap: anywhere; }
.links { display: flex; flex-wrap: wrap; gap: var(--s-3); margin: var(--s-5) 0 0; }
.btn { text-decoration: none; display: inline-block; }
</style>
