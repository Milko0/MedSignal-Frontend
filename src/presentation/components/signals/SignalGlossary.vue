<script setup>
// What the columns of the signal and label-gap tables mean, in plain words, right under the table. Only the terms of
// the current tab are listed. It explains the numbers; the disclaimer (what they do NOT mean) stays in the footer.
import { computed } from 'vue'

const props = defineProps({
  tab: { type: String, default: 'all' },   // 'all' | 'emerging' | 'gaps'
  shortage: Boolean,                       // the table shows the Shortage column
})

const TERMS = {
  reports: { term: 'Reports', text: 'FDA adverse event reports in the quarter that name this drug as a suspect and list this reaction.' },
  prr: { term: 'PRR', text: 'Proportional reporting ratio: how many times more often this reaction is reported with this drug than with all other drugs. 1 means as often as expected. The badge gets stronger with the ratio: plain below 2, outlined from 2, filled from 3. Hover over or focus a PRR to see its CI lower bound and chi-square.' },
  ci: { term: '95% CI lower bound', text: 'The lowest PRR the data still supports. Above 1, the excess is unlikely to be chance alone.' },
  chi: { term: 'Chi-square', text: 'How far the counts are from what would be expected. A pair counts as a signal when PRR is at least 2, chi-square at least 4 and there are at least 3 reports (the Evans criteria).' },
  label: { term: 'In label', text: 'Whether the official drug label already lists the reaction: Listed, Partly listed (a related term), or Not listed, which is a label gap.' },
  indications: { term: 'In indications', text: 'The reaction also appears among the uses of the drug, so it may describe the condition being treated rather than a side effect.' },
  emerging: { term: 'Emerging', text: "This quarter's PRR is at least 1.5 times the average of the earlier quarters for the same pair." },
  shortage: { term: 'Shortage', text: 'Whether the drug is currently on the FDA drug shortage list.' },
  trend: { term: 'Trend', text: 'The PRR of the same pair over the previous quarters.' },
}
const BY_TAB = {
  all: ['reports', 'prr', 'ci', 'chi', 'label', 'emerging', 'shortage', 'trend'],
  emerging: ['reports', 'prr', 'ci', 'chi', 'label', 'emerging', 'shortage', 'trend'],
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
.glossary { margin: 0 0 var(--s-5); padding-top: var(--s-3); border-top: 1px solid var(--line); }
h2 { font-family: var(--font); font-size: var(--fs-sm); font-weight: 600; color: var(--ink-2); margin: 0 0 var(--s-2); letter-spacing: .02em; }
dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: var(--s-2) var(--s-5); margin: 0; }
.item { display: grid; gap: 2px; align-content: start; }
dt { font-size: var(--fs-sm); font-weight: 600; color: var(--ink); }
dd { margin: 0; font-size: var(--fs-sm); color: var(--ink-2); line-height: 1.45; max-width: 60ch; }
</style>
