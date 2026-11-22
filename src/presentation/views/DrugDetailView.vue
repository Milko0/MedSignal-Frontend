<script setup>
// View 3 - Drug 360 (FR-02, FR-03, FR-10, FR-15): header, shortage, recalls, label, reactions, trend, alternatives.
// The overview decides what the page shows (loading / not found / error / content); the trend and the alternatives
// load afterwards and fail on their own, each with its own Retry.
import { computed, watch } from 'vue'
import { useAuthStore } from '@/application/stores/useAuthStore'
import { useDrugStore } from '@/application/stores/useDrugStore'
import { isInShortage } from '@/domain/rules/shortageStatus'
import { formatPercent } from '@/domain/rules/percent'
import DrugHeader from '@/presentation/components/drug/DrugHeader.vue'
import DrugSearchBox from '@/presentation/components/drug/DrugSearchBox.vue'
import DosageFormSelect from '@/presentation/components/drug/DosageFormSelect.vue'
import ShortageStatusCard from '@/presentation/components/drug/ShortageStatusCard.vue'
import RecallsCard from '@/presentation/components/drug/RecallsCard.vue'
import LabelCard from '@/presentation/components/drug/LabelCard.vue'
import ReactionBars from '@/presentation/components/charts/ReactionBars.vue'
import TrendChart from '@/presentation/components/charts/TrendChart.vue'
import AlternativesTable from '@/presentation/components/shortages/AlternativesTable.vue'
import DisclaimerFooter from '@/presentation/components/common/DisclaimerFooter.vue'
import { pageTitle } from '@/presentation/router/titles'

const props = defineProps({ rxcui: String })
const auth = useAuthStore()
const drugs = useDrugStore()

// Another drug in the URL (navbar search, an alternative's row) must reload, not reuse the one on screen.
watch(() => props.rxcui, (rxcui) => drugs.loadDrug(rxcui), { immediate: true })

const drug = computed(() => drugs.current)
// The route title says "Drug details"; once the drug is known the tab shows its name instead.
watch(() => drug.value?.name, (name) => { if (name) document.title = pageTitle(name) }, { immediate: true })
const inShortage = computed(() => !!drug.value && isInShortage(drug.value.shortage.status))
const coverage = computed(() => (drug.value?.matchCoverage > 0 ? formatPercent(drug.value.matchCoverage) : ''))
const setForm = (dosageForm) => drugs.setSelection({ ...drugs.selection, dosageForm })
</script>

<template>
  <nav class="crumbs muted" aria-label="Breadcrumb">
    <RouterLink to="/">Search results</RouterLink>
    <span aria-hidden="true"> / </span>
    <span aria-current="page">{{ drug?.name ?? `RxCUI ${rxcui}` }}</span>
  </nav>

  <div v-if="drugs.loading" class="skeleton" aria-busy="true" role="status" aria-label="Loading drug">
    <div class="block tall" /><div class="row3"><div class="block" /><div class="block" /><div class="block" /></div>
  </div>

  <section v-else-if="drugs.notFound" class="card state">
    <h1>We couldn't find this drug</h1>
    <p class="muted">Nothing matches RxCUI {{ rxcui }}. Search by generic or brand name instead.</p>
    <DrugSearchBox />
  </section>

  <section v-else-if="drugs.error" class="card state" role="alert">
    <h1>Drug details are unavailable</h1>
    <p class="muted">Something went wrong while loading this drug.</p>
    <button type="button" class="btn" @click="drugs.loadDrug(rxcui)">Retry</button>
  </section>

  <template v-else-if="drug">
    <DrugHeader
      :drug="drug"
      :logged-in="auth.loggedIn"
      :follow-pending="drugs.followPending"
      :follow-error="drugs.followError"
      @toggle-follow="drugs.toggleFollow"
    />

    <div v-if="drugs.dosageForms.length > 1 || drugs.selectionError" class="toolbar">
      <DosageFormSelect :forms="drugs.dosageForms" :model-value="drugs.selection.dosageForm" :disabled="drugs.refreshing" @update:model-value="setForm" />
      <span v-if="drugs.refreshing" class="muted" role="status">Updating…</span>
      <span v-else-if="drugs.selectionError" class="error" role="alert">Could not apply that form. Try again.</span>
      <span v-else class="muted hint">Applies to the shortage and the alternatives.</span>
    </div>

    <div class="body" :class="{ dim: drugs.refreshing }">
      <div class="grid three">
        <ShortageStatusCard :shortage="drug.shortage" :selected-form="drug.selectedDosageForm" />
        <RecallsCard :recalls="drug.recalls" />
        <LabelCard :label="drug.label" />
      </div>

      <div class="grid two">
        <section class="card" aria-labelledby="reactions-title">
          <h2 id="reactions-title">Most reported reactions</h2>
          <ReactionBars v-if="drug.topReactions.length" :reactions="drug.topReactions" />
          <p v-else class="muted">No reactions reported for this drug.</p>
        </section>

        <section class="card" aria-labelledby="trend-title">
          <h2 id="trend-title">Top 3 reactions by month</h2>
          <p v-if="drugs.trendError" class="error" role="alert">
            Could not load the monthly trend.
            <button type="button" class="link" @click="drugs.retryTrend()">Retry</button>
          </p>
          <p v-else-if="drugs.trendLoading" class="muted" role="status">Loading…</p>
          <TrendChart v-else-if="drugs.trendSeries.length" :series="drugs.trendSeries" />
          <p v-else class="muted">No monthly data for this drug.</p>
        </section>
      </div>

      <section v-if="inShortage" class="card" aria-labelledby="alternatives-title">
        <h2 id="alternatives-title">Alternatives while in shortage</h2>
        <p v-if="drugs.alternativesError" class="error" role="alert">
          Could not load alternatives.
          <button type="button" class="link" @click="drugs.retryAlternatives()">Retry</button>
        </p>
        <p v-else-if="drugs.alternativesLoading || !drugs.alternatives" class="muted" role="status">Loading…</p>
        <AlternativesTable v-else :alternatives="drugs.alternatives" :current-rxcui="drug.rxcui" />
      </section>

      <p v-if="coverage" class="quality muted">Based on {{ coverage }} of reports matched to an ingredient.</p>
    </div>

    <DisclaimerFooter />
  </template>
</template>

<style scoped>
.crumbs { font-size: var(--fs-sm); margin-bottom: var(--s-3); }
.state { max-width: 560px; margin: var(--s-5) auto; }
.state h1 { font-size: var(--fs-lg); }
.toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: var(--s-3); margin: var(--s-4) 0 0; }
.hint { font-size: var(--fs-sm); }
.body { display: grid; gap: var(--s-4); margin-top: var(--s-4); transition: opacity var(--t-fast); }
.body.dim { opacity: .55; pointer-events: none; }
.grid.three { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
h2 { margin: 0 0 var(--s-2); }
.card > p { margin: var(--s-2) 0; }
.quality { font-size: var(--fs-sm); color: var(--ink-2); margin: 0; }
.error { color: var(--coral); }
.link { background: none; border: 0; padding: 0; color: var(--accent); font: inherit; text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
.skeleton { display: grid; gap: var(--s-4); }
.skeleton .row3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--s-4); }
.block { height: 7rem; border-radius: var(--radius); background: linear-gradient(90deg, var(--slate-soft), var(--line), var(--slate-soft)); background-size: 200% 100%; animation: shimmer 1.4s linear infinite; }
.block.tall { height: 6rem; }
@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
@media (prefers-reduced-motion: reduce) { .block { animation: none; } }
</style>
