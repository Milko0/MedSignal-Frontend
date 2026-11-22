<script setup>
// FR-01: typo-tolerant search. Debounced (300 ms, >= 2 characters), results in a dropdown, keyboard friendly.
// The results live in useDrugStore (shared), but every box decides on its own whether to show them: only the box the
// user is typing in is `open`, and only for the query the results belong to.
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDrugStore } from '@/application/stores/useDrugStore'
import { MIN_SEARCH_LENGTH, useDebouncedSearch } from '@/presentation/composables/useDebouncedSearch'

// `picker`: choose a drug for a filter instead of opening it. Selecting emits `select` ({ rxcui, name }) and stays on
// the page; there is no Search button and no example chips.
const props = defineProps({ compact: Boolean, picker: Boolean })
const emit = defineEmits(['select'])
const router = useRouter()
const drugs = useDrugStore()

const SUGGESTIONS = ['amoxicillin', 'ibuprofen', 'metformin']

const open = ref(false)
const active = ref(-1)
const root = ref(null)
const listId = `drug-search-${Math.random().toString(36).slice(2, 8)}`

const { query, flush, cancel } = useDebouncedSearch(
  (text) => { active.value = -1; return drugs.search(text) },
  { onShort: () => drugs.search('') },
)

const text = computed(() => query.value.trim())
const longEnough = computed(() => text.value.length >= MIN_SEARCH_LENGTH)
// Results on screen belong to what is typed now (not to an earlier query or to the other search box).
const current = computed(() => longEnough.value && drugs.searchQuery === text.value)
const options = computed(() => (current.value ? drugs.results : []))
const showList = computed(() => open.value && options.value.length > 0 && !drugs.searchError)
const showEmpty = computed(() => open.value && current.value && !drugs.searching && !drugs.searchError && options.value.length === 0)
const showError = computed(() => open.value && current.value && !!drugs.searchError)
const showPanel = computed(() => showList.value || showEmpty.value || showError.value)

// "matched: X" only when the name that matched is not just the ingredient name again.
const matchedLabel = (drug) => (drug.matched && drug.matched.toLowerCase() !== drug.name.toLowerCase() ? drug.matched : null)

function choose(drug) {
  open.value = false
  active.value = -1
  cancel()
  query.value = ''
  if (props.picker) emit('select', { rxcui: drug.rxcui, name: drug.name })
  else router.push({ name: 'drug', params: { rxcui: drug.rxcui } })
}

// Enter / Search button: the highlighted result, otherwise the top one. When the answer is still on its way (debounce
// pending or request running) search now instead of waiting.
async function submit() {
  if (!longEnough.value) return
  if (!current.value || drugs.searching) await flush()
  const pick = active.value >= 0 ? options.value[active.value] : options.value[0]
  if (pick) choose(pick)
  else open.value = true
}

async function useSuggestion(word) {
  query.value = word
  open.value = true
  await flush()
}

function move(step) {
  if (!options.value.length) return
  open.value = true
  active.value = (active.value + step + options.value.length) % options.value.length
}

function onKeydown(e) {
  if (e.key === 'ArrowDown') { e.preventDefault(); move(1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1) }
  else if (e.key === 'Escape') { open.value = false; active.value = -1 }
  else if (e.key === 'Enter') { e.preventDefault(); submit() }
}

function onInput() {
  open.value = true
  active.value = -1
}

function onFocusOut(e) {
  if (!root.value?.contains(e.relatedTarget)) { open.value = false; active.value = -1 }
}
</script>

<template>
  <div ref="root" class="search" :class="{ compact: props.compact }" @focusout="onFocusOut">
    <div class="box">
    <form class="row" role="search" @submit.prevent="submit">
      <input
        v-model="query"
        type="search"
        role="combobox"
        autocomplete="off"
        aria-label="Search drugs by generic or brand name"
        aria-autocomplete="list"
        :aria-expanded="showPanel"
        :aria-controls="listId"
        :aria-activedescendant="active >= 0 ? `${listId}-${active}` : undefined"
        :placeholder="props.picker ? 'Search a drug' : props.compact ? 'Search drugs' : 'Search by generic or brand name. Misspellings are fine.'"
        @input="onInput"
        @focus="open = true"
        @keydown="onKeydown"
      />
      <button v-if="!props.compact && !props.picker" class="btn" type="submit">Search</button>
    </form>

    <div v-if="showPanel" :id="listId" class="panel" role="listbox" aria-label="Matching drugs">
      <template v-if="showList">
        <div
          v-for="(drug, i) in options"
          :id="`${listId}-${i}`"
          :key="drug.rxcui"
          class="option"
          :class="{ active: i === active }"
          role="option"
          :aria-selected="i === active"
          @mousedown.prevent
          @click="choose(drug)"
          @mousemove="active = i"
        >
          <span class="name">{{ drug.name }}</span>
          <span v-if="drug.brandNames.length" class="muted brands">{{ drug.brandNames.join(', ') }}</span>
          <span v-if="matchedLabel(drug)" class="matched">matched: {{ matchedLabel(drug) }}</span>
        </div>
      </template>
      <p v-else-if="showError" class="state error" role="status">Search is unavailable, try again</p>
      <p v-else class="state muted" role="status">No drug matches '{{ text }}'</p>
    </div>
    </div>

    <p v-if="!props.compact && !props.picker" class="try muted">
      Try:
      <button v-for="word in SUGGESTIONS" :key="word" type="button" class="chip" @click="useSuggestion(word)">{{ word }}</button>
    </p>
  </div>
</template>

<style scoped>
.search { flex: 1; }
.search.compact { flex: 0 1 260px; min-width: 9rem; }
.box { position: relative; }
.row { display: flex; gap: var(--s-2); }
input { width: 100%; padding: .625rem .875rem; border: 1px solid var(--line-strong); border-radius: var(--radius-sm); font: inherit; font-size: var(--fs-md); background: var(--card); color: var(--ink); transition: border-color var(--t-fast), box-shadow var(--t-fast); }
input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.compact input { max-width: 260px; padding: .4rem .625rem; font-size: var(--fs-sm); }
.panel { position: absolute; left: 0; right: 0; top: 100%; z-index: 20; margin-top: var(--s-1); background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden; }
.compact .panel { right: auto; width: 320px; max-width: 90vw; }
.option { display: flex; flex-wrap: wrap; align-items: baseline; gap: .125rem var(--s-2); padding: var(--s-2) var(--s-3); cursor: pointer; font-size: var(--fs-md); }
.option.active { background: var(--accent-soft); }
.name { font-weight: 600; }
.brands, .matched { font-size: var(--fs-sm); }
.matched { color: var(--ink-2); font-style: italic; }
.state { margin: 0; padding: var(--s-3); font-size: var(--fs-md); }
.state.error { color: var(--coral); }
.try { margin: var(--s-2) 0 0; font-size: var(--fs-md); color: var(--ink-2); display: flex; flex-wrap: wrap; align-items: center; gap: var(--s-2); }
.chip { background: none; color: var(--accent); border: 1px solid var(--line-strong); border-radius: var(--radius-sm); padding: .125rem .5rem; font: inherit; font-size: var(--fs-sm); cursor: pointer; transition: background-color var(--t-fast), border-color var(--t-fast); }
.chip:hover { background: var(--accent-soft); border-color: var(--accent); }
@media (max-width: 640px) { .search.compact { flex: 1 1 10rem; } }
</style>
