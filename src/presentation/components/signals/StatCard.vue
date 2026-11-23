<script setup>
// One statistics chart card: title, a note on what it describes, and its own loading / error (Retry) / empty state.
// The chart goes in the default slot and is only rendered when there is something to draw.
defineProps({
  title: { type: String, required: true },
  note: { type: String, default: '' },
  loading: Boolean,
  error: { type: Object, default: null },
  empty: Boolean,           // loaded, but nothing to draw
  loaded: Boolean,          // data has arrived at least once
  footnote: { type: String, default: '' },   // under the chart, e.g. how many reports have no age recorded
})
defineEmits(['retry'])
</script>

<template>
  <section class="card" :aria-label="title">
    <h3>{{ title }}</h3>
    <p v-if="note" class="note muted">{{ note }}</p>

    <p v-if="error && !loaded" class="state error" role="alert">
      Could not load this chart.
      <button type="button" class="link" @click="$emit('retry')">Retry</button>
    </p>
    <p v-else-if="loading && !loaded" class="state muted" role="status">Loading…</p>
    <p v-else-if="empty" class="state muted">No reports for this selection.</p>
    <template v-else-if="loaded">
      <div class="chart" :class="{ dim: loading }"><slot /></div>
      <p v-if="footnote" class="footnote">{{ footnote }}</p>
    </template>
  </section>
</template>

<style scoped>
h3 { font-family: var(--font-display); font-size: var(--fs-base); font-weight: 600; margin: 0 0 var(--s-1); }
.note { margin: 0 0 var(--s-2); font-size: var(--fs-xs); color: var(--ink-2); }
.state { margin: var(--s-3) 0; }
.error { color: var(--coral); }
.link { background: none; border: 0; padding: 0; color: var(--accent); font: inherit; text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
.chart { transition: opacity var(--t-fast); }
.chart.dim { opacity: .5; }
.footnote { margin: var(--s-2) 0 0; font-size: var(--fs-sm); color: var(--ink-2); }
</style>
