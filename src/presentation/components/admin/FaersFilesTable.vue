<script setup>
// FR-19: the FAERS bulk files waiting in the server's FAERS folder (downloaded there with scripts/download_faers.py),
// newest quarter first. Tick the ones to load. "In database" says the quarter already has reports.
import { computed } from 'vue'
import { formatDate } from '@/domain/rules/formatShortage'
import StatusChip from '@/presentation/components/common/StatusChip.vue'

const props = defineProps({
  files: { type: Array, required: true },
  selected: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:selected', 'retry'])

const allTicked = computed(() => props.files.length > 0 && props.files.every((f) => props.selected.includes(f.name)))
const toggle = (name, on) => emit('update:selected', on ? [...props.selected, name] : props.selected.filter((n) => n !== name))
const toggleAll = (on) => emit('update:selected', on ? props.files.map((f) => f.name) : [])
</script>

<template>
  <div>
    <p v-if="error" class="admin-state error" role="alert">
      {{ error }} <button type="button" class="link-btn" @click="emit('retry')">Retry</button>
    </p>
    <p v-else-if="loading && !files.length" class="admin-state muted" role="status">Looking for files…</p>
    <p v-else-if="!files.length" class="admin-state muted">
      No FAERS files found. Download them on the server first (<code>scripts/download_faers.py</code>); they appear here once they are in the FAERS folder.
    </p>

    <div v-if="files.length" class="data-scroll">
      <table class="data-table" :aria-busy="loading">
        <thead>
          <tr>
            <th scope="col">
              <input type="checkbox" aria-label="Select all files" :checked="allTicked" :disabled="disabled" @change="toggleAll($event.target.checked)" />
            </th>
            <th scope="col">File</th><th scope="col">Quarter</th><th scope="col">Size</th><th scope="col">Downloaded</th><th scope="col">Database</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in files" :key="f.name">
            <td>
              <input type="checkbox" :aria-label="`Load ${f.name}`" :checked="selected.includes(f.name)" :disabled="disabled"
                     @change="toggle(f.name, $event.target.checked)" />
            </td>
            <td class="mono">{{ f.name }}</td>
            <td>{{ f.quarter ?? 'unknown' }}</td>
            <td>{{ f.sizeMb }} MB</td>
            <td>{{ formatDate(f.modifiedAt) || '—' }}</td>
            <td>
              <StatusChip :status="f.quarterLoaded ? 'available' : 'no_changes'" :label="f.quarterLoaded ? 'Quarter in database' : 'Not loaded'"
                          :tone="f.quarterLoaded ? 'green' : 'slate'" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
code { font-family: var(--font-mono); font-size: var(--fs-sm); }
</style>
