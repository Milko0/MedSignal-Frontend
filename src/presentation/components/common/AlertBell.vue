<script setup>
// FR-17: the bell of the navbar (users only). A count of the alerts and, on click, the newest five with a link to
// "My medicines". Reads the shared cabinet store, so it clears at once on logout.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useCabinetStore } from '@/application/stores/useCabinetStore'
import { alertLabel, alertTone } from '@/domain/rules/alertTone'
import { relativeTime } from '@/domain/rules/relativeTime'

const SHOWN = 5

const cabinet = useCabinetStore()
const open = ref(false)
const root = ref(null)

const count = computed(() => cabinet.unreadCount)
const badge = computed(() => (count.value > 9 ? '9+' : String(count.value)))
const newest = computed(() => cabinet.namedAlerts.slice(0, SHOWN))
const label = computed(() => (count.value ? `Alerts, ${count.value} ${count.value === 1 ? 'alert' : 'alerts'}` : 'Alerts, none'))

const closeOutside = (e) => { if (root.value && !root.value.contains(e.target)) open.value = false }
const closeOnEscape = (e) => { if (e.key === 'Escape') open.value = false }
onMounted(() => {
  document.addEventListener('click', closeOutside)
  document.addEventListener('keydown', closeOnEscape)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', closeOutside)
  document.removeEventListener('keydown', closeOnEscape)
})
</script>

<template>
  <div ref="root" class="bell">
    <button type="button" class="btn-bell" aria-haspopup="menu" :aria-expanded="open" :aria-label="label" @click="open = !open">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7" /><path d="M10 20a2 2 0 0 0 4 0" />
      </svg>
      <span v-if="count" class="dot" aria-hidden="true">{{ badge }}</span>
    </button>

    <div v-if="open" class="menu" role="menu" aria-label="Latest alerts">
      <p v-if="!newest.length" class="none muted">No alerts</p>
      <ul v-else>
        <li v-for="a in newest" :key="a.id" role="none">
          <RouterLink :to="{ name: 'drug', params: { rxcui: a.rxcui } }" role="menuitem" @click="open = false">
            <span class="tone" :class="alertTone(a.type)" aria-hidden="true" />
            <span class="text">
              <strong>{{ a.drugName }}</strong>: {{ alertLabel(a.type) }}
              <span class="msg muted">{{ a.message }}</span>
            </span>
            <time class="when muted" :datetime="a.createdAt">{{ relativeTime(a.createdAt) }}</time>
          </RouterLink>
        </li>
      </ul>
      <RouterLink class="all" to="/my-medicines" role="menuitem" @click="open = false">See all</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.bell { position: relative; }
.btn-bell { position: relative; display: grid; place-items: center; width: 2.125rem; height: 2.125rem; border: 0; border-radius: 50%; background: none; color: var(--ink-2); cursor: pointer; transition: background-color var(--t-fast), color var(--t-fast); }
.btn-bell:hover { background: var(--accent-soft); color: var(--ink); }
.dot { position: absolute; top: -.125rem; right: -.25rem; min-width: 1.125rem; height: 1.125rem; padding: 0 .25rem; border-radius: 999px; background: var(--ink); color: var(--card); box-shadow: 0 0 0 2px var(--card); font-family: var(--font-mono); font-size: var(--fs-xs); font-weight: 500; display: grid; place-items: center; line-height: 1; animation: pop var(--t-med) ease-out; }
.menu { position: absolute; right: 0; top: calc(100% + var(--s-2)); width: min(360px, 92vw); background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); box-shadow: var(--shadow); z-index: 30; padding: var(--s-1); }
.none { margin: 0; padding: var(--s-3); font-size: var(--fs-md); }
ul { list-style: none; margin: 0; padding: 0; }
li a { display: grid; grid-template-columns: auto 1fr auto; gap: var(--s-2); padding: var(--s-2) var(--s-3); border-radius: var(--radius-sm); color: var(--ink); font-size: var(--fs-md); }
li a:hover, .all:hover { background: var(--accent-soft); text-decoration: none; }
.tone { width: .5rem; height: .5rem; border-radius: 50%; margin-top: .45rem; }
.tone.teal { background: var(--teal); } .tone.amber { background: var(--amber); } .tone.coral { background: var(--coral); } .tone.green { background: var(--green); } .tone.slate { background: var(--slate); }
.msg { display: block; font-size: var(--fs-sm); color: var(--ink-2); overflow-wrap: anywhere; }
.when { font-size: var(--fs-xs); white-space: nowrap; margin-top: .125rem; }
.all { display: block; text-align: center; padding: var(--s-2); border-top: 1px solid var(--line); margin-top: var(--s-1); border-radius: 0 0 var(--radius-sm) var(--radius-sm); font-size: var(--fs-md); font-weight: 500; }
@keyframes pop { from { transform: scale(.6); opacity: 0; } to { transform: none; opacity: 1; } }
</style>
