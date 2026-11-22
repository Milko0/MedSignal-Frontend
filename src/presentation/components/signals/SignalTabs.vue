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
.tabs { display: flex; flex-wrap: wrap; gap: 0 var(--s-1); border-bottom: 1px solid var(--line-strong); }
.tab { border: 0; border-bottom: 2px solid transparent; margin-bottom: -1px; background: none; color: var(--ink-2); padding: var(--s-2) .875rem; font: inherit; font-size: var(--fs-md); font-weight: 500; cursor: pointer; border-radius: var(--radius-sm) var(--radius-sm) 0 0; transition: color var(--t-fast), border-color var(--t-fast), background-color var(--t-fast); }
.tab:hover { color: var(--ink); background: var(--accent-soft); }
.tab.active { color: var(--ink); border-bottom-color: var(--accent); }
</style>
