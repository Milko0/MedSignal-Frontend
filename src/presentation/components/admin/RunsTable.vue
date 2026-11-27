<script setup>
// The update log (FR-21): newest first. A run with no end time is still running; details (errors, counters) open under it.
import { runDuration, runState, runTypeLabel } from '@/domain/rules/admin'
import { relativeTime } from '@/domain/rules/relativeTime'
import StatusChip from '@/presentation/components/common/StatusChip.vue'
import PagerBar from '@/presentation/components/admin/PagerBar.vue'

defineProps({
  runs: { type: Array, required: true },
  loaded: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  page: { type: Number, default: 1 },
  hasPrev: { type: Boolean, default: false },
  hasNext: { type: Boolean, default: false },
  now: { type: Date, default: () => new Date() },     // moves the clock of a running job
})
defineEmits(['prev', 'next', 'retry'])

const hasDetails = (r) => r.errors.length > 0 || Object.keys(r.stats).length > 0
</script>

<template>
  <div>
    <p v-if="error" class="admin-state error" role="alert">
      {{ error }} <button type="button" class="link-btn" @click="$emit('retry')">Retry</button>
    </p>
    <p v-else-if="!loaded && loading" class="admin-state muted" role="status">Loading the update log…</p>
    <p v-else-if="loaded && !runs.length" class="admin-state muted">No updates have run yet.</p>

    <div v-if="runs.length" class="data-scroll">
      <table class="data-table" :class="{ dim: loading }" :aria-busy="loading">
        <thead>
          <tr>
            <th scope="col">Started</th><th scope="col">Job</th><th scope="col">Source</th><th scope="col">Status</th>
            <th scope="col">Took</th><th scope="col">Loaded</th><th scope="col">Skipped</th><th scope="col">Details</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in runs" :key="r.id">
            <td :title="r.startedAt">{{ relativeTime(r.startedAt, now) || r.startedAt }}</td>
            <td>{{ runTypeLabel(r.type) }}</td>
            <td>{{ r.source }}</td>
            <td><StatusChip :status="runState(r).state" :label="runState(r).label" :tone="runState(r).tone" /></td>
            <td>{{ runDuration(r, now) }}</td>
            <td>{{ r.recordsLoaded }}</td>
            <td>{{ r.recordsSkipped }}</td>
            <td>
              <details v-if="hasDetails(r)">
                <summary>{{ r.errors.length ? `${r.errors.length} ${r.errors.length === 1 ? 'error' : 'errors'}` : 'Counters' }}</summary>
                <ul v-if="r.errors.length" class="errors"><li v-for="(e, i) in r.errors" :key="i">{{ e }}</li></ul>
                <pre v-if="Object.keys(r.stats).length" class="stats">{{ JSON.stringify(r.stats, null, 2) }}</pre>
              </details>
              <span v-else class="muted">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <PagerBar :page="page" :has-prev="hasPrev" :has-next="hasNext" :loading="loading" @prev="$emit('prev')" @next="$emit('next')" />
  </div>
</template>

<style scoped>
.admin-state.error button { margin-left: var(--s-2); }
summary { cursor: pointer; color: var(--accent); }
.errors { margin: var(--s-2) 0 0; padding-left: var(--s-4); color: var(--coral); font-size: var(--fs-sm); }
.stats { margin: var(--s-2) 0 0; padding: var(--s-2); background: var(--slate-soft); border-radius: var(--radius-sm); font-family: var(--font-mono); font-size: var(--fs-xs); white-space: pre-wrap; }
</style>
