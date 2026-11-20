<script setup>
// FR-04: one page of signals: PRR, CI lower bound, chi-square, label status, trend. The backend sorts and pages;
// the column headers sort the rows of the CURRENT page only (the tooltip says so).
import { computed, ref } from 'vue'
import PRRBadge from '@/presentation/components/signals/PRRBadge.vue'
import LabelGapChip from '@/presentation/components/signals/LabelGapChip.vue'
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
  { key: 'prr', label: 'PRR', num: true },
  { key: 'ciLower', label: 'CI lower', num: true },
  { key: 'chiSquare', label: 'Chi-square', num: true },
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
const fmt = (n, digits) => (Number.isFinite(n) ? n.toFixed(digits) : '–')
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
            <th>Trend</th>
            <th><span class="sr-only">Reports</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in rows" :key="rowKey(s)">
            <td><RouterLink :to="{ name: 'drug', params: { rxcui: s.rxcui } }">{{ s.drug }}</RouterLink></td>
            <td class="reaction">{{ s.reaction }}<span v-if="s.isEmerging" class="emerging" title="PRR rose against earlier quarters">Emerging</span></td>
            <td class="num">{{ s.reports }}</td>
            <td class="num"><PRRBadge :prr="s.prr" /></td>
            <td class="num">{{ fmt(s.ciLower, 2) }}</td>
            <td class="num">{{ fmt(s.chiSquare, 1) }}</td>
            <td><LabelGapChip :label-match="s.labelMatch" /></td>
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
.scroll { overflow-x: auto; transition: opacity .15s; }
.scroll.dim { opacity: .55; }
table { width: 100%; border-collapse: collapse; font-size: .9rem; }
th { text-align: left; font-size: .78rem; color: var(--muted); padding: .35rem .5rem; border-bottom: 1px solid var(--line); white-space: nowrap; }
td { padding: .5rem; border-bottom: 1px solid var(--line); vertical-align: middle; }
.num { text-align: right; font-variant-numeric: tabular-nums; }
.sort { background: none; border: 0; padding: 0; font: inherit; font-weight: 600; color: inherit; cursor: pointer; }
.sort:hover { color: var(--ink); }
.reaction { overflow-wrap: anywhere; }
.emerging { margin-left: .4rem; background: var(--coral-soft); color: var(--coral); border-radius: 999px; padding: 0 .5rem; font-size: .72rem; white-space: nowrap; }
.reports { background: none; border: 1px solid var(--teal); color: var(--teal); border-radius: 8px; padding: .25rem .6rem; font: inherit; font-size: .82rem; cursor: pointer; white-space: nowrap; }
.reports:hover { background: var(--teal-soft); }
.pager { display: flex; align-items: center; justify-content: center; gap: 1rem; margin-top: .9rem; }
.pager .btn:disabled { opacity: .45; cursor: not-allowed; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
