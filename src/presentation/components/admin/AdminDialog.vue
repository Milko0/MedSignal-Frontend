<script setup>
// Modal base of the admin dialogs (confirm, form, JSON editor). Esc, the backdrop and × close it, unless `busy` (a
// request is in flight: closing then would hide its result). Focus moves into the dialog on open and back to the
// element that opened it on close, like signals/ReportsDrawer.vue.
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  busy: { type: Boolean, default: false },
  wide: { type: Boolean, default: false },
})
const emit = defineEmits(['close'])

const titleId = useId()
const panel = ref(null)
let opener = null

const close = () => { if (!props.busy) emit('close') }

watch(() => props.open, async (open) => {
  if (open) {
    opener = document.activeElement
    await nextTick()
    // An autofocus field inside the dialog wins; otherwise the panel itself takes focus.
    if (!panel.value?.contains(document.activeElement)) panel.value?.focus()
  } else if (opener?.isConnected) {
    opener.focus?.()
    opener = null
  }
}, { immediate: true })
onBeforeUnmount(() => { if (props.open && opener?.isConnected) opener.focus?.() })
</script>

<template>
  <div v-if="open" class="overlay" @keydown.esc.stop="close">
    <div class="backdrop" @click="close" />
    <div ref="panel" class="panel" :class="{ wide }" role="dialog" aria-modal="true" :aria-labelledby="titleId" tabindex="-1">
      <header class="head">
        <h2 :id="titleId">{{ title }}</h2>
        <button type="button" class="close" aria-label="Close" :disabled="busy" @click="close">×</button>
      </header>
      <div class="body"><slot /></div>
      <footer v-if="$slots.footer" class="foot"><slot name="footer" /></footer>
    </div>
  </div>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; padding: var(--s-4); }
.backdrop { position: absolute; inset: 0; background: var(--scrim); animation: fade var(--t-med) ease-out; }
.panel { position: relative; width: min(30rem, 100%); max-height: 100%; display: flex; flex-direction: column; background: var(--card); border-radius: var(--radius); box-shadow: var(--shadow); outline: none; animation: rise var(--t-med) ease-out; }
.panel.wide { width: min(46rem, 100%); }
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--s-4); padding: var(--s-4) var(--s-5) var(--s-3); border-bottom: 1px solid var(--line); }
h2 { font-size: var(--fs-lg); margin: 0; overflow-wrap: anywhere; }
.close { border: 0; background: none; font-size: 1.5rem; line-height: 1; color: var(--muted); cursor: pointer; padding: 0 var(--s-1); border-radius: var(--radius-sm); }
.close:hover:not(:disabled) { color: var(--ink); }
.close:disabled { opacity: .45; cursor: not-allowed; }
.body { padding: var(--s-4) var(--s-5); overflow-y: auto; }
.foot { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: var(--s-2); padding: var(--s-3) var(--s-5) var(--s-4); border-top: 1px solid var(--line); }
@keyframes rise { from { transform: translateY(8px); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
</style>
