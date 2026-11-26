<script setup>
import { ADMIN_SECTIONS } from '@/core/constants/admin'
</script>

<template>
  <div class="admin">
    <header class="head">
      <h1>Administration</h1>
      <p class="muted">Manage accounts, data and updates. Changes here act on the live database.</p>
    </header>
    <nav class="tabs" aria-label="Administration sections">
      <RouterLink v-for="s in ADMIN_SECTIONS" :key="s.to" :to="s.to">{{ s.label }}</RouterLink>
    </nav>
    <RouterView />
  </div>
</template>

<style scoped>
.head { margin-bottom: var(--s-4); }
.head h1 { margin: 0; }
.head p { margin: var(--s-1) 0 0; }
.tabs { display: flex; flex-wrap: wrap; gap: var(--s-1) var(--s-5); border-bottom: 1px solid var(--line); margin-bottom: var(--s-5); }
.tabs a { color: var(--ink-2); font-weight: 500; padding: var(--s-2) 0; border-bottom: 2px solid transparent; margin-bottom: -1px; }
.tabs a:hover { color: var(--ink); text-decoration: none; }
.tabs a.router-link-active { color: var(--ink); border-bottom-color: var(--accent); }
</style>
