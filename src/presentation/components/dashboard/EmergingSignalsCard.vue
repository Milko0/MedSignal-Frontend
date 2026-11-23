<script setup>
// FR-06: emerging signals of the latest quarter (title shows the quarter the backend actually used).
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import Sparkline from '@/presentation/components/charts/Sparkline.vue'
import StatusChip from '@/presentation/components/common/StatusChip.vue'
import { EMERGING_MIN_REPORTS } from '@/application/stores/useDashboardStore'

const props = defineProps({
  data: { type: Object, default: null },        // SignalList from useDashboardStore.emerging
  loading: Boolean,
  error: { type: Object, default: null },
})
defineEmits(['retry'])

const router = useRouter()
const rows = computed(() => props.data?.items ?? [])
const quarter = computed(() => props.data?.quarter)
// The card lists pairs with EMERGING_MIN_REPORTS or more reports, but the explorer defaults to 20 and to Evans-criteria pairs only, so the
// link carries both settings or a pair with few reports would open to an empty list.
const target = (s) => ({ path: '/signals', query: { rxcui: s.rxcui, drug: s.drug, reaction: s.reaction, min: String(EMERGING_MIN_REPORTS), all: '1' } })
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
        <tr><th>Drug</th><th>Reaction</th><th class="num">Reports</th><th class="trend">Trend</th></tr>
      </thead>
      <tbody>
        <tr v-for="s in rows" :key="`${s.rxcui}-${s.reaction}`" class="row" @click="open(s)">
          <td class="drug">
            <RouterLink :to="target(s)" @click.stop>{{ s.drug }}</RouterLink>
            <StatusChip v-if="s.inShortage" status="in_shortage" class="chip" />
          </td>
          <td class="reaction">{{ s.reaction }}</td>
          <td class="num">{{ s.reports }}</td>
          <td class="trend"><Sparkline :values="s.trend" /></td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.head { display: flex; justify-content: space-between; align-items: baseline; gap: var(--s-4); margin-bottom: var(--s-2); }
h2 { margin: 0; }
.head a { font-size: var(--fs-md); font-weight: 500; }
/* Fixed layout: the columns share the card width and long reaction names wrap, so the card never scrolls sideways. */
table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: var(--fs-md); }
th:nth-child(1) { width: 27%; }
th:nth-child(3) { width: 4.5rem; }
th.trend { width: 5.5rem; }
.drug, .reaction { overflow-wrap: break-word; hyphens: auto; }
.chip { display: table; margin-top: var(--s-1); }
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
