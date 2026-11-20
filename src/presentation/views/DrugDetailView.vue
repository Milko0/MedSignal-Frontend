<script setup>
// View 3 - Drug 360 (FR-02, FR-03, FR-10, FR-15): header, shortage, recalls, label, reactions, trend, alternatives.
import { watch } from 'vue'
import { useDrugStore } from '@/application/stores/useDrugStore'
import DisclaimerFooter from '@/presentation/components/common/DisclaimerFooter.vue'

const props = defineProps({ rxcui: String })
const drugs = useDrugStore()
// Another drug in the URL (navbar search) must reload, not reuse the one on screen.
watch(() => props.rxcui, (rxcui) => drugs.loadDrug(rxcui), { immediate: true })
</script>

<template>
  <h1>{{ drugs.current?.name ?? 'Drug details' }}</h1>
  <p class="muted">RxCUI {{ rxcui }}. TODO: DrugHeader, ShortageStatusCard, RecallsCard, ReactionBars, TrendChart, AlternativesTable.</p>
  <DisclaimerFooter />
</template>
