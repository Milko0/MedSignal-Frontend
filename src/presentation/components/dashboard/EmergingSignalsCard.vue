<script setup>
// FR-06: emerging signals of the latest quarter (title shows the quarter the backend actually used).
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import Sparkline from '@/presentation/components/charts/Sparkline.vue'

const props = defineProps({
  data: { type: Object, default: null },        // SignalList from useDashboardStore.emerging
  loading: Boolean,
  error: { type: Object, default: null },
})
defineEmits(['retry'])

const router = useRouter()
const rows = computed(() => props.data?.items ?? [])
const quarter = computed(() => props.data?.quarter)
// The card lists pairs with 3 or more reports, but the explorer defaults to 20 and to Evans-criteria pairs only, so the
// link carries both settings or a pair with few reports would open to an empty list.
const target = (s) => ({ path: '/signals', query: { rxcui: s.rxcui, drug: s.drug, reaction: s.reaction, min: '3', all: '1' } })
const open = (s) => router.push(target(s))
</script>

<template>
  <section class="card" aria-labelledby="emerging-title">
    <header class="head">
      <h2 id="emerging-title">Emerging signals<template v-if="quarter"> · {{ quarter }}</template></h2>
      <RouterLink :to="{ path: '/signals', query: { tab: 'emerging' } }">Open signals</RouterLink>
    </header>

    <p v-if="error && !rows.length" class="state error" role="alert">
      Could not load emerging signals.
      <button type="button" class="link" @click="$emit('retry')">Retry</button>
    </p>
    <p v-else-if="loading && !rows.length" class="state muted" role="status">Loading…</p>
    <p v-else-if="!rows.length" class="state muted">No emerging signals{{ quarter ? ` in ${quarter}` : '' }} yet.</p>

    <table v-else>
      <thead>
        <tr><th>Drug</th><th>Reaction</th><th class="num">Reports</th><th class="num">PRR</th><th>Trend</th></tr>
      </thead>
      <tbody>
        <tr v-for="s in rows" :key="`${s.rxcui}-${s.reaction}`" class="row" @click="open(s)">
          <td><RouterLink :to="target(s)" @click.stop>{{ s.drug }}</RouterLink></td>
          <td>{{ s.reaction }}</td>
          <td class="num">{{ s.reports }}</td>
          <td class="num">{{ s.prr.toFixed(2) }}</td>
          <td><Sparkline :values="s.trend" /></td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.head { display: flex; justify-content: space-between; align-items: baseline; gap: var(--s-4); margin-bottom: var(--s-2); }
h2 { margin: 0; }
.head a { font-size: var(--fs-md); font-weight: 500; }
.card { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: var(--fs-md); }
th { text-align: left; font-weight: 500; font-size: var(--fs-xs); letter-spacing: .02em; color: var(--ink-2); padding: var(--s-2) var(--s-3); border-bottom: 1px solid var(--line-strong); white-space: nowrap; }
td { padding: .625rem var(--s-3); border-bottom: 1px solid var(--line); vertical-align: middle; }
tbody tr:last-child td { border-bottom: 0; }
.num { text-align: right; }
td.num { font-family: var(--font-mono); font-size: var(--fs-sm); }
.row { cursor: pointer; transition: background-color var(--t-fast); }
.row:hover { background: var(--accent-soft); }
.state { margin: var(--s-2) 0; }
.error { color: var(--coral); }
.link { background: none; border: 0; padding: 0; color: var(--accent); font: inherit; text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
</style>
