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
.nav { display: flex; align-items: center; gap: 1.25rem; padding: .75rem 1.5rem; background: var(--card); border-bottom: 1px solid var(--line); }
.brand { font-weight: 700; color: var(--teal); }
nav { display: flex; gap: 1rem; flex: 1; }
nav a.router-link-exact-active { color: var(--ink); font-weight: 600; }
.account { position: relative; }
.avatar { background: var(--teal-soft); color: var(--ink); border: 0; border-radius: 50%; width: 2rem; height: 2rem; display: grid; place-items: center; font: inherit; font-size: .8rem; cursor: pointer; }
.menu { position: absolute; right: 0; top: calc(100% + .4rem); min-width: 10rem; display: flex; flex-direction: column; background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); padding: .35rem; box-shadow: 0 4px 14px rgb(23 50 59 / 12%); z-index: 10; }
.menu a, .menu button { padding: .45rem .6rem; border: 0; background: none; border-radius: 6px; text-align: left; font: inherit; color: var(--ink); cursor: pointer; }
.menu a:hover, .menu button:hover { background: var(--teal-soft); }
.who { margin: 0; padding: .4rem .6rem; font-size: .8rem; color: var(--muted); border-bottom: 1px solid var(--line); }
.tag { background: var(--amber-soft); color: var(--amber); border-radius: 999px; padding: 0 .4rem; margin-left: .3rem; }
</style>
