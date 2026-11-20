<script setup>
// FR-02: what the official label says about itself (date, boxed warning, product types). The label text itself is
// compared against FAERS in the label-gap view (FR-07), not shown here.
import { computed } from 'vue'
import { formatDate } from '@/domain/rules/formatShortage'

const props = defineProps({ label: { type: Object, required: true } })   // Drug360.label

const updated = computed(() => formatDate(props.label.effectiveDate))
</script>

<template>
  <section class="card" aria-labelledby="label-title">
    <h2 id="label-title">Label</h2>

    <p v-if="!label.available" class="muted">No label available</p>
    <template v-else>
      <p class="title"><template v-if="updated">Updated {{ updated }}</template><template v-else>Label on file</template></p>
      <dl>
        <dt>Boxed warning</dt>
        <dd :class="label.hasBoxedWarning ? 'yes' : 'no'">{{ label.hasBoxedWarning ? 'Yes' : 'No' }}</dd>
        <template v-if="label.productTypes.length">
          <dt>Product types</dt>
          <dd>{{ label.productTypes.join(', ') }}</dd>
        </template>
      </dl>
    </template>
  </section>
</template>

<style scoped>
h2 { font-size: .85rem; margin: 0 0 .4rem; color: var(--muted); font-weight: 600; }
.title { margin: 0; font-size: 1.05rem; font-weight: 600; }
p.muted { margin: 0; }
dl { margin: .75rem 0 0; font-size: .86rem; display: grid; grid-template-columns: auto 1fr; gap: .25rem .75rem; }
dt { color: var(--muted); }
dd { margin: 0; }
.yes { color: var(--coral); font-weight: 600; }
</style>
