<script setup>
// Create or edit a shortage record (FR-24), identified by its package NDC (which cannot change once created). The save
// sends the whole record; fields this form does not show are kept from the saved one. 409 / 422 answers (`error`)
// are shown under the field they name.
import { computed, reactive, ref, useId, watch } from 'vue'
import AdminDialog from '@/presentation/components/admin/AdminDialog.vue'
import {
  AVAILABILITIES, SHORTAGE_STATUSES, formToShortage, mapShortageError, shortageChanged, shortageToForm, validateShortage,
} from '@/domain/rules/admin'
import { hasErrors } from '@/domain/rules/authValidation'

const props = defineProps({
  open: { type: Boolean, default: false },
  record: { type: Object, default: null },     // null = create
  pending: { type: Boolean, default: false },
  error: { type: Object, default: null },
})
const emit = defineEmits(['save', 'cancel'])

const uid = useId()
const form = reactive(shortageToForm(null))
const problems = ref({})
const creating = computed(() => !props.record)

watch(() => props.open, (open) => {
  if (!open) return
  Object.assign(form, shortageToForm(props.record))
  problems.value = {}
}, { immediate: true })

const server = computed(() => (props.error ? mapShortageError(props.error) : { fields: {}, banner: '' }))
const shown = computed(() => ({ ...server.value.fields, ...problems.value }))
const touch = (field) => { delete problems.value[field] }
const nothingToSave = computed(() => !creating.value && !shortageChanged(form, props.record))

function submit() {
  if (props.pending) return
  problems.value = validateShortage(form, { creating: creating.value })
  if (hasErrors(problems.value) || nothingToSave.value) return
  emit('save', formToShortage(form, props.record ?? {}))
}

const TEXT_FIELDS = [
  { key: 'generic_name', label: 'Generic name' },
  { key: 'dosage_form', label: 'Dosage form' },
  { key: 'company', label: 'Company' },
  { key: 'presentation', label: 'Presentation' },
  { key: 'shortage_reason', label: 'Shortage reason' },
]
const DATE_FIELDS = [
  { key: 'initial_posting_date', label: 'First posted' },
  { key: 'update_date', label: 'Last updated' },
  { key: 'discontinued_date', label: 'Discontinued on' },
]
</script>

<template>
  <AdminDialog :open="open" :title="creating ? 'New shortage record' : `Edit ${record?.package_ndc}`" :busy="pending" wide @close="emit('cancel')">
    <form novalidate @submit.prevent="submit">
      <p v-if="server.banner" class="error banner" role="alert">{{ server.banner }}</p>
      <p class="muted note">The daily FDA poll replaces this list with the FDA's own records, so manual changes can be overwritten.</p>

      <div class="grid">
        <div class="field wide">
          <label :for="`${uid}-package_ndc`">Package NDC</label>
          <input :id="`${uid}-package_ndc`" v-model="form.package_ndc" :disabled="!creating" autocomplete="off" autofocus
                 :aria-invalid="!!shown.package_ndc" @input="touch('package_ndc')" />
          <p v-if="shown.package_ndc" class="error" role="alert">{{ shown.package_ndc }}</p>
        </div>

        <div class="field">
          <label :for="`${uid}-status`">Status</label>
          <select :id="`${uid}-status`" v-model="form.status" :aria-invalid="!!shown.status">
            <option v-for="s in SHORTAGE_STATUSES" :key="s" :value="s">{{ s }}</option>
          </select>
          <p v-if="shown.status" class="error" role="alert">{{ shown.status }}</p>
        </div>
        <div class="field">
          <label :for="`${uid}-availability`">Availability</label>
          <select :id="`${uid}-availability`" v-model="form.availability" :aria-invalid="!!shown.availability">
            <option v-for="a in AVAILABILITIES" :key="a" :value="a">{{ a }}</option>
          </select>
          <p v-if="shown.availability" class="error" role="alert">{{ shown.availability }}</p>
        </div>

        <div v-for="f in TEXT_FIELDS" :key="f.key" class="field">
          <label :for="`${uid}-${f.key}`">{{ f.label }}</label>
          <input :id="`${uid}-${f.key}`" v-model="form[f.key]" autocomplete="off" :aria-invalid="!!shown[f.key]" @input="touch(f.key)" />
          <p v-if="shown[f.key]" class="error" role="alert">{{ shown[f.key] }}</p>
        </div>

        <div class="field">
          <label :for="`${uid}-ingredient_rxcuis`">Ingredient RxCUIs</label>
          <input :id="`${uid}-ingredient_rxcuis`" v-model="form.ingredient_rxcuis" autocomplete="off" placeholder="5640, 161"
                 :aria-invalid="!!shown.ingredient_rxcuis" @input="touch('ingredient_rxcuis')" />
          <p v-if="shown.ingredient_rxcuis" class="error" role="alert">{{ shown.ingredient_rxcuis }}</p>
        </div>
        <div class="field">
          <label :for="`${uid}-routes`">Routes</label>
          <input :id="`${uid}-routes`" v-model="form.routes" autocomplete="off" placeholder="ORAL, INTRAVENOUS" />
        </div>
        <div class="field">
          <label :for="`${uid}-therapeutic_categories`">Therapeutic categories</label>
          <input :id="`${uid}-therapeutic_categories`" v-model="form.therapeutic_categories" autocomplete="off" />
        </div>

        <div v-for="f in DATE_FIELDS" :key="f.key" class="field">
          <label :for="`${uid}-${f.key}`">{{ f.label }}</label>
          <input :id="`${uid}-${f.key}`" v-model="form[f.key]" type="date" :aria-invalid="!!shown[f.key]" @input="touch(f.key)" />
          <p v-if="shown[f.key]" class="error" role="alert">{{ shown[f.key] }}</p>
        </div>
      </div>
    </form>
    <template #footer>
      <button type="button" class="btn outline" :disabled="pending" @click="emit('cancel')">Cancel</button>
      <button type="button" class="btn" :disabled="pending || nothingToSave" @click="submit">
        {{ pending ? 'Saving…' : creating ? 'Create record' : 'Save changes' }}
      </button>
    </template>
  </AdminDialog>
</template>

<style scoped>
.note { margin: 0 0 var(--s-3); font-size: var(--fs-sm); }
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--s-3) var(--s-4); }
.field { display: flex; flex-direction: column; gap: var(--s-1); min-width: 0; }
.field.wide { grid-column: 1 / -1; }
label { font-size: var(--fs-sm); font-weight: 500; color: var(--ink-2); }
input, select { padding: .5rem .75rem; border: 1px solid var(--line-strong); border-radius: var(--radius-sm); font: inherit; font-size: var(--fs-md); background: var(--card); color: var(--ink); min-width: 0; transition: border-color var(--t-fast), box-shadow var(--t-fast); }
input:focus, select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
input[aria-invalid='true'], select[aria-invalid='true'] { border-color: var(--coral); }
input:disabled { background: var(--slate-soft); color: var(--ink-2); }
p { margin: 0; }
.error { color: var(--coral); font-size: var(--fs-sm); }
.banner { background: var(--coral-soft); border-radius: var(--radius-sm); padding: var(--s-2) var(--s-3); font-size: var(--fs-md); margin-bottom: var(--s-3); }
.btn:disabled { opacity: .5; cursor: not-allowed; }
@media (max-width: 640px) { .grid { grid-template-columns: 1fr; } }
</style>
