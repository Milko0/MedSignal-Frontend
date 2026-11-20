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
    <div v-else-if="loaded" class="chart" :class="{ dim: loading }"><slot /></div>
  </section>
</template>

<style scoped>
h3 { font-size: 1rem; margin: 0 0 .15rem; }
.note { margin: 0 0 .5rem; font-size: .8rem; }
.state { margin: .75rem 0; }
.error { color: var(--coral); }
.link { background: none; border: 0; padding: 0; color: var(--teal); font: inherit; text-decoration: underline; cursor: pointer; }
.chart { transition: opacity .15s; }
.chart.dim { opacity: .5; }
</style>
