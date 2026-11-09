<script setup>
import { useAuthStore } from '@/application/stores/useAuthStore'
import { useCabinetStore } from '@/application/stores/useCabinetStore'
import DrugSearchBox from '@/presentation/components/drug/DrugSearchBox.vue'

const auth = useAuthStore()
const cabinet = useCabinetStore()
</script>

<template>
  <header class="nav">
    <RouterLink to="/" class="brand">MedSignal</RouterLink>
    <nav>
      <RouterLink to="/">Dashboard</RouterLink>
      <RouterLink to="/signals">Signals &amp; statistics</RouterLink>
      <RouterLink v-if="auth.loggedIn" to="/my-medicines">My medicines <b>{{ cabinet.followed.length }}</b></RouterLink>
    </nav>
    <DrugSearchBox compact />
    <RouterLink v-if="auth.loggedIn" to="/profile" class="avatar">{{ auth.user?.username?.slice(0, 2).toUpperCase() ?? 'ME' }}</RouterLink>
    <RouterLink v-else to="/auth" class="btn outline">Log in</RouterLink>
  </header>
</template>

<style scoped>
.nav { display: flex; align-items: center; gap: 1.25rem; padding: .75rem 1.5rem; background: var(--card); border-bottom: 1px solid var(--line); }
.brand { font-weight: 700; color: var(--teal); }
nav { display: flex; gap: 1rem; flex: 1; }
nav a.router-link-exact-active { color: var(--ink); font-weight: 600; }
.avatar { background: var(--teal-soft); border-radius: 50%; width: 2rem; height: 2rem; display: grid; place-items: center; font-size: .8rem; }
</style>
