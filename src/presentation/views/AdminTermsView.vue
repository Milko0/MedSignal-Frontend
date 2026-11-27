<script setup>
// FR-26: reaction terms that are too vague to count (for example "drug ineffective"). They are left out of signals and
// label gaps. The server normalises what is typed (trimmed, upper case, single spaces: "P9 TEST TERM"), so the toast shows what was really stored.
import { onMounted, ref, useId } from 'vue'
import { useAdminTermsStore } from '@/application/stores/useAdminTermsStore'
import { useUiStore } from '@/application/stores/useUiStore'
import ConfirmDialog from '@/presentation/components/admin/ConfirmDialog.vue'

const store = useAdminTermsStore()
const ui = useUiStore()
const uid = useId()

const term = ref('')
const adding = ref(false)
const addError = ref('')
const removal = ref({ open: false, term: '', pending: false, failure: '' })

onMounted(() => store.load())

async function add() {
  const text = term.value.trim()
  if (!text || adding.value) return
  adding.value = true
  addError.value = ''
  try {
    const stored = await store.add(text)
    ui.notify(`"${stored}" is now excluded.`, 'green')
    term.value = ''
  } catch (e) {
    addError.value = e?.message || 'Could not add the term.'
  } finally {
    adding.value = false
  }
}

const askRemove = (t) => { removal.value = { open: true, term: t, pending: false, failure: '' } }
const cancelRemove = () => { if (!removal.value.pending) removal.value.open = false }
async function remove() {
  removal.value.pending = true
  removal.value.failure = ''
  try {
    await store.remove(removal.value.term)
    ui.notify(`"${removal.value.term}" is no longer excluded.`, 'green')
    removal.value.open = false
  } catch (e) {
    removal.value.failure = e?.message || 'Could not remove the term.'
  } finally {
    removal.value.pending = false
  }
}
</script>

<template>
  <section aria-labelledby="terms-title">
    <div class="admin-bar">
      <div>
        <h2 id="terms-title">Excluded terms</h2>
        <p class="muted">Reaction terms that are left out of signals and label gaps because they say too little. Label gaps, drug pages and trends use the change at once; signals pick it up at the next signal run.</p>
      </div>
    </div>

    <form class="card add" novalidate @submit.prevent="add">
      <label :for="`${uid}-term`">Add a term</label>
      <div class="row">
        <input :id="`${uid}-term`" v-model="term" autocomplete="off" placeholder="e.g. drug ineffective" :aria-invalid="!!addError"
               @input="addError = ''" />
        <button class="btn" :disabled="!term.trim() || adding">{{ adding ? 'Adding…' : 'Add term' }}</button>
      </div>
      <p v-if="addError" class="error" role="alert">{{ addError }}</p>
    </form>

    <div class="card">
      <p v-if="store.error" class="admin-state error" role="alert">
        {{ store.error }} <button type="button" class="link-btn" @click="store.load()">Retry</button>
      </p>
      <p v-else-if="!store.loaded && store.loading" class="admin-state muted" role="status">Loading excluded terms…</p>
      <p v-else-if="store.loaded && !store.items.length" class="admin-state muted">No terms are excluded.</p>

      <ul v-if="store.items.length" class="terms" :aria-busy="store.loading">
        <li v-for="t in store.items" :key="t">
          <span>{{ t }}</span>
          <button type="button" class="link-btn danger" :aria-label="`Remove ${t}`" @click="askRemove(t)">Remove</button>
        </li>
      </ul>
    </div>

    <ConfirmDialog :open="removal.open" title="Remove excluded term" confirm-label="Remove term" :pending="removal.pending"
                   :failure="removal.failure"
                   :message="`Stop excluding “${removal.term}”? It will count in signals and label gaps again.`"
                   @confirm="remove" @cancel="cancelRemove" />
  </section>
</template>

<style scoped>
.add { margin-bottom: var(--s-4); display: flex; flex-direction: column; gap: var(--s-1); }
.add label { font-size: var(--fs-sm); font-weight: 500; color: var(--ink-2); }
.row { display: flex; gap: var(--s-2); flex-wrap: wrap; }
.row input { flex: 1; min-width: 12rem; max-width: 28rem; padding: .5rem .75rem; border: 1px solid var(--line-strong); border-radius: var(--radius-sm); font: inherit; font-size: var(--fs-md); background: var(--card); color: var(--ink); }
.row input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.row input[aria-invalid='true'] { border-color: var(--coral); }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.error { color: var(--coral); font-size: var(--fs-sm); margin: 0; }
.terms { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr)); gap: var(--s-2); }
.terms li { display: flex; justify-content: space-between; align-items: center; gap: var(--s-3); border: 1px solid var(--line); border-radius: var(--radius-sm); padding: var(--s-2) var(--s-3); overflow-wrap: anywhere; }
</style>
