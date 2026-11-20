<script setup>
// FR-09: the individual FAERS reports behind one signal, in a side panel (receive date, seriousness, age, sex,
// country, reactions, suspect drugs), paginated. Esc, the backdrop and the close button close it; focus moves in on
// open and back to where it was on close.
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import DisclaimerFooter from '@/presentation/components/common/DisclaimerFooter.vue'
import StatusChip from '@/presentation/components/common/StatusChip.vue'
import { formatDate } from '@/domain/rules/formatShortage'
import { groupLabel } from '@/domain/rules/statsShaping'

const props = defineProps({ drawer: { type: Object, required: true } })   // useSignalStore().reportsDrawer
const emit = defineEmits(['close', 'page'])

const panel = ref(null)
let opener = null

const slashInReaction = computed(() => props.drawer.reaction?.includes('/'))
const hasPrev = computed(() => props.drawer.page > 1)
const hasNext = computed(() => props.drawer.page < props.drawer.totalPages)

const seriousChip = (serious) => (serious === true ? { label: 'Serious', tone: 'coral' } : serious === false ? { label: 'Not serious', tone: 'slate' } : { label: 'Seriousness unknown', tone: 'slate' })

watch(() => props.drawer.open, async (open) => {
  if (open) {
    opener = document.activeElement
    await nextTick()
    panel.value?.focus()
  } else if (opener?.isConnected) {
    opener.focus?.()
    opener = null
  }
})
onBeforeUnmount(() => { if (props.drawer.open && opener?.isConnected) opener.focus?.() })
</script>

<template>
  <div v-if="drawer.open" class="overlay" @keydown.esc.stop="emit('close')">
    <div class="backdrop" @click="emit('close')" />
    <aside ref="panel" class="panel" role="dialog" aria-modal="true" aria-labelledby="reports-title" tabindex="-1">
      <header class="head">
        <div>
          <h2 id="reports-title">Reports: {{ drawer.drug }} and {{ drawer.reaction }}</h2>
          <p v-if="!drawer.unavailable && !drawer.error" class="muted count" aria-live="polite">
            <template v-if="drawer.loading && !drawer.items.length">Loading…</template>
            <template v-else>{{ drawer.total }} {{ drawer.total === 1 ? 'report' : 'reports' }}</template>
          </p>
        </div>
        <button type="button" class="close" aria-label="Close reports" @click="emit('close')">×</button>
      </header>

      <div class="body">
        <p v-if="drawer.unavailable" class="state muted" role="status">
          <template v-if="slashInReaction">Reports are unavailable for this reaction: its name contains a "/", which the backend cannot look up yet.</template>
          <template v-else>No reports were found for this signal.</template>
        </p>
        <p v-else-if="drawer.error" class="state error" role="alert">
          Could not load the reports.
          <button type="button" class="link" @click="emit('page', drawer.page)">Retry</button>
        </p>
        <p v-else-if="!drawer.loading && !drawer.items.length" class="state muted">No reports to show.</p>

        <ol v-else class="list" :class="{ dim: drawer.loading }" :aria-busy="drawer.loading">
          <li v-for="r in drawer.items" :key="r.id" class="report">
            <div class="top">
              <strong>{{ formatDate(r.receiveDate) || 'Date unknown' }}</strong>
              <StatusChip :status="r.serious === true ? 'serious' : 'other'" :label="seriousChip(r.serious).label" :tone="seriousChip(r.serious).tone" />
              <span class="muted id">Report {{ r.id }}</span>
            </div>
            <dl>
              <dt>Age</dt><dd>{{ groupLabel(r.ageGroup) || 'Unknown' }}</dd>
              <dt>Sex</dt><dd>{{ groupLabel(r.sex) || 'Unknown' }}</dd>
              <dt>Country</dt><dd>{{ r.country ?? 'Unknown' }}</dd>
              <dt>Reactions</dt><dd><ul class="tags"><li v-for="x in r.reactions" :key="x">{{ x }}</li></ul></dd>
              <dt>Suspect drugs</dt><dd><ul class="tags"><li v-for="x in r.suspectDrugs" :key="x">{{ x }}</li></ul></dd>
            </dl>
          </li>
        </ol>
      </div>

      <footer class="foot">
        <nav v-if="drawer.totalPages > 1" class="pager" aria-label="Report pages">
          <button type="button" class="btn outline" :disabled="!hasPrev || drawer.loading" @click="emit('page', drawer.page - 1)">Previous</button>
          <span class="muted">Page {{ drawer.page }} of {{ drawer.totalPages }}</span>
          <button type="button" class="btn outline" :disabled="!hasNext || drawer.loading" @click="emit('page', drawer.page + 1)">Next</button>
        </nav>
        <DisclaimerFooter />
      </footer>
    </aside>
  </div>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; z-index: 50; display: flex; justify-content: flex-end; }
.backdrop { position: absolute; inset: 0; background: rgb(23 50 59 / 40%); }
.panel { position: relative; width: min(480px, 100%); height: 100%; background: var(--card); box-shadow: -6px 0 24px rgb(23 50 59 / 18%); display: flex; flex-direction: column; outline: none; }
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; padding: 1rem 1.25rem .75rem; border-bottom: 1px solid var(--line); }
h2 { font-size: 1.05rem; margin: 0; overflow-wrap: anywhere; }
.count { margin: .2rem 0 0; font-size: .85rem; }
.close { border: 0; background: none; font-size: 1.6rem; line-height: 1; color: var(--muted); cursor: pointer; padding: 0 .3rem; }
.close:hover { color: var(--ink); }
.body { flex: 1; overflow-y: auto; padding: .75rem 1.25rem; }
.state { margin: .5rem 0; }
.error { color: var(--coral); }
.link { background: none; border: 0; padding: 0; color: var(--teal); font: inherit; text-decoration: underline; cursor: pointer; }
.list { list-style: none; margin: 0; padding: 0; display: grid; gap: .75rem; transition: opacity .15s; }
.list.dim { opacity: .5; }
.report { border: 1px solid var(--line); border-radius: var(--radius); padding: .65rem .8rem; }
.top { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
.id { margin-left: auto; font-size: .75rem; }
dl { display: grid; grid-template-columns: auto 1fr; gap: .2rem .75rem; margin: .5rem 0 0; font-size: .86rem; }
dt { color: var(--muted); }
dd { margin: 0; }
.tags { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: .25rem; }
.tags li { background: var(--slate-soft); border-radius: 6px; padding: 0 .4rem; overflow-wrap: anywhere; }
.foot { padding: .5rem 1.25rem 1rem; border-top: 1px solid var(--line); }
.pager { display: flex; align-items: center; justify-content: space-between; gap: .75rem; }
.pager .btn:disabled { opacity: .45; cursor: not-allowed; }
</style>
