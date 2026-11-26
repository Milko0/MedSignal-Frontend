<script setup>
// "Are you sure?" for destructive or heavy actions. With `requireText` the user must type that text first (used for
// deletes that cannot be undone, same idea as the account deletion in profile/AccountCard.vue).
import { computed, ref, useId, watch } from 'vue'
import AdminDialog from '@/presentation/components/admin/AdminDialog.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  message: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Delete' },
  danger: { type: Boolean, default: true },
  requireText: { type: String, default: '' },
  pending: { type: Boolean, default: false },
  failure: { type: String, default: '' },
})
const emit = defineEmits(['confirm', 'cancel'])

const uid = useId()
const typed = ref('')
watch(() => props.open, (open) => { if (open) typed.value = '' })

const allowed = computed(() => !props.requireText || typed.value.trim() === props.requireText)
const confirm = () => { if (allowed.value && !props.pending) emit('confirm') }
</script>

<template>
  <AdminDialog :open="open" :title="title" :busy="pending" @close="emit('cancel')">
    <p v-if="message" class="message"><slot name="message">{{ message }}</slot></p>
    <slot />
    <div v-if="requireText" class="field">
      <label :for="`${uid}-typed`">Type <strong>{{ requireText }}</strong> to confirm</label>
      <input :id="`${uid}-typed`" v-model="typed" type="text" autocomplete="off" autofocus @keydown.enter.prevent="confirm" />
    </div>
    <p v-if="failure" class="error" role="alert">{{ failure }}</p>
    <template #footer>
      <button type="button" class="btn outline" :disabled="pending" @click="emit('cancel')">Cancel</button>
      <button type="button" class="btn" :class="{ danger }" :disabled="!allowed || pending" @click="confirm">
        {{ pending ? 'Working…' : confirmLabel }}
      </button>
    </template>
  </AdminDialog>
</template>

<style scoped>
.message { margin: 0 0 var(--s-3); overflow-wrap: anywhere; }
.field { display: grid; gap: var(--s-1); }
.field input { font: inherit; padding: var(--s-2) var(--s-3); border: 1px solid var(--line-strong); border-radius: var(--radius-sm); background: var(--card); color: var(--ink); }
.error { color: var(--coral); margin: var(--s-3) 0 0; }
.btn:disabled { opacity: .5; cursor: not-allowed; }
/* destructive: coral, but never as the only signal (the label says Delete) */
.btn.danger { background: var(--coral); border-color: var(--coral); color: var(--on-accent); }
.btn.danger:hover:not(:disabled) { background: var(--coral); border-color: var(--coral); filter: brightness(.92); }
</style>
