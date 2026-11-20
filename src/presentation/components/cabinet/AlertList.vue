<script setup>
// FR-17, FR-18: the user's alerts, newest first, with dismiss one and dismiss all (asks once). Alerts come with
// `drugName` already resolved (useCabinetStore.namedAlerts). They expire after 30 days (NFR-09).
import { ref } from 'vue'
import { alertLabel, alertTone } from '@/domain/rules/alertTone'
import { relativeTime } from '@/domain/rules/relativeTime'

defineProps({ alerts: { type: Array, default: () => [] } })
defineEmits(['dismiss', 'dismiss-all'])

const confirming = ref(false)
</script>

<template>
  <section class="card" aria-labelledby="alerts-heading">
    <header class="head">
      <h2 id="alerts-heading">Alerts<span v-if="alerts.length" class="count">{{ alerts.length }}</span></h2>
      <template v-if="alerts.length">
        <button v-if="!confirming" type="button" class="link" @click="confirming = true">Dismiss all</button>
        <span v-else class="confirm" role="group" aria-label="Dismiss all alerts?">
          <span class="muted">Dismiss all {{ alerts.length }}?</span>
          <button type="button" class="link danger" @click="$emit('dismiss-all'); confirming = false">Yes, dismiss</button>
          <button type="button" class="link" @click="confirming = false">Cancel</button>
        </span>
      </template>
    </header>

    <p v-if="!alerts.length" class="empty muted">No alerts in the last 30 days.</p>
    <ul v-else>
      <li v-for="a in alerts" :key="a.id">
        <span class="dot" :class="alertTone(a.type)" role="img" :aria-label="alertLabel(a.type)" :title="alertLabel(a.type)" />
        <div class="body">
          <p class="title"><strong>{{ a.drugName }}</strong>: {{ alertLabel(a.type) }}</p>
          <p class="msg muted">{{ a.message }}</p>
        </div>
        <time class="when muted" :datetime="a.createdAt">{{ relativeTime(a.createdAt) }}</time>
        <button type="button" class="x" :aria-label="`Dismiss alert for ${a.drugName}`" @click="$emit('dismiss', a.id)">×</button>
      </li>
    </ul>

    <p class="note muted">Alerts are removed automatically after 30 days.</p>
  </section>
</template>

<style scoped>
.head { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; flex-wrap: wrap; margin-bottom: .5rem; }
h2 { font-size: 1.05rem; margin: 0; }
.count { margin-left: .45rem; color: var(--muted); font-weight: 400; font-size: .9rem; }
.link { background: none; border: 0; padding: 0; color: var(--teal); font: inherit; font-size: .85rem; text-decoration: underline; cursor: pointer; }
.link.danger { color: var(--coral); }
.confirm { display: inline-flex; align-items: baseline; gap: .6rem; font-size: .85rem; }
.empty { margin: .75rem 0; }
ul { list-style: none; margin: 0; padding: 0; }
li { display: grid; grid-template-columns: auto 1fr auto auto; align-items: start; gap: .6rem; padding: .6rem 0; border-bottom: 1px solid var(--line); }
.dot { width: .65rem; height: .65rem; border-radius: 50%; margin-top: .4rem; }
.dot.teal { background: var(--teal); } .dot.amber { background: var(--amber); } .dot.coral { background: var(--coral); } .dot.green { background: var(--green); } .dot.slate { background: var(--slate); }
.title, .msg { margin: 0; font-size: .9rem; overflow-wrap: anywhere; }
.msg { font-size: .84rem; }
.when { font-size: .75rem; white-space: nowrap; margin-top: .15rem; }
.x { border: 0; background: none; font-size: 1.2rem; line-height: 1; color: var(--muted); cursor: pointer; padding: 0 .25rem; }
.x:hover { color: var(--coral); }
.note { margin: .75rem 0 0; font-size: .78rem; }
</style>
