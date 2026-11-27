<script setup>
// Create / edit a report or a label as JSON (they are large nested documents; the plan keeps them as a validated JSON
// editor instead of a hand-built form). Only what makes the request pointless is checked here (parseRecordJson); the
// server's own validation answer (422, 409) comes back as `failure`.
import { ref, useId, watch } from 'vue'
import AdminDialog from '@/presentation/components/admin/AdminDialog.vue'
import { parseRecordJson } from '@/domain/rules/admin'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  text: { type: String, default: '' },          // the starting JSON
  idField: { type: String, required: true },    // "report_id" | "set_id"
  expectedId: { type: String, default: undefined },   // set when editing: the id may not change
  hint: { type: String, default: '' },
  submitLabel: { type: String, default: 'Save' },
  pending: { type: Boolean, default: false },
  failure: { type: String, default: '' },
})
const emit = defineEmits(['save', 'cancel'])

const uid = useId()
const draft = ref('')
const problem = ref('')
watch(() => props.open, (open) => {
  if (open) {
    draft.value = props.text
    problem.value = ''
  }
}, { immediate: true })

function submit() {
  if (props.pending) return
  const parsed = parseRecordJson(draft.value, { idField: props.idField, expectedId: props.expectedId })
  problem.value = parsed.ok ? '' : parsed.error
  if (parsed.ok) emit('save', parsed.value)
}
</script>

<template>
  <AdminDialog :open="open" :title="title" :busy="pending" wide @close="emit('cancel')">
    <p v-if="hint" class="muted hint">{{ hint }}</p>
    <label :for="`${uid}-json`" class="label">Record (JSON)</label>
    <textarea :id="`${uid}-json`" v-model="draft" spellcheck="false" rows="18" autofocus
              :aria-invalid="!!problem" :aria-describedby="problem || failure ? `${uid}-err` : undefined" />
    <p v-if="problem || failure" :id="`${uid}-err`" class="error" role="alert">{{ problem || failure }}</p>
    <template #footer>
      <button type="button" class="btn outline" :disabled="pending" @click="emit('cancel')">Cancel</button>
      <button type="button" class="btn" :disabled="pending" @click="submit">{{ pending ? 'Saving…' : submitLabel }}</button>
    </template>
  </AdminDialog>
</template>

<style scoped>
.hint { margin: 0 0 var(--s-3); font-size: var(--fs-sm); }
.label { display: block; font-size: var(--fs-sm); color: var(--ink-2); margin-bottom: var(--s-1); }
textarea { width: 100%; box-sizing: border-box; font-family: var(--font-mono); font-size: var(--fs-sm); line-height: 1.45; padding: var(--s-3); border: 1px solid var(--line-strong); border-radius: var(--radius-sm); background: var(--card); color: var(--ink); resize: vertical; tab-size: 2; }
textarea[aria-invalid="true"] { border-color: var(--coral); }
.error { color: var(--coral); margin: var(--s-2) 0 0; overflow-wrap: anywhere; }
.btn:disabled { opacity: .5; cursor: not-allowed; }
</style>
