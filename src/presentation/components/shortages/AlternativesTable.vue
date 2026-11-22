<script setup>
// FR-10: ranked alternatives while a drug is in shortage: same route and form, not in shortage. A row opens that
// drug. The backend also lists the drug itself (other products still available); that row is not a link.
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import StatusChip from '@/presentation/components/common/StatusChip.vue'
import { matchTypeLabel, signalProfileLabel, signalProfileTone } from '@/domain/rules/alternatives'

const props = defineProps({
  alternatives: { type: Object, required: true },     // Alternatives model
  currentRxcui: { type: String, default: null },
})

const router = useRouter()
const rows = computed(() => props.alternatives.items)
const isSelf = (a) => a.rxcui === props.currentRxcui
const target = (a) => ({ name: 'drug', params: { rxcui: a.rxcui } })
const open = (a) => { if (!isSelf(a)) router.push(target(a)) }
const same = computed(() => [props.alternatives.targetDosageForm, ...props.alternatives.targetRoutes].filter(Boolean).join(' · '))
</script>

<template>
  <div class="alternatives">
    <p v-if="same" class="muted caption">Same route and form as the drug in shortage: {{ same }}</p>

    <p v-if="!rows.length" class="empty muted">No alternative with the same route and form is available</p>

    <div v-else class="scroll">
      <table>
        <thead>
          <tr>
            <th class="num">#</th><th>Product</th><th>Match</th><th>Dosage form</th><th>Routes</th>
            <th class="num">Recalls</th><th>Signal profile</th><th class="num">Available products</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in rows" :key="`${a.rank}-${a.rxcui}`" :class="{ row: !isSelf(a), self: isSelf(a) }" @click="open(a)">
            <td class="num">{{ a.rank }}</td>
            <td>
              <span v-if="isSelf(a)">{{ a.name }} <span class="muted">(this drug, other products)</span></span>
              <RouterLink v-else :to="target(a)" @click.stop>{{ a.name }}</RouterLink>
            </td>
            <td>{{ matchTypeLabel(a.matchType) }}</td>
            <td>{{ a.dosageForm ?? '–' }}</td>
            <td>{{ a.routes.length ? a.routes.join(', ') : '–' }}</td>
            <td class="num">{{ a.recalls }}</td>
            <td><StatusChip :status="a.signalProfile ?? 'unknown'" :label="signalProfileLabel(a.signalProfile) || 'Unknown'" :tone="signalProfileTone(a.signalProfile)" /></td>
            <td class="num">{{ a.productsAvailable }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.caption { margin: 0 0 var(--s-3); font-size: var(--fs-md); color: var(--ink-2); }
.empty { margin: var(--s-2) 0; }
.scroll { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: var(--fs-md); }
th { text-align: left; font-weight: 500; font-size: var(--fs-xs); letter-spacing: .02em; color: var(--ink-2); padding: var(--s-2) var(--s-3); border-bottom: 1px solid var(--line-strong); white-space: nowrap; }
td { padding: .625rem var(--s-3); border-bottom: 1px solid var(--line); vertical-align: middle; }
tbody tr:last-child td { border-bottom: 0; }
.num { text-align: right; }
td.num { font-family: var(--font-mono); font-size: var(--fs-sm); }
.row { cursor: pointer; transition: background-color var(--t-fast); }
.row:hover { background: var(--accent-soft); }
.self { background: var(--slate-soft); }
</style>
