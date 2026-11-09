import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const toast = ref(null)
  const notify = (message, tone = 'teal') => { toast.value = { message, tone }; setTimeout(() => (toast.value = null), 4000) }
  return { toast, notify }
})
