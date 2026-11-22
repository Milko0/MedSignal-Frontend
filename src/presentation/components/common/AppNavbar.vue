<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/application/stores/useAuthStore'
import { useCabinetStore } from '@/application/stores/useCabinetStore'
import DrugSearchBox from '@/presentation/components/drug/DrugSearchBox.vue'
import AlertBell from '@/presentation/components/common/AlertBell.vue'

const auth = useAuthStore()
const cabinet = useCabinetStore()
const router = useRouter()

// Once after login or a restored session: the count of "My medicines" and the bell need the lists on every page.
// load() does nothing while they are fresh, and shares a request that is already on its way (the dashboard's).
watch(() => auth.loggedIn, (loggedIn) => { if (loggedIn) cabinet.load() }, { immediate: true })

const menuOpen = ref(false)
const account = ref(null)

async function logOut() {
  menuOpen.value = false
  await auth.logout()
  router.push({ name: 'dashboard' })
}

// Close the menu on a click elsewhere or on Escape.
const closeOutside = (e) => { if (account.value && !account.value.contains(e.target)) menuOpen.value = false }
const closeOnEscape = (e) => { if (e.key === 'Escape') menuOpen.value = false }
// No polling: when the window comes back, alerts older than a minute are read again.
const onVisible = () => { if (document.visibilityState === 'visible' && auth.loggedIn) cabinet.refreshAlerts() }
onMounted(() => {
  document.addEventListener('click', closeOutside)
  document.addEventListener('keydown', closeOnEscape)
  document.addEventListener('visibilitychange', onVisible)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', closeOutside)
  document.removeEventListener('keydown', closeOnEscape)
  document.removeEventListener('visibilitychange', onVisible)
})
</script>

<template>
  <header class="nav">
    <RouterLink to="/" class="brand">MedSignal</RouterLink>
    <nav>
      <RouterLink to="/">Dashboard</RouterLink>
      <RouterLink to="/signals">Signals &amp; statistics</RouterLink>
      <RouterLink v-if="auth.loggedIn" to="/my-medicines">My medicines <b>{{ cabinet.followedCount }}</b></RouterLink>
    </nav>
    <DrugSearchBox compact />
    <AlertBell v-if="auth.loggedIn" />
    <div v-if="auth.loggedIn" ref="account" class="account">
      <button class="avatar" type="button" aria-haspopup="menu" :aria-expanded="menuOpen"
              :aria-label="`Account menu for ${auth.user?.username ?? 'you'}`" @click="menuOpen = !menuOpen">
        {{ auth.initials }}
      </button>
      <div v-if="menuOpen" class="menu" role="menu">
        <p class="who">
          {{ auth.user?.username }}
          <span v-if="auth.isAdmin" class="tag">admin</span>
        </p>
        <RouterLink to="/profile" role="menuitem" @click="menuOpen = false">Profile</RouterLink>
        <button type="button" role="menuitem" @click="logOut">Log out</button>
      </div>
    </div>
    <RouterLink v-else to="/auth" class="btn outline">Log in</RouterLink>
  </header>
</template>

<style scoped>
.nav { display: flex; flex-wrap: wrap; align-items: center; gap: var(--s-2) var(--s-5); padding: .625rem var(--s-5); background: var(--card); border-bottom: 1px solid var(--line); }
.brand { font-family: var(--font-display); font-size: var(--fs-lg); font-weight: 600; letter-spacing: -.01em; color: var(--ink); }
.brand:hover { text-decoration: none; }
nav { display: flex; gap: var(--s-5); flex: 1; }
nav a { color: var(--ink-2); font-size: var(--fs-md); font-weight: 500; white-space: nowrap; padding: var(--s-1) 0; border-bottom: 2px solid transparent; transition: color var(--t-fast), border-color var(--t-fast); }
nav a:hover { color: var(--ink); text-decoration: none; }
nav a.router-link-exact-active { color: var(--ink); border-bottom-color: var(--accent); }
nav b { font-family: var(--font-mono); font-size: var(--fs-xs); font-weight: 500; background: var(--slate-soft); color: var(--ink); border-radius: var(--radius-sm); padding: 0 .375rem; margin-left: var(--s-1); }
.account { position: relative; }
.avatar { background: var(--accent-soft); color: var(--accent); border: 0; border-radius: 50%; width: 2rem; height: 2rem; display: grid; place-items: center; font: inherit; font-size: var(--fs-xs); font-weight: 600; cursor: pointer; transition: background-color var(--t-fast); }
.avatar:hover { background: color-mix(in srgb, var(--accent) 18%, var(--card)); }
.menu { position: absolute; right: 0; top: calc(100% + var(--s-2)); min-width: 10rem; display: flex; flex-direction: column; background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); padding: var(--s-1); box-shadow: var(--shadow); z-index: 10; }
.menu a, .menu button { padding: var(--s-2) var(--s-3); border: 0; background: none; border-radius: var(--radius-sm); text-align: left; font: inherit; font-size: var(--fs-md); color: var(--ink); cursor: pointer; }
.menu a:hover, .menu button:hover { background: var(--accent-soft); text-decoration: none; }
.who { margin: 0; padding: var(--s-2) var(--s-3); font-size: var(--fs-sm); color: var(--ink-2); border-bottom: 1px solid var(--line); }
.tag { background: var(--amber-soft); color: var(--amber); border-radius: var(--radius-sm); padding: 0 .375rem; margin-left: var(--s-1); font-size: var(--fs-xs); font-weight: 500; }
@media (max-width: 640px) { .nav { padding: var(--s-2) var(--s-4); gap: var(--s-2) var(--s-4); } nav { gap: var(--s-4); } }
</style>
