<script setup>
import AppNavbar from '@/presentation/components/common/AppNavbar.vue'
import AppToast from '@/presentation/components/common/AppToast.vue'
</script>

<template>
  <AppNavbar />
  <main class="page">
    <!-- Each view that shows signals, label gaps or statistics renders its own DisclaimerFooter (NFR-11), with the
         meta.disclaimer of its response when it has one. -->
    <RouterView />
  </main>
  <AppToast />
</template>
