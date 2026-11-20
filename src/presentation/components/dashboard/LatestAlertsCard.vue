<script setup>
// FR-18: the newest alerts of the user's followed medicines. Alerts come with `drugName` already resolved.
import { alertLabel, alertTone } from '@/domain/rules/alertTone'
import { relativeTime } from '@/domain/rules/relativeTime'

defineProps({
  alerts: { type: Array, default: () => [] },
  loading: Boolean,
  error: { type: Object, default: null },
})
defineEmits(['retry'])
</script>

<template>
  <section class="card" aria-labelledby="alerts-title">
    <header class="head">
      <h2 id="alerts-title">Latest alerts</h2>
      <RouterLink to="/my-medicines">View all</RouterLink>
    </header>

    <p v-if="error && !alerts.length" class="state error" role="alert">
      Could not load your alerts.
      <button type="button" class="link" @click="$emit('retry')">Retry</button>
    </p>
    <p v-else-if="loading && !alerts.length" class="state muted" role="status">Loading…</p>
    <p v-else-if="!alerts.length" class="state muted">No alerts yet. One appears here when a medicine you follow changes.</p>

    <ul v-else>
      <li v-for="a in alerts" :key="a.id">
        <span class="dot" :class="alertTone(a.type)" :title="alertLabel(a.type)" role="img" :aria-label="alertLabel(a.type)" />
        <div class="body">
          <strong>{{ a.drugName }}</strong>
          <span class="muted"> {{ a.message }}</span>
        </div>
        <time class="when muted" :datetime="a.createdAt">{{ relativeTime(a.createdAt) }}</time>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.head { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; margin-bottom: .5rem; }
h2 { font-size: 1.05rem; margin: 0; }
ul { list-style: none; margin: 0; padding: 0; }
li { display: flex; align-items: flex-start; gap: .7rem; padding: .55rem 0; border-bottom: 1px solid var(--line); font-size: .9rem; }
li:last-child { border-bottom: 0; }
.dot { flex: none; width: .65rem; height: .65rem; border-radius: 50%; margin-top: .35rem; }
.dot.teal { background: var(--teal); }
.dot.amber { background: var(--amber); }
.dot.coral { background: var(--coral); }
.dot.green { background: var(--green); }
.dot.slate { background: var(--slate); }
.body { flex: 1; }
.when { flex: none; font-size: .78rem; white-space: nowrap; }
.state { margin: .5rem 0; }
.error { color: var(--coral); }
.link { background: none; border: 0; padding: 0; color: var(--teal); font: inherit; text-decoration: underline; cursor: pointer; }
</style>
