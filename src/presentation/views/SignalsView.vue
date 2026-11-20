<script setup>
// View 4 - Signals and statistics (FR-04 to FR-09). The URL holds the tab, filters and page; this view reads
// route.query into the store and writes every change back with router.push, so links (also from the dashboard),
// reload and back/forward restore the same view. Charts below still use SAMPLE data until the statistics commit.
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSignalStore } from '@/application/stores/useSignalStore'
import { defaultFilters, describeEmpty, effectiveMinReports, filtersFromQuery, queryFromFilters } from '@/domain/rules/signalFilters'
import { formatPercent } from '@/domain/rules/percent'
import FilterBar from '@/presentation/components/signals/FilterBar.vue'
import SignalTabs from '@/presentation/components/signals/SignalTabs.vue'
import SignalTable from '@/presentation/components/signals/SignalTable.vue'
import ReportsDrawer from '@/presentation/components/signals/ReportsDrawer.vue'
import LabelGapsTable from '@/presentation/components/signals/LabelGapsTable.vue'
import AgeBarChart from '@/presentation/components/charts/AgeBarChart.vue'
import DonutChart from '@/presentation/components/charts/DonutChart.vue'
import TrendChart from '@/presentation/components/charts/TrendChart.vue'
import DisclaimerFooter from '@/presentation/components/common/DisclaimerFooter.vue'

const route = useRoute()
const router = useRouter()
const signals = useSignalStore()

const draft = ref(defaultFilters())   // what the filter bar edits; applied on "Apply filters"

watch(
  () => route.query,
  (query) => {
    draft.value = filtersFromQuery(query)
    signals.applyQuery(query)
  },
  { immediate: true },
)
onMounted(() => signals.loadQuarters())

// Writes filters to the URL (the watcher then loads). The same query again is not a navigation, so reload by hand:
// "Apply" on unchanged filters is how a user asks for fresh data.
function go(filters) {
  const query = queryFromFilters(filters)
  const same = JSON.stringify(query) === JSON.stringify(queryFromFilters(filtersFromQuery(route.query)))
  if (same) signals.loadTable()
  else router.push({ query })
}
const setTab = (tab) => go({ ...signals.filters, tab, page: 1 })
const apply = () => go({ ...draft.value, page: 1 })
const reset = () => go({ ...defaultFilters(), tab: signals.filters.tab })
const goToPage = (page) => go({ ...signals.filters, page })

const emptyMessage = computed(() => describeEmpty(signals.filters, signals.usedQuarter))
const isList = computed(() => signals.filters.tab !== 'gaps')
const minReports = computed(() => effectiveMinReports(signals.filters))

const age = { '0-17': 8000, '18-44': 21000, '45-64': 30000, '65-74': 23500, '75+': 18500 }
const sex = { Female: 58, Male: 39, Unknown: 3 }
const quarters = ['Q2 25', 'Q3 25', 'Q4 25', 'Q1 26', 'Q2 26', 'Q3 26']
const serious = [
  { reaction: 'All reports', months: quarters, counts: [100, 108, 112, 114, 116, 118] },
  { reaction: 'Serious', months: quarters, counts: [32, 35, 38, 40, 42, 44] },
]
</script>

<template>
  <h1>Signals and statistics</h1>
  <p class="muted">Drug and reaction pairs reported more often than expected.</p>

  <SignalTabs :model-value="signals.filters.tab" class="tabs" @update:model-value="setTab" />
  <FilterBar v-model="draft" :quarters="signals.quarters" @apply="apply" @reset="reset" />

  <p v-if="signals.list" class="summary muted">
    <span v-if="signals.usedQuarter">Quarter: {{ signals.usedQuarter }}<template v-if="!signals.filters.quarter"> (latest)</template> · </span>
    {{ signals.list.total }} {{ signals.list.total === 1 ? 'pair' : 'pairs' }}
    <span v-if="signals.matchCoverage > 0"> · based on {{ formatPercent(signals.matchCoverage) }} of reports matched to an ingredient</span>
  </p>

  <section v-if="isList" class="card results" aria-label="Signals">
    <p v-if="signals.tableError" class="error" role="alert">
      Could not load signals.
      <button type="button" class="link" @click="signals.loadTable()">Retry</button>
    </p>
    <p v-else-if="signals.tableLoading && !signals.list" class="muted" role="status">Loading…</p>
    <template v-else-if="signals.list">
      <p v-if="signals.list.total === 0" class="muted">{{ emptyMessage }}</p>
      <p v-else-if="signals.list.items.length === 0" class="muted">
        Page {{ signals.filters.page }} is past the last page ({{ signals.list.totalPages }}).
        <button type="button" class="link" @click="goToPage(1)">Go to page 1</button>
      </p>
      <SignalTable
        v-else
        :signals="signals.list.items"
        :total="signals.list.total"
        :page="signals.list.page"
        :total-pages="signals.list.totalPages"
        :loading="signals.tableLoading"
        @page="goToPage"
        @view-reports="signals.openReports"
      />
    </template>
  </section>

  <section v-else class="card results" aria-label="Label gaps">
    <p v-if="signals.needsDrug" class="muted">Choose a drug to see its label gaps.</p>
    <p v-else-if="signals.tableError" class="error" role="alert">
      Could not load the label gaps.
      <button type="button" class="link" @click="signals.loadTable()">Retry</button>
    </p>
    <p v-else-if="signals.tableLoading && !signals.labelGaps" class="muted" role="status">Loading…</p>
    <template v-else-if="signals.labelGaps">
      <h2 class="gaps-title">
        Label gaps for
        <RouterLink :to="{ name: 'drug', params: { rxcui: signals.filters.rxcui } }">{{ signals.drugName ?? `RxCUI ${signals.filters.rxcui}` }}</RouterLink>
      </h2>
      <LabelGapsTable :data="signals.labelGaps" :min-reports="minReports" />
    </template>
  </section>

  <div class="grid two">
    <section class="card"><h3>Reports by age group (sample)</h3><AgeBarChart :groups="age" /></section>
    <section class="card"><h3>Reports by sex (sample)</h3><DonutChart :values="sex" /></section>
    <section class="card"><h3>Serious reports over time (sample)</h3><TrendChart :series="serious" /></section>
  </div>
  <ReportsDrawer :drawer="signals.reportsDrawer" @close="signals.closeReports" @page="signals.loadReportsPage" />
  <DisclaimerFooter :text="signals.disclaimer ?? undefined" />
</template>

<style scoped>
.tabs { margin: 1rem 0 .75rem; }
.summary { margin: .75rem 0; font-size: .88rem; }
.results { margin-bottom: 1rem; }
.gaps-title { font-size: 1.05rem; margin: 0 0 .5rem; }
.error { color: var(--coral); }
.link { background: none; border: 0; padding: 0; color: var(--teal); font: inherit; text-decoration: underline; cursor: pointer; }
</style>
