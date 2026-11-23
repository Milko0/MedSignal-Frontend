<script setup>
// What the columns of the signal and label-gap tables mean, in plain words, right under the table. Only the terms of
// the current tab are listed. It explains the numbers; the disclaimer (what they do NOT mean) stays in the footer.
import { computed } from 'vue'

const props = defineProps({
  tab: { type: String, default: 'all' },   // 'all' | 'emerging' | 'gaps'
  shortage: Boolean,                       // the table shows the Shortage column
})

const TERMS = {
  reports: { term: 'Reports', text: 'FDA reports in the quarter that name this drug as a suspect and list this reaction. Rows are ranked by how much more often the reaction appears with this drug than with others.' },
  label: { term: 'In label', text: 'Whether the official label already lists the reaction: Listed, Partly listed (a related term), or Not listed (a label gap).' },
  indications: { term: 'In indications', text: 'The reaction also appears among the uses of the drug, so it may describe the condition being treated rather than a side effect.' },
  emerging: { term: 'Emerging', text: 'Reported clearly more this quarter than in the earlier ones.' },
  shortage: { term: 'Shortage', text: 'Status on the FDA drug shortage list: in shortage, to be discontinued, or resolved.' },
  trend: { term: 'Trend', text: 'How the strength of the pair moved over the last quarters (up = growing).' },
}
const BY_TAB = {
  all: ['reports', 'label', 'shortage', 'emerging', 'trend'],
  emerging: ['reports', 'label', 'shortage', 'emerging', 'trend'],
  gaps: ['reports', 'label', 'indications'],
}
const terms = computed(() => (BY_TAB[props.tab] ?? BY_TAB.all).filter((k) => k !== 'shortage' || props.shortage).map((k) => TERMS[k]))
</script>

<template>
  <section class="glossary" aria-labelledby="glossary-title">
    <h2 id="glossary-title">What these columns mean</h2>
    <dl>
      <div v-for="t in terms" :key="t.term" class="item">
        <dt>{{ t.term }}</dt>
        <dd>{{ t.text }}</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.glossary { margin: 0 0 var(--s-5); padding-top: var(--s-2); border-top: 1px solid var(--line); }
h2 { font-family: var(--font); font-size: var(--fs-sm); font-weight: 600; color: var(--ink-2); margin: 0 0 var(--s-2); letter-spacing: .02em; }
dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--s-2) var(--s-4); margin: 0; }
.item { display: grid; gap: 2px; align-content: start; }
dt { font-size: var(--fs-xs); font-weight: 600; color: var(--ink); }
dd { margin: 0; font-size: var(--fs-xs); color: var(--ink-2); line-height: 1.4; max-width: 52ch; }
</style>
