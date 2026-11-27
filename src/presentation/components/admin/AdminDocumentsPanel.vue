<script setup>
// The whole screen of an admin resource that is edited as a JSON document (reports FR-22, labels FR-23): a paged table
// of summaries, "open by id" (the list has no search), a detail dialog, create / edit through the JSON editor, delete.
// AdminReportsView and AdminLabelsView only choose the store, the columns and the wording.
import { onMounted, ref } from 'vue'
import { useUiStore } from '@/application/stores/useUiStore'
import { describeRecordError, newRecordTemplate, stringifyRecord } from '@/domain/rules/admin'
import AdminDialog from '@/presentation/components/admin/AdminDialog.vue'
import ConfirmDialog from '@/presentation/components/admin/ConfirmDialog.vue'
import JsonRecordDialog from '@/presentation/components/admin/JsonRecordDialog.vue'
import PagerBar from '@/presentation/components/admin/PagerBar.vue'

const props = defineProps({
  store: { type: Object, required: true },        // a store made by defineAdminCrudStore
  kind: { type: String, required: true },         // 'report' | 'label' (template + wording)
  idField: { type: String, required: true },      // 'report_id' | 'set_id'
  title: { type: String, required: true },
  intro: { type: String, default: '' },
  idLabel: { type: String, required: true },      // "Report id", "Label set id"
  columns: { type: Array, required: true },       // [{ key, label, mono? }] read from rowOf(doc)
  rowOf: { type: Function, required: true },
  editHint: { type: String, default: '' },
})

const ui = useUiStore()
const noun = props.kind

const detail = ref({ open: false, doc: null })
const editor = ref({ open: false, mode: 'create', text: '', expectedId: undefined, pending: false, failure: '' })
const removal = ref({ open: false, doc: null, pending: false, failure: '' })
const lookup = ref({ id: '', pending: false, error: '' })

onMounted(() => props.store.load(1))

const idOf = (doc) => doc[props.idField]

// ---- open by id
async function openById() {
  const id = lookup.value.id.trim()
  if (!id || lookup.value.pending) return
  lookup.value.pending = true
  lookup.value.error = ''
  try {
    detail.value = { open: true, doc: await props.store.fetchOne(id) }
  } catch (e) {
    lookup.value.error = e?.status === 404 ? `No ${noun} with id ${id}.` : e?.message || `Could not open the ${noun}.`
  } finally {
    lookup.value.pending = false
  }
}
const showDetail = (doc) => { detail.value = { open: true, doc } }
const closeDetail = () => { detail.value.open = false }

// ---- create / edit
function openCreate() {
  editor.value = { open: true, mode: 'create', text: stringifyRecord(newRecordTemplate(noun)), expectedId: undefined, pending: false, failure: '' }
}
// Edit starts from a fresh read, so a stale list row is never saved over a newer version.
async function openEdit(doc) {
  detail.value.open = false
  try {
    const fresh = await props.store.fetchOne(idOf(doc))
    editor.value = { open: true, mode: 'edit', text: stringifyRecord(fresh), expectedId: idOf(fresh), pending: false, failure: '' }
  } catch (e) {
    ui.notify(e?.status === 404 ? `This ${noun} no longer exists.` : e?.message || `Could not open the ${noun}.`, 'coral')
    if (e?.status === 404) props.store.load()
  }
}
const closeEditor = () => { if (!editor.value.pending) editor.value.open = false }
async function save(record) {
  editor.value.pending = true
  editor.value.failure = ''
  try {
    if (editor.value.mode === 'edit') await props.store.update(editor.value.expectedId, record)
    else await props.store.create(record)
    ui.notify(editor.value.mode === 'edit' ? `The ${noun} was saved.` : `The ${noun} was created.`, 'green')
    editor.value.open = false
  } catch (e) {
    editor.value.failure = describeRecordError(e)
  } finally {
    editor.value.pending = false
  }
}

// ---- delete
function askRemove(doc) {
  detail.value.open = false
  removal.value = { open: true, doc, pending: false, failure: '' }
}
const cancelRemove = () => { if (!removal.value.pending) removal.value.open = false }
async function remove() {
  removal.value.pending = true
  removal.value.failure = ''
  try {
    await props.store.remove(removal.value.doc)
    ui.notify(`The ${noun} ${idOf(removal.value.doc)} was deleted.`, 'green')
    removal.value.open = false
  } catch (e) {
    removal.value.failure = e?.message || `Could not delete the ${noun}.`
  } finally {
    removal.value.pending = false
  }
}
</script>

