<script setup>
// FR-02: narrow the shortage and the alternatives to one dosage form. Only worth showing when the drug has a
// shortage record for more than one form. v-model is the chosen form, null = all forms.
import { computed } from 'vue'

const props = defineProps({
  forms: { type: Array, default: () => [] },
  modelValue: { type: String, default: null },
  disabled: Boolean,
})
const emit = defineEmits(['update:modelValue'])

const visible = computed(() => props.forms.length > 1)
const onChange = (e) => emit('update:modelValue', e.target.value || null)
const id = `form-${Math.random().toString(36).slice(2, 8)}`
</script>

<template>
  <div v-if="visible" class="select">
    <label :for="id">Dosage form</label>
    <select :id="id" :value="modelValue ?? ''" :disabled="disabled" @change="onChange">
      <option value="">All forms</option>
      <option v-for="f in forms" :key="f" :value="f">{{ f }}</option>
    </select>
  </div>
</template>

<style scoped>
.select { display: inline-flex; align-items: center; gap: var(--s-2); font-size: var(--fs-md); }
label { color: var(--ink-2); }
select { padding: .375rem .625rem; border: 1px solid var(--line-strong); border-radius: var(--radius-sm); font: inherit; font-size: var(--fs-md); background: var(--card); color: var(--ink); transition: border-color var(--t-fast), box-shadow var(--t-fast); }
select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
</style>
