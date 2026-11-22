<script setup>
// View 5 - My medicines (FR-15 to FR-18): the followed drugs with their status, filter chips, and the alert list.
import { computed, onMounted } from 'vue'
import { useCabinetStore } from '@/application/stores/useCabinetStore'
import { useUiStore } from '@/application/stores/useUiStore'
import { FILTERS } from '@/domain/rules/cabinet'
import FollowedDrugRow from '@/presentation/components/cabinet/FollowedDrugRow.vue'
import AlertList from '@/presentation/components/cabinet/AlertList.vue'
import DrugSearchBox from '@/presentation/components/drug/DrugSearchBox.vue'
import DisclaimerFooter from '@/presentation/components/common/DisclaimerFooter.vue'

const cabinet = useCabinetStore()
const ui = useUiStore()

// Skipped while the lists are fresh (the navbar has just loaded them); the user can always retry.
onMounted(() => cabinet.load())

// Until the first answer (or failure) there is nothing to show; this also covers the first render, before load() has started.
const firstLoad = computed(() => !cabinet.loaded && !cabinet.error)
const failed = computed(() => !!cabinet.error && !cabinet.loaded && !cabinet.followed.length)
const count = computed(() => cabinet.followedCount)

// "Find a drug to follow" takes the user to the search box of the navbar.
const focusSearch = () => document.querySelector('header.nav input[type="search"]')?.focus()

async function unfollow(rxcui) {
  const name = cabinet.followed.find((d) => d.rxcui === rxcui)?.name ?? 'this medicine'
  try { await cabinet.unfollow(rxcui) } catch { ui.notify(`Could not unfollow ${name}. Try again.`, 'coral') }
}
async function dismiss(id) {
  try { await cabinet.dismiss(id) } catch { ui.notify('Could not dismiss the alert. Try again.', 'coral') }
}
async function dismissAll() {
  try { await cabinet.dismissAll() } catch { ui.notify('Could not dismiss the alerts. Try again.', 'coral') }
}
</script>

<template>
  <header class="intro">
    <div>
      <h1>My medicines</h1>
      <p v-if="cabinet.loaded" class="muted">{{ count }} {{ count === 1 ? 'medicine' : 'medicines' }} followed. Click a medicine to open its page.</p>
    </div>
    <button type="button" class="btn outline" @click="focusSearch">Find a drug to follow</button>
  </header>

  <p v-if="failed" class="card error" role="alert">
    Could not load your medicines.
    <button type="button" class="link" @click="cabinet.load({ force: true })">Retry</button>
  </p>

  <p v-else-if="firstLoad" class="muted" role="status">Loading…</p>

  <div v-else class="layout">
    <section class="medicines" aria-label="Followed medicines">
      <div v-if="!count" class="card empty">
        <h2>You don't follow any medicine yet</h2>
        <p class="muted">Follow a medicine to see its shortage status and get alerts. Search for one:</p>
        <DrugSearchBox />
      </div>

      <template v-else>
        <div class="chips" role="group" aria-label="Filter medicines">
          <button
            v-for="f in FILTERS"
            :key="f.key"
            type="button"
            class="chip"
            :class="{ active: cabinet.activeFilter === f.key }"
            :aria-pressed="cabinet.activeFilter === f.key"
            @click="cabinet.setFilter(f.key)"
          >{{ f.label }} <span class="n">{{ cabinet.filterCounts[f.key] }}</span></button>
        </div>

        <p v-if="!cabinet.filteredRows.length" class="muted none">No medicines match this filter.</p>
        <ul v-else class="rows">
          <FollowedDrugRow v-for="r in cabinet.filteredRows" :key="r.rxcui" :row="r" @unfollow="unfollow" />
        </ul>
      </template>
    </section>

    <AlertList :alerts="cabinet.namedAlerts" @dismiss="dismiss" @dismiss-all="dismissAll" />
  </div>

  <DisclaimerFooter />
</template>

<style scoped>
.intro { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--s-4); flex-wrap: wrap; margin-bottom: var(--s-5); }
.intro p { margin: var(--s-1) 0 0; color: var(--ink-2); }
.layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, 360px); gap: var(--s-5); align-items: start; }
.chips { display: flex; flex-wrap: wrap; gap: var(--s-2); margin-bottom: var(--s-4); }
.chip { border: 1px solid var(--line-strong); background: var(--card); color: var(--ink-2); border-radius: var(--radius-sm); padding: .3rem .75rem; font: inherit; font-size: var(--fs-md); font-weight: 500; cursor: pointer; transition: background-color var(--t-fast), border-color var(--t-fast), color var(--t-fast); }
.chip:hover { border-color: var(--accent); color: var(--ink); }
.chip.active { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
.chip .n { font-family: var(--font-mono); font-size: var(--fs-sm); opacity: .8; margin-left: var(--s-1); }
.rows { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--s-2); }
.none { margin: var(--s-2) 0; }
.empty h2 { margin: 0 0 var(--s-1); }
.empty p { margin: 0 0 var(--s-3); color: var(--ink-2); }
.error { color: var(--coral); }
.link { background: none; border: 0; padding: 0; color: var(--accent); font: inherit; text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
@media (max-width: 900px) { .layout { grid-template-columns: minmax(0, 1fr); } }
</style>