<template>
  <section :aria-labelledby="`${kind}-title`">
    <div class="admin-bar">
      <div>
        <h2 :id="`${kind}-title`">{{ title }}</h2>
        <p class="muted">{{ intro }}</p>
      </div>
      <button type="button" class="btn" @click="openCreate">New {{ noun }}</button>
    </div>

    <form class="lookup card" novalidate @submit.prevent="openById">
      <label :for="`${kind}-lookup`">Open by {{ idLabel.toLowerCase() }}</label>
      <div class="lookup-row">
        <input :id="`${kind}-lookup`" v-model="lookup.id" autocomplete="off" :aria-invalid="!!lookup.error"
               @input="lookup.error = ''" />
        <button class="btn outline" :disabled="!lookup.id.trim() || lookup.pending">{{ lookup.pending ? 'Opening…' : 'Open' }}</button>
      </div>
      <p v-if="lookup.error" class="error" role="alert">{{ lookup.error }}</p>
    </form>

    <div class="card">
      <p v-if="store.error" class="admin-state error" role="alert">
        {{ store.error }} <button type="button" class="link-btn" @click="store.load()">Retry</button>
      </p>
      <p v-else-if="!store.loaded && store.loading" class="admin-state muted" role="status">Loading…</p>
      <p v-else-if="store.loaded && !store.items.length" class="admin-state muted">Nothing on this page.</p>

      <div v-if="store.items.length" class="data-scroll">
        <table class="data-table" :class="{ dim: store.loading }" :aria-busy="store.loading">
          <thead>
            <tr>
              <th v-for="c in columns" :key="c.key" scope="col">{{ c.label }}</th>
              <th scope="col"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in store.items" :key="idOf(d)">
              <td v-for="c in columns" :key="c.key" :class="{ mono: c.mono }">{{ rowOf(d)[c.key] }}</td>
              <td class="row-actions">
                <button type="button" class="link-btn" :aria-label="`View ${idOf(d)}`" @click="showDetail(d)">View</button>
                <button type="button" class="link-btn" :aria-label="`Edit ${idOf(d)}`" @click="openEdit(d)">Edit</button>
                <button type="button" class="link-btn danger" :aria-label="`Delete ${idOf(d)}`" @click="askRemove(d)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <PagerBar :page="store.page" :has-prev="store.hasPrev" :has-next="store.hasNext" :loading="store.loading"
                @prev="store.prev()" @next="store.next()" />
    </div>

    <AdminDialog :open="detail.open" :title="`${idLabel}: ${detail.doc ? idOf(detail.doc) : ''}`" wide @close="closeDetail">
      <pre class="json" tabindex="0" aria-label="Record as JSON">{{ detail.doc ? stringifyRecord(detail.doc) : '' }}</pre>
      <template #footer>
        <button type="button" class="btn outline" @click="closeDetail">Close</button>
        <button type="button" class="btn outline" @click="openEdit(detail.doc)">Edit</button>
        <button type="button" class="btn outline danger" @click="askRemove(detail.doc)">Delete</button>
      </template>
    </AdminDialog>

    <JsonRecordDialog :open="editor.open" :title="editor.mode === 'edit' ? `Edit ${noun}` : `New ${noun}`"
                      :text="editor.text" :id-field="idField" :expected-id="editor.expectedId" :hint="editHint"
                      :submit-label="editor.mode === 'edit' ? 'Save changes' : `Create ${noun}`"
                      :pending="editor.pending" :failure="editor.failure" @save="save" @cancel="closeEditor" />

    <ConfirmDialog :open="removal.open" :title="`Delete ${noun}`" :confirm-label="`Delete ${noun}`" :pending="removal.pending"
                   :failure="removal.failure" :message="`Delete the ${noun} ${removal.doc ? idOf(removal.doc) : ''}? This cannot be undone.`"
                   @confirm="remove" @cancel="cancelRemove" />
  </section>
</template>

<style scoped>
.lookup { margin-bottom: var(--s-4); display: flex; flex-direction: column; gap: var(--s-1); }
.lookup label { font-size: var(--fs-sm); font-weight: 500; color: var(--ink-2); }
.lookup-row { display: flex; gap: var(--s-2); flex-wrap: wrap; }
.lookup input { flex: 1; min-width: 12rem; max-width: 28rem; padding: .5rem .75rem; border: 1px solid var(--line-strong); border-radius: var(--radius-sm); font: inherit; font-size: var(--fs-md); background: var(--card); color: var(--ink); }
.lookup input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.lookup input[aria-invalid='true'] { border-color: var(--coral); }
.error { color: var(--coral); font-size: var(--fs-sm); margin: 0; }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.btn.danger { color: var(--coral); border-color: var(--coral); }
.json { margin: 0; padding: var(--s-3); background: var(--slate-soft); border-radius: var(--radius-sm); font-family: var(--font-mono); font-size: var(--fs-sm); line-height: 1.45; overflow: auto; max-height: 60vh; white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
