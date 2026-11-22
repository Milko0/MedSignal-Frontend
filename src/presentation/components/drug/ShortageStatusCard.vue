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
        <dd>{{ shortage.dosageForms.join('; ') }}</dd>
      </template>
    </dl>
  </section>
</template>

<style scoped>
h2 { font-family: var(--font); font-size: var(--fs-sm); font-weight: 500; letter-spacing: .02em; margin: 0 0 var(--s-2); color: var(--ink-2); }
.title { margin: 0; font-size: var(--fs-lg); font-weight: 600; line-height: 1.3; }
.card.active .title { color: var(--amber); }
.card.active .title::before { content: ''; display: inline-block; width: .5rem; height: .5rem; border-radius: 50%; background: var(--amber); margin-right: var(--s-2); vertical-align: .15em; }
.muted { margin: var(--s-1) 0 0; font-size: var(--fs-md); }
dl { margin: var(--s-3) 0 0; font-size: var(--fs-sm); display: grid; grid-template-columns: auto 1fr; gap: var(--s-1) var(--s-3); }
dt { color: var(--ink-2); }
dd { margin: 0; overflow-wrap: anywhere; }
</style>
