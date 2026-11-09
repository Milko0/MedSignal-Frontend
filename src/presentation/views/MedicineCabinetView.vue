<script setup>
// View 5 - My medicines (FR-15 to FR-18): followed drugs with status and the alert list.
import { onMounted } from 'vue'
import { useCabinetStore } from '@/application/stores/useCabinetStore'

const cabinet = useCabinetStore()
onMounted(() => cabinet.load())
</script>

<template>
  <h1>My medicines</h1>
  <p class="muted">{{ cabinet.followed.length }} medicines followed. TODO: FollowedDrugRow list and AlertList.</p>
</template>
