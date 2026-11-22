<script setup>
// FR-02: recalls by FDA class. Only part of the recalls could be linked to a drug, so the counts are a lower bound.
import { computed } from 'vue'
import { formatPercent } from '@/domain/rules/percent'

const props = defineProps({ recalls: { type: Object, required: true } })   // Drug360.recalls

const classes = computed(() => [
  { key: 'I', label: 'Class I', value: props.recalls.classI, tone: 'coral' },
  { key: 'II', label: 'Class II', value: props.recalls.classII, tone: 'amber' },
  { key: 'III', label: 'Class III', value: props.recalls.classIII, tone: 'slate' },
])
const partial = computed(() => props.recalls.linkedShare < 1)
</script>

<template>
  <section class="card" aria-labelledby="recalls-title">
    <h2 id="recalls-title">Recalls</h2>
    <p class="total">
      <template v-if="recalls.total === 0">No recalls linked to this drug</template>
      <template v-else><template v-if="partial">At least </template><strong>{{ recalls.total }}</strong> {{ recalls.total === 1 ? 'recall' : 'recalls' }}</template>
    </p>

    <ul class="classes">
      <li v-for="c in classes" :key="c.key" :class="c.tone">
        <span class="n">{{ c.value }}</span>
        <span class="muted">{{ c.label }}</span>
      </li>
      <li v-if="recalls.notClassified > 0" class="slate">
        <span class="n">{{ recalls.notClassified }}</span>
        <span class="muted">Not classified</span>
      </li>
    </ul>

    <p v-if="partial" class="note muted">
      Counts are a lower bound: only {{ formatPercent(recalls.linkedShare) }} of all recalls could be linked to a drug.
    </p>
  </section>
</template>

<style scoped>
h2 { font-family: var(--font); font-size: var(--fs-sm); font-weight: 500; letter-spacing: .02em; margin: 0 0 var(--s-2); color: var(--ink-2); }
.total { margin: 0; font-size: var(--fs-base); }
.classes { list-style: none; margin: var(--s-3) 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: var(--s-2); }
.classes li { display: flex; flex-direction: column; align-items: center; min-width: 4.5rem; padding: var(--s-2) var(--s-3); border-radius: var(--radius-sm); background: var(--slate-soft); color: var(--ink-2); font-size: var(--fs-xs); }
.n { font-family: var(--font-mono); font-size: var(--fs-lg); font-weight: 500; line-height: 1.2; color: var(--ink); }
.classes .coral { background: var(--coral-soft); } .classes .coral .n { color: var(--coral); }
.classes .amber { background: var(--amber-soft); } .classes .amber .n { color: var(--amber); }
.note { margin: var(--s-3) 0 0; font-size: var(--fs-xs); }
</style>
