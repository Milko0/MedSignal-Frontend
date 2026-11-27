<script setup>
// FR-19 to FR-21 and FR-27: bring new data in and see what happened. Loads and updates run in the background on the
// server (the buttons answer at once); the update log below is the only progress there is, and refreshes by itself
// while something is running.
import { onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { useAdminIngestionStore } from '@/application/stores/useAdminIngestionStore'
import { useUiStore } from '@/application/stores/useUiStore'
import { hasErrors } from '@/domain/rules/authValidation'
import { parseIncremental, parseWindow, reconcileEntries } from '@/domain/rules/admin'
import { JOB_NAMES } from '@/core/constants/admin'
import { relativeTime } from '@/domain/rules/relativeTime'
import ConfirmDialog from '@/presentation/components/admin/ConfirmDialog.vue'
import FaersFilesTable from '@/presentation/components/admin/FaersFilesTable.vue'
import RunsTable from '@/presentation/components/admin/RunsTable.vue'

const store = useAdminIngestionStore()
const ui = useUiStore()
const uid = useId()

const windowText = ref('')
const windowError = ref('')
const days = ref('')
const limit = ref('')
const incrementalErrors = ref({})
const now = ref(new Date())
const load = ref({ open: false, failure: '' })
const rebuild = ref({ open: false, failure: '' })

// A running job's clock (and "started … ago") moves whenever the log is read again.
watch(() => store.runs, () => { now.value = new Date() })

onMounted(() => {
  store.loadOverview()
  store.loadRuns(1)
  store.startWatching()
})
onBeforeUnmount(() => store.stopWatching())

// ---- FAERS load
function askLoad() {
  const parsed = parseWindow(windowText.value)
  windowError.value = parsed.ok ? '' : parsed.error
  if (!parsed.ok || !store.selected.length) return
  load.value = { open: true, failure: '' }
}
async function startLoad() {
  load.value.failure = ''
  try {
    const started = await store.startFaers({ windowQuarters: parseWindow(windowText.value).value })
    ui.notify(started.detail || 'The load has started.', 'green')
    load.value.open = false
    store.select([])
  } catch (e) {
    load.value.failure = e?.message || 'Could not start the load.'
  }
}
const cancelLoad = () => { if (!store.starting) load.value.open = false }

// ---- incremental update
async function runIncremental() {
  const parsed = parseIncremental({ sinceDays: days.value, labelLimit: limit.value })
  incrementalErrors.value = parsed.errors
  if (hasErrors(parsed.errors)) return
  try {
    const started = await store.startIncremental(parsed.value)
    ui.notify(started.detail || 'The update has started.', 'green')
  } catch (e) {
    ui.notify(e?.status === 409 ? 'An update of this kind is already running. Follow it in the log below.' : e?.message || 'Could not start the update.', e?.status === 409 ? 'amber' : 'coral')
  }
}

// ---- live layer rebuild
const askRebuild = () => { rebuild.value = { open: true, failure: '' } }
const cancelRebuild = () => { if (!store.reconciling) rebuild.value.open = false }
async function runRebuild() {
  rebuild.value.failure = ''
  try {
    await store.reconcile()
    ui.notify('The live layer was rebuilt.', 'green')
    rebuild.value.open = false
  } catch (e) {
    rebuild.value.failure = e?.message || 'Could not rebuild the live layer.'
  }
}
</script>

<template>
  <section aria-labelledby="ingestion-title">
    <div class="admin-bar">
      <div>
        <h2 id="ingestion-title">Data updates</h2>
        <p class="muted">Shortages, labels and recalls update every day by themselves. Adverse event reports (FAERS) arrive quarterly and are loaded here.</p>
      </div>
    </div>

    <div class="card block">
      <h3>Loaded quarters</h3>
      <p v-if="store.quarters" class="muted">
        The database keeps the newest {{ store.quarters.windowQuarters }} quarters; older ones are dropped when a newer one is loaded.
      </p>
      <ul v-if="store.quarters?.quarters.length" class="quarters" aria-label="Quarters in the database">
        <li v-for="q in store.quarters.quarters" :key="q">{{ q }}</li>
      </ul>
      <p v-else-if="store.quarters" class="muted">No reports are loaded.</p>
      <p v-else-if="store.overviewLoading" class="muted" role="status">Loading…</p>
    </div>

    <div class="card block">
      <h3>Load FAERS quarter files</h3>
      <FaersFilesTable :files="store.files" :selected="store.selected" :loading="store.overviewLoading" :error="store.overviewError"
                       :disabled="store.starting" @update:selected="store.select($event)" @retry="store.loadOverview()" />
      <div v-if="store.files.length" class="controls">
        <div class="field">
          <label :for="`${uid}-window`">Quarters to keep (optional)</label>
          <input :id="`${uid}-window`" v-model="windowText" inputmode="numeric" autocomplete="off" placeholder="server default"
                 :aria-invalid="!!windowError" @input="windowError = ''" />
          <p v-if="windowError" class="error" role="alert">{{ windowError }}</p>
        </div>
        <button type="button" class="btn" :disabled="!store.selected.length || store.starting || store.pending?.kind === 'faers'" @click="askLoad">
          Load {{ store.selected.length || '' }} {{ store.selected.length === 1 ? 'file' : 'files' }}
        </button>
      </div>
      <p v-if="store.preview?.wouldDrop.length" class="warn" role="status">
        Loading {{ store.preview.adding }} will remove {{ store.preview.wouldDrop.join(', ') }} from the database.
      </p>
    </div>

    <div class="card block">
      <h3>Update shortages, labels and recalls now</h3>
      <p class="muted">The worker already does this every day. Run it now to pick up the FDA's latest changes. Followers of changed medicines are alerted.</p>
      <div class="controls">
        <div class="field">
          <label :for="`${uid}-days`">Changed in the last … days (optional)</label>
          <input :id="`${uid}-days`" v-model="days" inputmode="numeric" autocomplete="off" placeholder="30" :aria-invalid="!!incrementalErrors.sinceDays" />
          <p v-if="incrementalErrors.sinceDays" class="error" role="alert">{{ incrementalErrors.sinceDays }}</p>
        </div>
        <div class="field">
          <label :for="`${uid}-limit`">At most … labels (optional)</label>
          <input :id="`${uid}-limit`" v-model="limit" inputmode="numeric" autocomplete="off" placeholder="all new" :aria-invalid="!!incrementalErrors.labelLimit" />
          <p v-if="incrementalErrors.labelLimit" class="error" role="alert">{{ incrementalErrors.labelLimit }}</p>
        </div>
        <button type="button" class="btn" :disabled="store.starting || store.pending?.kind === 'incremental'" @click="runIncremental">Run update now</button>
      </div>
    </div>

    <div class="card block">
      <div class="log-head">
        <h3>Update log</h3>
        <button type="button" class="btn outline" :disabled="store.runsLoading" @click="store.loadRuns()">Refresh</button>
      </div>
      <p v-if="store.pending" class="live" role="status">
        {{ JOB_NAMES[store.pending.kind] }} is running (started {{ relativeTime(new Date(store.pending.since).toISOString(), now) || 'just now' }}).
        It appears in this log when it finishes; the log is checked every few seconds.
      </p>
      <RunsTable :runs="store.runs" :loaded="store.runsLoaded" :loading="store.runsLoading" :error="store.runsError" :page="store.runsPage"
                 :has-prev="store.runsHasPrev" :has-next="store.runsHasNext" :now="now"
                 @prev="store.prevRuns()" @next="store.nextRuns()" @retry="store.loadRuns()" />
    </div>

    <div class="card block">
      <h3>Rebuild the live layer</h3>
      <p class="muted">Recomputes the fast data (current shortage status per ingredient) from the stored documents. Use it if the shortage status on a drug page looks out of date. It is safe to run again.</p>
      <button type="button" class="btn outline" :disabled="store.reconciling" @click="askRebuild">Rebuild now…</button>
      <dl v-if="store.reconcileResult" class="result" aria-label="Result of the last rebuild">
        <template v-for="e in reconcileEntries(store.reconcileResult)" :key="e.key">
          <dt>{{ e.key }}</dt><dd>{{ e.value }}</dd>
        </template>
      </dl>
    </div>

    <ConfirmDialog :open="load.open" title="Load FAERS files" confirm-label="Start loading" :danger="false" :pending="store.starting"
                   :failure="load.failure" @confirm="startLoad" @cancel="cancelLoad">
      <p class="dlg">
        Load {{ store.selected.length }} {{ store.selected.length === 1 ? 'file' : 'files' }} in the background?
        New drug names are looked up one by one, so a large file can take a long time. Follow it in the update log.
      </p>
      <p v-if="store.preview?.wouldDrop.length" class="warn">
        This will remove {{ store.preview.wouldDrop.join(', ') }} from the database and recompute every quarter's signals.
      </p>
    </ConfirmDialog>
    <ConfirmDialog :open="rebuild.open" title="Rebuild the live layer" confirm-label="Rebuild" :danger="false" :pending="store.reconciling"
                   :failure="rebuild.failure" message="Recompute the live data from the stored documents now?" @confirm="runRebuild" @cancel="cancelRebuild" />
  </section>
</template>

<style scoped>
.block { margin-bottom: var(--s-4); }
h3 { margin: 0 0 var(--s-2); font-size: var(--fs-lg); }
.block > p { margin: 0 0 var(--s-3); }
.quarters { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: var(--s-2); }
.quarters li { background: var(--slate-soft); border-radius: var(--radius-sm); padding: .125rem .5rem; font-family: var(--font-mono); font-size: var(--fs-sm); }
.controls { display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--s-3) var(--s-4); margin-top: var(--s-3); }
.field { display: flex; flex-direction: column; gap: var(--s-1); }
label { font-size: var(--fs-sm); font-weight: 500; color: var(--ink-2); }
input[inputmode] { width: 11rem; padding: .5rem .75rem; border: 1px solid var(--line-strong); border-radius: var(--radius-sm); font: inherit; font-size: var(--fs-md); background: var(--card); color: var(--ink); }
input[inputmode]:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
input[aria-invalid='true'] { border-color: var(--coral); }
.error { color: var(--coral); font-size: var(--fs-sm); margin: 0; }
.warn { margin: var(--s-3) 0 0; padding: var(--s-2) var(--s-3); background: var(--amber-soft); color: var(--amber); border-radius: var(--radius-sm); font-size: var(--fs-md); }
.dlg { margin: 0 0 var(--s-3); }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.log-head { display: flex; flex-wrap: wrap; align-items: center; gap: var(--s-3); margin-bottom: var(--s-2); }
.log-head h3 { margin: 0; margin-right: auto; }
.live { margin: 0 0 var(--s-3); padding: var(--s-2) var(--s-3); background: var(--amber-soft); color: var(--amber); border-radius: var(--radius-sm); font-size: var(--fs-md); }
.result { display: grid; grid-template-columns: auto 1fr; gap: var(--s-1) var(--s-4); margin: var(--s-3) 0 0; font-size: var(--fs-md); }
.result dt { color: var(--ink-2); text-transform: capitalize; }
.result dd { margin: 0; font-family: var(--font-mono); overflow-wrap: anywhere; }
</style>
