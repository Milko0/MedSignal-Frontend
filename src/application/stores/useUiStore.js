import { defineStore } from 'pinia'
import { ref } from 'vue'

export const TOAST_MS = 4000

// One short message at a time (AppToast renders it). A newer message replaces the current one and restarts the timer,
// so an old timer never clears a message that arrived after it.
export const useUiStore = defineStore('ui', () => {
  const toast = ref(null)
  let timer = null

  const dismiss = () => {
    clearTimeout(timer)
    toast.value = null
  }

  const notify = (message, tone = 'teal') => {
    clearTimeout(timer)
    toast.value = { message, tone }
    timer = setTimeout(() => { toast.value = null }, TOAST_MS)
  }

  return { toast, notify, dismiss }
})
