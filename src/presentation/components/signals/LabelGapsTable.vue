<script setup>
// FR-07: reactions reported in FAERS that the official label text does not (fully) mention, for one drug.
// States: no label, label not comparable (OTC only: no adverse reactions section), nothing missing, or the table.
import { computed } from 'vue'
import LabelGapChip from '@/presentation/components/signals/LabelGapChip.vue'

const OTC_MESSAGE = 'Only OTC labels exist, which have no adverse reactions section'

const props = defineProps({
  data: { type: Object, required: true },            // LabelGaps model
  minReports: { type: Number, default: 20 },
})

const unavailable = computed(() => !props.data.labelAvailable)
const notComparable = computed(() => props.data.labelAvailable && !props.data.comparable)
const empty = computed(() => props.data.labelAvailable && props.data.comparable && props.data.gaps.length === 0)
</script>

<template>
  <div class="gaps">
    <p v-if="unavailable" class="state muted">No label is available for this drug, so its reactions cannot be compared with one.</p>
    <p v-else-if="notComparable" class="state muted">{{ data.note || OTC_MESSAGE }}</p>

    <template v-else>
      <p v-if="data.note" class="note muted">{{ data.note }}</p>
      <p v-if="empty" class="state muted">No label gaps among the reactions with at least {{ minReports }} reports.</p>

      <div v-else class="scroll">
        <table>
          <thead>
            <tr>
              <th>Reaction</th>
              <th class="num">Reports</th>
              <th>In label</th>
              <th title="The reaction also appears in the label's indications, so it may describe the condition being treated rather than a side effect">In indications</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="g in data.gaps" :key="g.reaction">
              <td class="reaction">{{ g.reaction }}</td>
              <td class="num">{{ g.reports }}</td>
              <td><LabelGapChip :label-match="g.matchLevel" /></td>
              <td :class="g.inIndications ? 'yes' : 'muted'">{{ g.inIndications ? 'Yes' : 'No' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.state, .note { margin: .5rem 0; }
.note { font-size: .86rem; }
.scroll { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: .9rem; }
th { text-align: left; font-weight: 600; font-size: .78rem; color: var(--muted); padding: .35rem .5rem; border-bottom: 1px solid var(--line); white-space: nowrap; }
td { padding: .5rem; border-bottom: 1px solid var(--line); }
.num { text-align: right; font-variant-numeric: tabular-nums; }
.reaction { overflow-wrap: anywhere; }
.yes { font-weight: 600; }
</style>
