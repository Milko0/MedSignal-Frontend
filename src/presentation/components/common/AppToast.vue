<script setup>
// Shows the message of useUiStore.notify() (a failed follow, unfollow or dismiss). Rendered once by AppLayout.
// A coral message is an error and is announced at once; any other tone waits for the screen reader to finish.
import { computed } from 'vue'
import { useUiStore } from '@/application/stores/useUiStore'

const ui = useUiStore()
const isError = computed(() => ui.toast?.tone === 'coral')
</script>

<template>
  <div class="region" :aria-live="isError ? 'assertive' : 'polite'" aria-atomic="true">
    <div v-if="ui.toast" class="toast" :class="ui.toast.tone" :role="isError ? 'alert' : 'status'">
      <span class="msg">{{ ui.toast.message }}</span>
      <button type="button" class="x" aria-label="Dismiss message" @click="ui.dismiss()">×</button>
    </div>
  </div>
</template>

<style scoped>
.region { position: fixed; left: 50%; bottom: var(--s-5); transform: translateX(-50%); z-index: 60; width: min(32rem, calc(100% - 2 * var(--s-4))); pointer-events: none; }
.toast { --tone: var(--slate); display: flex; align-items: flex-start; gap: var(--s-3); padding: var(--s-3) var(--s-4); background: var(--card); color: var(--ink); border: 1px solid var(--line); border-left: 3px solid var(--tone); border-radius: var(--radius); box-shadow: var(--shadow); font-size: var(--fs-md); pointer-events: auto; animation: rise var(--t-med) ease-out; }
.msg { flex: 1; overflow-wrap: anywhere; }
.x { border: 0; background: none; color: var(--muted); font-size: 1.2rem; line-height: 1; cursor: pointer; padding: 0 var(--s-1); border-radius: var(--radius-sm); }
.x:hover { color: var(--ink); }
.teal { --tone: var(--teal); } .amber { --tone: var(--amber); } .coral { --tone: var(--coral); } .green { --tone: var(--green); } .slate { --tone: var(--slate); }
@keyframes rise { from { transform: translateY(8px); opacity: 0; } to { transform: none; opacity: 1; } }
</style>
