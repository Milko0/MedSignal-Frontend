import { ref, watch } from 'vue'

export function useDebouncedSearch(run, delay = 300) {
  const query = ref('')
  let t
  watch(query, (q) => { clearTimeout(t); if (q.length >= 2) t = setTimeout(() => run(q), delay) })
  return { query }
}
