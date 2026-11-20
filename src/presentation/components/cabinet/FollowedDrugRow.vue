<script setup>
// FR-16: one followed medicine: name (opens its page), what changed last, a status chip and a "Following" button that
// asks once before unfollowing.
import { computed, ref } from 'vue'
import StatusChip from '@/presentation/components/common/StatusChip.vue'
import { relativeTime } from '@/domain/rules/relativeTime'

const props = defineProps({ row: { type: Object, required: true } })   // a row of useCabinetStore.rows
defineEmits(['unfollow'])

const confirming = ref(false)

const subtitle = computed(() => {
  const { alert, packagesInShortage, status } = props.row
  if (alert) return alert.message
  if (status.kind === 'SHORTAGE') return packagesInShortage > 0 ? `${packagesInShortage} ${packagesInShortage === 1 ? 'package' : 'packages'} in shortage` : 'In shortage'
  return 'No recent changes'
})
</script>

<template>
  <li class="row" @keydown.esc="confirming = false">
    <div class="main">
      <RouterLink class="name" :to="{ name: 'drug', params: { rxcui: row.rxcui } }">{{ row.name }}</RouterLink>
      <p class="sub muted">{{ subtitle }}</p>
    </div>

    <div class="status">
      <StatusChip :status="row.status.kind" :label="row.status.label" :tone="row.status.tone" />
      <time v-if="row.alert" class="when muted" :datetime="row.alert.createdAt">{{ relativeTime(row.alert.createdAt) }}</time>
    </div>

    <div class="actions">
      <button v-if="!confirming" type="button" class="btn outline" :aria-label="`Following ${row.name}. Unfollow`" @click="confirming = true">Following</button>
      <div v-else class="confirm" role="group" :aria-label="`Unfollow ${row.name}?`">
        <span class="muted">Unfollow?</span>
        <button type="button" class="btn danger" @click="$emit('unfollow', row.rxcui); confirming = false">Unfollow</button>
        <button type="button" class="btn outline" @click="confirming = false">Cancel</button>
      </div>
    </div>
  </li>
</template>

<style scoped>
.row { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: .75rem 1rem; padding: .8rem 1rem; border: 1px solid var(--line); border-radius: var(--radius); background: var(--card); }
.main { min-width: 0; }
.name { font-weight: 600; overflow-wrap: anywhere; }
.sub { margin: .15rem 0 0; font-size: .85rem; overflow-wrap: anywhere; }
.status { display: flex; flex-direction: column; align-items: flex-end; gap: .2rem; }
.when { font-size: .75rem; white-space: nowrap; }
.actions .btn { font-size: .85rem; padding: .35rem .8rem; }
.confirm { display: flex; align-items: center; gap: .4rem; font-size: .85rem; }
.btn.danger { background: var(--coral); }
@media (max-width: 640px) { .row { grid-template-columns: 1fr auto; } .actions { grid-column: 1 / -1; } .status { align-items: flex-end; } }
</style>
