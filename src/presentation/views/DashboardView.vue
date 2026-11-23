<script setup>
// View 2 - Dashboard (FR-01, FR-06, FR-17, FR-18): search, summary tiles, latest alerts, emerging signals.
// A guest sees the search, the emerging-signals tile and card; a user also sees the followed medicines, alerts and
// their tiles. Each card loads and fails on its own (useDashboardStore).
import { onMounted } from 'vue'
import { useAuthStore } from '@/application/stores/useAuthStore'
import { useDashboardStore } from '@/application/stores/useDashboardStore'
import DrugSearchBox from '@/presentation/components/drug/DrugSearchBox.vue'
import DisclaimerFooter from '@/presentation/components/common/DisclaimerFooter.vue'
import StatTile from '@/presentation/components/dashboard/StatTile.vue'
import EmergingSignalsCard from '@/presentation/components/dashboard/EmergingSignalsCard.vue'
import LatestAlertsCard from '@/presentation/components/dashboard/LatestAlertsCard.vue'

const auth = useAuthStore()
const dash = useDashboardStore()

onMounted(() => dash.load())
</script>

<template>
  <header class="intro">
    <h1 v-if="auth.loggedIn">Welcome back<template v-if="auth.user?.username">, {{ auth.user.username }}</template></h1>
    <h1 v-else>Search drug safety and shortages</h1>
    <p class="muted">Safety signals, label gaps and shortages from FDA data, in one place.</p>
  </header>

  <DrugSearchBox class="search" />

  <div class="tiles">
    <template v-if="auth.loggedIn">
      <StatTile label="Medicines followed" :value="dash.followedCount" tone="teal" />
      <StatTile label="New alerts" :value="dash.alertCount" tone="coral" />
      <StatTile label="Followed drugs in shortage" :value="dash.inShortageCount" tone="amber" />
    </template>
    <StatTile label="Emerging signals this quarter" :value="dash.emergingCount" tone="coral" />
    <p v-if="!auth.loggedIn" class="cta card">
      <RouterLink to="/register">Create an account</RouterLink> to follow medicines and get alerts.
    </p>
  </div>

  <div class="grid two cards">
    <LatestAlertsCard
      v-if="auth.loggedIn"
      :alerts="dash.latestAlerts"
      :loading="dash.alertsLoading || dash.followedLoading"
      :error="dash.alertsError"
      @retry="dash.loadAlerts"
    />
    <EmergingSignalsCard
      :data="dash.emerging"
      :loading="dash.emergingLoading"
      :error="dash.emergingError"
      @retry="dash.loadEmerging"
    />
  </div>

  <DisclaimerFooter :text="dash.emerging?.disclaimer ?? undefined" />
</template>

<style scoped>
.intro { margin-bottom: var(--s-5); }
.intro p { margin: var(--s-1) 0 0; color: var(--ink-2); max-width: 60ch; }
.search { margin-bottom: var(--s-5); }
.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: var(--s-4); margin-bottom: var(--s-4); }
.cta { display: block; align-self: stretch; margin: 0; padding: var(--s-4) var(--s-5); font-size: var(--fs-md); color: var(--ink-2); }
.cards { align-items: start; }
</style>
