<script setup>
// View 4 - Signals and statistics (FR-04 to FR-09). The URL holds the tab, filters and page; this view reads
// route.query into the store and writes every change back with router.push, so links (also from the dashboard),
// reload and back/forward restore the same view. The statistics charts describe the same drug and quarter as the table.
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/application/stores/useAuthStore'
import { useProfileStore } from '@/application/stores/useProfileStore'
import { useSignalStore } from '@/application/stores/useSignalStore'
import { defaultFilters, describeEmpty, effectiveMinReports, filtersFromQuery, queryFromFilters } from '@/domain/rules/signalFilters'
import { formatPercent } from '@/domain/rules/percent'
import { splitUnknown } from '@/domain/rules/statsShaping'
import FilterBar from '@/presentation/components/signals/FilterBar.vue'
import SignalTabs from '@/presentation/components/signals/SignalTabs.vue'
import SignalTable from '@/presentation/components/signals/SignalTable.vue'
import ReportsDrawer from '@/presentation/components/signals/ReportsDrawer.vue'
import LabelGapsTable from '@/presentation/components/signals/LabelGapsTable.vue'
import StatCard from '@/presentation/components/signals/StatCard.vue'
import SignalGlossary from '@/presentation/components/signals/SignalGlossary.vue'
import AgeBarChart from '@/presentation/components/charts/AgeBarChart.vue'
import DonutChart from '@/presentation/components/charts/DonutChart.vue'
import TrendChart from '@/presentation/components/charts/TrendChart.vue'
import DisclaimerFooter from '@/presentation/components/common/DisclaimerFooter.vue'

const route = useRoute()
const router = useRouter()
const signals = useSignalStore()
const auth = useAuthStore()
const profile = useProfileStore()

const draft = ref(defaultFilters())   // what the filter bar edits; applied on "Apply filters"

// A logged-in user's own "minimum reports" (alert settings) is the default of the filter when the URL has no `min`.
// The settings are read once (the profile store keeps them); until they are known the first load waits, so the table
// is not loaded twice. A failed read just means the usual defaults.
const defaults = computed(() => ({ minReports: auth.loggedIn ? profile.minReports : null }))
const settingsReady = ref(!auth.loggedIn || profile.loaded)
if (!settingsReady.value) profile.load().then(() => { settingsReady.value = true })

watch(
  [() => route.query, defaults, settingsReady],
  ([query, defaultValues, ready]) => {
    if (!ready) return
    draft.value = filtersFromQuery(query, defaultValues)
    signals.applyQuery(query, defaultValues)
  },
  { immediate: true },
)

// Writes filters to the URL (the watcher then loads). The same query again is not a navigation, so reload by hand:
// "Apply" on unchanged filters is how a user asks for fresh data.
function go(filters) {
  const query = queryFromFilters(filters)
  const same = JSON.stringify(query) === JSON.stringify(queryFromFilters(filtersFromQuery(route.query, defaults.value)))
  if (same) { signals.loadTable(); signals.loadStats() }
  else router.push({ query })
}
const setTab = (tab) => go({ ...signals.filters, tab, page: 1 })
const apply = () => go({ ...draft.value, page: 1 })
const reset = () => go({ ...defaultFilters(), tab: signals.filters.tab })
const goToPage = (page) => go({ ...signals.filters, page })

const emptyMessage = computed(() => describeEmpty(signals.filters, signals.usedQuarter))
const isList = computed(() => signals.filters.tab !== 'gaps')
const minReports = computed(() => effectiveMinReports(signals.filters))
const hasShortage = computed(() => (signals.list?.items ?? []).some((s) => typeof s.inShortage === 'boolean'))

// What the charts describe: the drug and quarter of the table (or everything when none is chosen).
const scopeNote = computed(() => {
  const { rxcui, quarter } = signals.statsScope
  const drug = rxcui ? (signals.drugName ?? `RxCUI ${rxcui}`) : 'all drugs'
  return `${drug} · ${quarter ?? 'all quarters'}`
})
const isEmpty = (value) => !value || (Array.isArray(value) ? value.length === 0 : Object.keys(value).length === 0)
const loaded = (name) => signals.stats[name] !== null

// Age and sex charts draw the known groups; how many reports leave the field blank is said under the chart.
const age = computed(() => splitUnknown(signals.stats.age))
const sex = computed(() => splitUnknown(signals.stats.sex))
const missingNote = (share, field) => (share > 0 ? `${formatPercent(share) === '0%' ? 'Under 1%' : formatPercent(share)} of reports have no ${field} recorded; the chart shows the rest.` : '')
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

  <SignalGlossary :tab="signals.filters.tab" :shortage="hasShortage" />

  <div class="grid two stats">
    <StatCard
      title="Reports by age group"
      :note="scopeNote"
      :loading="signals.statsLoading.age"
      :error="signals.statsError.age"
      :loaded="loaded('age')"
      :empty="loaded('age') && isEmpty(age.known)"
      :footnote="missingNote(age.unknownShare, 'age')"
      @retry="signals.loadStats()"
    >
      <AgeBarChart :groups="age.known" />
    </StatCard>
    <StatCard
      title="Reports by sex (%)"
      :note="scopeNote"
      :loading="signals.statsLoading.sex"
      :error="signals.statsError.sex"
      :loaded="loaded('sex')"
      :empty="loaded('sex') && isEmpty(sex.known)"
      :footnote="missingNote(sex.unknownShare, 'sex')"
      @retry="signals.loadStats()"
    >
      <DonutChart :values="sex.known" />
    </StatCard>
    <StatCard
      title="Serious reports by quarter"
      :note="`${signals.statsScope.rxcui ? (signals.drugName ?? `RxCUI ${signals.statsScope.rxcui}`) : 'all drugs'} · last 6 quarters`"
      :loading="signals.statsLoading.seriousOverTime"
      :error="signals.statsError.seriousOverTime"
      :loaded="loaded('seriousOverTime')"
      :empty="loaded('seriousOverTime') && isEmpty(signals.stats.seriousOverTime)"
      @retry="signals.loadStats()"
    >
      <TrendChart :series="signals.stats.seriousOverTime" />
    </StatCard>
  </div>
  <ReportsDrawer :drawer="signals.reportsDrawer" @close="signals.closeReports" @page="signals.loadReportsPage" />
  <DisclaimerFooter :text="signals.disclaimer ?? undefined" />
</template>

<style scoped>
.tabs { margin: var(--s-5) 0 var(--s-4); }
.summary { margin: var(--s-3) 0; font-size: var(--fs-sm); color: var(--ink-2); }
.results { margin-bottom: var(--s-4); }
.gaps-title { font-size: var(--fs-lg); margin: 0 0 var(--s-2); }
.error { color: var(--coral); }
.link { background: none; border: 0; padding: 0; color: var(--accent); font: inherit; text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
</style>
