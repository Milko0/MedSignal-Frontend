import { defineStore } from 'pinia'
import { ref } from 'vue'
import { services } from '@/composition/container'

export const useCabinetStore = defineStore('cabinet', () => {
  const followed = ref([])
  const alerts = ref([])

  // The two lists are independent: one failing must not hide the other, so they can be loaded on their own.
  async function loadFollowed() { followed.value = await services.cabinet.list() }
  async function loadAlerts() { alerts.value = await services.cabinet.alerts() }
  async function load() { await Promise.all([loadFollowed(), loadAlerts()]) }
  async function follow(rxcui) { await services.cabinet.follow(rxcui); await load() }
  async function unfollow(rxcui) { await services.cabinet.unfollow(rxcui); await load() }
  async function dismiss(id) { await services.cabinet.dismiss(id); alerts.value = alerts.value.filter((a) => a.id !== id) }
  async function dismissAll() { await services.cabinet.dismissAll(); alerts.value = [] }
  function reset() { followed.value = []; alerts.value = [] }
  return { followed, alerts, load, loadFollowed, loadAlerts, follow, unfollow, dismiss, dismissAll, reset }
})
