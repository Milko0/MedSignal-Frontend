<script setup>
// FR-02: shortage status of the drug (narrowed to the chosen dosage form by the overview request). Amber left
// border while the drug is in, or about to go into, shortage.
import { computed } from 'vue'
import { formatShortage } from '@/domain/rules/formatShortage'
import { isInShortage } from '@/domain/rules/shortageStatus'

const props = defineProps({
  shortage: { type: Object, required: true },        // Drug360.shortage
  selectedForm: { type: String, default: null },
})

const view = computed(() => formatShortage(props.shortage))
const active = computed(() => isInShortage(props.shortage.status))
</script>

<template>
  <section class="card" :class="[view.tone, { active }]" aria-labelledby="shortage-title">
    <h2 id="shortage-title">Shortage status<template v-if="selectedForm"> · {{ selectedForm }}</template></h2>
    <p class="title">{{ view.title }}</p>
    <p v-if="view.subtitle" class="muted">{{ view.subtitle }}</p>

    <dl v-if="shortage.reasons.length || shortage.dosageForms.length">
      <template v-if="shortage.reasons.length">
        <dt>Reason</dt>
        <dd>{{ shortage.reasons.join('; ') }}</dd>
      </template>
      <template v-if="shortage.dosageForms.length">
        <dt>Forms on record</dt>
        <dd>{{ shortage.dosageForms.join(', ') }}</dd>
      </template>
    </dl>
  </section>
</template>

<style scoped>
.card { border-left: 4px solid var(--green); }
.card.active { border-left-color: var(--amber); }
h2 { font-size: .85rem; margin: 0 0 .4rem; color: var(--muted); font-weight: 600; }
.title { margin: 0; font-size: 1.15rem; font-weight: 700; }
.card.active .title { color: var(--amber); }
.muted { margin: .2rem 0 0; font-size: .9rem; }
dl { margin: .75rem 0 0; font-size: .86rem; display: grid; grid-template-columns: auto 1fr; gap: .25rem .75rem; }
dt { color: var(--muted); }
dd { margin: 0; overflow-wrap: anywhere; }
</style>
