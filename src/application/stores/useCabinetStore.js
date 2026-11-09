import { defineStore } from 'pinia'
import { ref } from 'vue'
import { services } from '@/composition/container'

export const useCabinetStore = defineStore('cabinet', () => {
  const followed = ref([])
  const alerts = ref([])

  async function load() {
    followed.value = await services.cabinet.list()
    alerts.value = await services.cabinet.alerts()
  }
  async function follow(rxcui) { await services.cabinet.follow(rxcui); await load() }
  async function unfollow(rxcui) { await services.cabinet.unfollow(rxcui); await load() }
  async function dismiss(id) { await services.cabinet.dismiss(id); alerts.value = alerts.value.filter((a) => a.id !== id) }
  async function dismissAll() { await services.cabinet.dismissAll(); alerts.value = [] }
  return { followed, alerts, load, follow, unfollow, dismiss, dismissAll }
})
