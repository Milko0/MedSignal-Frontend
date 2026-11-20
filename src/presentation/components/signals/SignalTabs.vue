<script setup>
// FR-04, FR-06, FR-07: the three lists of the explorer. v-model is the tab key (all | emerging | gaps).
defineProps({ modelValue: { type: String, default: 'all' } })
defineEmits(['update:modelValue'])

const TABS = [
  { key: 'all', label: 'All signals' },
  { key: 'emerging', label: 'Emerging' },
  { key: 'gaps', label: 'Label gaps' },
]
</script>

<template>
  <div class="tabs" role="tablist" aria-label="Signal lists">
    <button
      v-for="t in TABS"
      :key="t.key"
      type="button"
      role="tab"
      class="tab"
      :class="{ active: modelValue === t.key }"
      :aria-selected="modelValue === t.key"
      @click="$emit('update:modelValue', t.key)"
    >{{ t.label }}</button>
  </div>
</template>

<style scoped>
.tabs { display: flex; flex-wrap: wrap; gap: .4rem; }
.tab { border: 1px solid var(--line); background: var(--card); color: var(--ink); border-radius: 999px; padding: .35rem .95rem; font: inherit; cursor: pointer; }
.tab:hover { border-color: var(--teal); }
.tab.active { background: var(--teal); border-color: var(--teal); color: #fff; }
</style>
