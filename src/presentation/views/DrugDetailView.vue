<script setup>
// View 3 - Drug 360 (FR-02, FR-03, FR-10, FR-15): header, shortage, recalls, label, reactions, trend, alternatives.
import { onMounted } from 'vue'
import { useDrugStore } from '@/application/stores/useDrugStore'

const props = defineProps({ rxcui: String })
const drugs = useDrugStore()
onMounted(() => drugs.fetchDrug360(props.rxcui))
</script>

<template>
  <h1>{{ drugs.current?.name ?? 'Drug details' }}</h1>
  <p class="muted">RxCUI {{ rxcui }}. TODO: DrugHeader, ShortageStatusCard, RecallsCard, ReactionBars, TrendChart, AlternativesTable.</p>
</template>
