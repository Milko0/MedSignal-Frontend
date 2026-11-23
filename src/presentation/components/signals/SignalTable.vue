<script setup>
// FR-04: one page of signals in plain terms: reports, label status, shortage status, trend. The backend ranks the
// pairs by PRR (strongest first) and pages them; the PRR itself is not shown, guests would not read it. The column
// headers sort the rows of the CURRENT page only (the tooltip says so).
import { computed, ref } from 'vue'
import LabelGapChip from '@/presentation/components/signals/LabelGapChip.vue'
import StatusChip from '@/presentation/components/common/StatusChip.vue'
import Sparkline from '@/presentation/components/charts/Sparkline.vue'

const props = defineProps({
  signals: { type: Array, default: () => [] },
  total: { type: Number, default: 0 },
  page: { type: Number, default: 1 },
  totalPages: { type: Number, default: 1 },
  loading: Boolean,
})
const emit = defineEmits(['view-reports', 'page'])

const COLUMNS = [
  { key: 'drug', label: 'Drug' },
  { key: 'reaction', label: 'Reaction' },
  { key: 'reports', label: 'Reports', num: true },
]
const SORT_TIP = 'Sorts the rows on this page only'

const sort = ref({ key: null, dir: 'desc' })
function toggleSort(key) {
  const s = sort.value
  if (s.key !== key) sort.value = { key, dir: key === 'drug' || key === 'reaction' ? 'asc' : 'desc' }
  else if (s.dir === (key === 'drug' || key === 'reaction' ? 'asc' : 'desc')) sort.value = { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
  else sort.value = { key: null, dir: 'desc' }
}
const ariaSort = (key) => (sort.value.key !== key ? 'none' : sort.value.dir === 'asc' ? 'ascending' : 'descending')

const rows = computed(() => {
  const { key, dir } = sort.value
  if (!key) return props.signals
  const sign = dir === 'asc' ? 1 : -1
  return [...props.signals].sort((a, b) => {
    const x = a[key], y = b[key]
    return (typeof x === 'string' ? x.localeCompare(y) : x - y) * sign
  })
})

const rowKey = (s) => `${s.rxcui}|${s.reaction}|${s.quarter}`
const showShortage = computed(() => props.signals.some((s) => typeof s.inShortage === 'boolean'))
// A drug never on the FDA list: a neutral "No shortage" chip (not "available": we cannot know that).
const SHORTAGE_CHIP = { CURRENT: { status: 'in_shortage' }, TO_BE_DISCONTINUED: { status: 'TO_BE_DISCONTINUED' },
  RESOLVED: { status: 'RESOLVED', label: 'Shortage resolved' } }
const shortageChip = (s) => SHORTAGE_CHIP[s.shortageStatus] ?? (s.inShortage ? SHORTAGE_CHIP.CURRENT : null)
const hasPrev = computed(() => props.page > 1)
const hasNext = computed(() => props.page < props.totalPages)
</script>

<template>
  <div class="signals" :aria-busy="loading">
    <div class="scroll" :class="{ dim: loading }">
      <table>
        <thead>
          <tr>
            <th v-for="c in COLUMNS" :key="c.key" :class="{ num: c.num }" :aria-sort="ariaSort(c.key)">
              <button type="button" class="sort" :title="SORT_TIP" @click="toggleSort(c.key)">
                {{ c.label }}<span class="arrow" aria-hidden="true">{{ sort.key === c.key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '' }}</span>
              </button>
            </th>
            <th>In label</th>
            <th v-if="showShortage">Shortage</th>
            <th>Trend</th>
            <th><span class="sr-only">Reports</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in rows" :key="rowKey(s)">
            <td><RouterLink :to="{ name: 'drug', params: { rxcui: s.rxcui } }">{{ s.drug }}</RouterLink></td>
            <td class="reaction">{{ s.reaction }}<span v-if="s.isEmerging" class="emerging" title="Reported clearly more than in earlier quarters">Emerging</span></td>
            <td class="num">{{ s.reports }}</td>
            <td><LabelGapChip :label-match="s.labelMatch" /></td>
            <td v-if="showShortage">
              <StatusChip v-if="shortageChip(s)" :status="shortageChip(s).status" :label="shortageChip(s).label" />
              <StatusChip v-else status="none" label="No shortage" tone="slate" title="Not on the FDA shortage list" />
            </td>
            <td><Sparkline :values="s.trend" /></td>
            <td><button type="button" class="reports" @click="emit('view-reports', s)">View reports</button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <nav class="pager" aria-label="Pages">
      <button type="button" class="btn outline" :disabled="!hasPrev || loading" @click="emit('page', page - 1)">Previous</button>
      <span class="muted" aria-live="polite">Page {{ page }} of {{ Math.max(totalPages, 1) }} · {{ total }} {{ total === 1 ? 'pair' : 'pairs' }}</span>
      <button type="button" class="btn outline" :disabled="!hasNext || loading" @click="emit('page', page + 1)">Next</button>
    </nav>
  </div>
</template>

<style scoped>
.scroll { overflow-x: auto; transition: opacity var(--t-fast); }
.scroll.dim { opacity: .55; }
table { width: 100%; border-collapse: collapse; font-size: var(--fs-md); }
th { text-align: left; font-weight: 500; font-size: var(--fs-xs); letter-spacing: .02em; color: var(--ink-2); padding: var(--s-2) var(--s-3); border-bottom: 1px solid var(--line-strong); white-space: nowrap; }
td { padding: .625rem var(--s-3); border-bottom: 1px solid var(--line); vertical-align: middle; }
tbody tr:last-child td { border-bottom: 0; }
.num { text-align: right; }
td.num { font-family: var(--font-mono); font-size: var(--fs-sm); }
.sort { background: none; border: 0; padding: 0; font: inherit; font-weight: 500; color: inherit; cursor: pointer; transition: color var(--t-fast); }
.sort:hover { color: var(--accent); }
.reaction { overflow-wrap: anywhere; min-width: 10rem; }
.emerging { margin-left: var(--s-2); border: 1px solid color-mix(in srgb, var(--coral) 45%, transparent); color: var(--coral); border-radius: var(--radius-sm); padding: 0 .375rem; font-size: var(--fs-xs); font-weight: 500; white-space: nowrap; }
.reports { background: none; border: 1px solid var(--line-strong); color: var(--accent); border-radius: var(--radius-sm); padding: .25rem .625rem; font: inherit; font-size: var(--fs-sm); font-weight: 500; cursor: pointer; white-space: nowrap; transition: background-color var(--t-fast), border-color var(--t-fast); }
.reports:hover { background: var(--accent-soft); border-color: var(--accent); }
.pager { display: flex; align-items: center; justify-content: center; gap: var(--s-4); margin-top: var(--s-4); font-size: var(--fs-md); }
.pager .btn:disabled { opacity: .45; cursor: not-allowed; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
