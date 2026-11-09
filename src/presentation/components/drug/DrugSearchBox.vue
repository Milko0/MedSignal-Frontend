<script setup>
// FR-01: typo-tolerant search. TODO: debounce (useDebouncedSearch) and call useDrugStore.search.
import { ref } from 'vue'
import { useRouter } from 'vue-router'

defineProps({ compact: Boolean })
const query = ref('')
const router = useRouter()
const submit = () => query.value && router.push({ path: '/', query: { q: query.value } })
</script>

<template>
  <form class="search" @submit.prevent="submit">
    <input v-model="query" type="search" :class="{ compact }" placeholder="Search by generic or brand name. Misspellings are fine." />
  </form>
</template>

<style scoped>
.search { flex: 1; }
input { width: 100%; padding: .6rem .8rem; border: 1px solid var(--line); border-radius: 8px; font: inherit; }
input.compact { max-width: 260px; padding: .4rem .6rem; }
</style>
