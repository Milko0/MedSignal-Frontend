import { ref } from 'vue'

export function useAsyncState(fn) {
  const loading = ref(false), error = ref(null), data = ref(null)
  async function run(...args) {
    loading.value = true; error.value = null
    try { data.value = await fn(...args) } catch (e) { error.value = e } finally { loading.value = false }
  }
  return { loading, error, data, run }
}
