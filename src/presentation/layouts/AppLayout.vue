<script setup>
import AppNavbar from '@/presentation/components/common/AppNavbar.vue'
import DisclaimerFooter from '@/presentation/components/common/DisclaimerFooter.vue'
</script>

<template>
  <AppNavbar />
  <main class="page">
    <RouterView />
    <DisclaimerFooter />
  </main>
</template>
