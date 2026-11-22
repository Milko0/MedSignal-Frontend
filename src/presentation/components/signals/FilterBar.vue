<script setup>
// FR-05: drug, reaction, quarter, minimum reports and "show all pairs". It edits a draft (v-model); nothing is
// sent until Apply, which the view turns into a URL change. Filters a tab does not use are shown disabled.
import { computed, useId } from 'vue'
import DrugSearchBox from '@/presentation/components/drug/DrugSearchBox.vue'
import ToggleSwitch from '@/presentation/components/common/ToggleSwitch.vue'
import { MIN_REPORT_OPTIONS, effectiveMinReports, filterApplies } from '@/domain/rules/signalFilters'

const props = defineProps({
  modelValue: { type: Object, required: true },        // draft filters
  quarters: { type: Array, default: () => [] },        // newest first
})
const emit = defineEmits(['update:modelValue', 'apply', 'reset'])

const uid = useId()
const set = (patch) => emit('update:modelValue', { ...props.modelValue, ...patch })
const applies = (filter) => filterApplies(props.modelValue.tab, filter)

const drugLabel = computed(() => props.modelValue.drugName ?? `RxCUI ${props.modelValue.rxcui}`)
const quarterOptions = computed(() => {
  const q = props.modelValue.quarter
  return q && !props.quarters.includes(q) ? [q, ...props.quarters] : props.quarters
})
const minValue = computed(() => effectiveMinReports(props.modelValue))
const minOptions = computed(() => (MIN_REPORT_OPTIONS.includes(minValue.value) ? MIN_REPORT_OPTIONS : [...MIN_REPORT_OPTIONS, minValue.value].sort((a, b) => a - b)))

const HINTS = {
  emerging: 'Emerging signals can be narrowed by quarter and minimum reports only.',
  gaps: 'Label gaps are per drug: choose one. Quarter, reaction and "show all pairs" do not apply.',
}
const hint = computed(() => HINTS[props.modelValue.tab] ?? '')
</script>

<template>
  <form class="card filters" aria-label="Signal filters" @submit.prevent="emit('apply')">
    <div class="field drug" :class="{ off: !applies('drug') }">
      <span class="label" :id="`${uid}-drug`">Drug</span>
      <div v-if="modelValue.rxcui" class="chosen" role="group" :aria-labelledby="`${uid}-drug`">
        <span class="pill">{{ drugLabel }}</span>
        <button type="button" class="clear" aria-label="Remove drug filter" :disabled="!applies('drug')" @click="set({ rxcui: null, drugName: null })">×</button>
      </div>
      <DrugSearchBox v-else-if="applies('drug')" picker @select="(d) => set({ rxcui: d.rxcui, drugName: d.name })" />
      <input v-else disabled placeholder="Not used on this tab" aria-label="Drug (not used on this tab)" />
    </div>

    <div class="field" :class="{ off: !applies('reaction') }">
      <label :for="`${uid}-reaction`">Reaction</label>
      <input
        :id="`${uid}-reaction`"
        :value="modelValue.reaction"
        :disabled="!applies('reaction')"
        placeholder="Exact term, e.g. nausea"
        autocomplete="off"
        @input="set({ reaction: $event.target.value })"
      />
    </div>

    <div class="field" :class="{ off: !applies('quarter') }">
      <label :for="`${uid}-quarter`">Quarter</label>
      <select :id="`${uid}-quarter`" :value="modelValue.quarter ?? ''" :disabled="!applies('quarter')" @change="set({ quarter: $event.target.value || null })">
        <option value="">Latest</option>
        <option v-for="q in quarterOptions" :key="q" :value="q">{{ q }}</option>
      </select>
    </div>

    <div class="field" :class="{ off: !applies('min') }">
      <label :for="`${uid}-min`">Minimum reports</label>
      <select :id="`${uid}-min`" :value="minValue" :disabled="!applies('min')" @change="set({ minReports: Number($event.target.value) })">
        <option v-for="n in minOptions" :key="n" :value="n">{{ n }}</option>
      </select>
    </div>

    <div class="field pairs">
      <ToggleSwitch
        label="Show all pairs"
        :model-value="!modelValue.onlySignals"
        :disabled="!applies('pairs')"
        @update:model-value="(v) => set({ onlySignals: !v })"
      />
    </div>

    <div class="actions">
      <button type="submit" class="btn">Apply filters</button>
      <button type="button" class="btn outline" @click="emit('reset')">Reset</button>
    </div>

    <p v-if="hint" class="hint muted">{{ hint }}</p>
  </form>
</template>

<style scoped>
.filters { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: var(--s-3) var(--s-4); align-items: end; }
.field { display: flex; flex-direction: column; gap: var(--s-1); min-width: 0; }
.field.drug { grid-column: span 2; }
.field.off { opacity: .55; }
.label, label { font-size: var(--fs-xs); color: var(--ink-2); font-weight: 500; letter-spacing: .02em; }
input, select { width: 100%; padding: .5rem .625rem; border: 1px solid var(--line-strong); border-radius: var(--radius-sm); font: inherit; font-size: var(--fs-md); background: var(--card); color: var(--ink); transition: border-color var(--t-fast), box-shadow var(--t-fast); }
input:focus, select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
input:disabled, select:disabled { background: var(--slate-soft); cursor: not-allowed; }
.chosen { display: flex; align-items: center; gap: var(--s-2); }
.pill { background: var(--accent-soft); color: var(--accent); border-radius: var(--radius-sm); padding: .3rem .625rem; font-size: var(--fs-md); font-weight: 500; overflow-wrap: anywhere; }
.clear { border: 0; background: none; font-size: 1.2rem; line-height: 1; color: var(--muted); cursor: pointer; padding: 0 var(--s-1); border-radius: var(--radius-sm); transition: color var(--t-fast); }
.clear:hover:not(:disabled) { color: var(--ink); }
.pairs { justify-content: flex-end; padding-bottom: var(--s-2); }
.actions { display: flex; gap: var(--s-2); }
.hint { grid-column: 1 / -1; margin: 0; font-size: var(--fs-sm); }
@media (max-width: 640px) { .field.drug { grid-column: auto; } }
</style>
