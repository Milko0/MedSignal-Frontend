import { toAlert } from '@/infrastructure/mappers/alertMapper'

export function createCabinetService(api) {
  return {
    list: () => api.list().then((r) => r.followed),
    follow: (rxcui) => api.follow(rxcui),
    unfollow: (rxcui) => api.unfollow(rxcui),
    alerts: () => api.alerts().then((r) => r.alerts.map(toAlert)),
    dismiss: (id) => api.dismiss(id),
    dismissAll: () => api.dismissAll(),
  }
}
