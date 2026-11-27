<script setup>
import { useRoute } from 'vue-router'
import AppNavbar from '@/presentation/components/common/AppNavbar.vue'
import AppToast from '@/presentation/components/common/AppToast.vue'

// meta.wide: tables of the admin area need more room than the 1040px reading width.
const route = useRoute()
</script>

<template>
  <AppNavbar />
  <main class="page" :class="{ wide: route.meta.wide }">
    <!-- Each view that shows signals, label gaps or statistics renders its own DisclaimerFooter (NFR-11), with the
         meta.disclaimer of its response when it has one. -->
    <RouterView />
  </main>
  <AppToast />
</template>
