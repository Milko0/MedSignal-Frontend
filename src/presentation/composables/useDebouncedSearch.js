import { onBeforeUnmount, ref, watch } from 'vue'

export const MIN_SEARCH_LENGTH = 2

// Debounced search input. `run(q)` gets the trimmed text once the user has paused for `delay` ms and typed at least
// MIN_SEARCH_LENGTH characters; shorter text cancels a pending run and calls `onShort` instead, so nothing is sent.
// `flush()` runs the current text right away (Enter, a chip click) and the watcher will not run it a second time.
export function useDebouncedSearch(run, { delay = 300, onShort = () => {} } = {}) {
  const query = ref('')
  let timer = null
  let lastRun = null

  const cancel = () => { clearTimeout(timer); timer = null }

  function execute(text) {
    lastRun = text
    return run(text)
  }

  watch(query, (value) => {
    cancel()
    const text = value.trim()
    if (text.length < MIN_SEARCH_LENGTH) {
      lastRun = null
      onShort()
      return
    }
    if (text === lastRun) return
    timer = setTimeout(() => execute(text), delay)
  })

  function flush() {
    cancel()
    const text = query.value.trim()
    if (text.length < MIN_SEARCH_LENGTH) { lastRun = null; onShort(); return Promise.resolve() }
    return execute(text)
  }

  onBeforeUnmount(cancel)
  return { query, flush, cancel }
}
