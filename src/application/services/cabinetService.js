export function createCabinetService(api) {
  return {
    list: () => api.list(),
    follow: (rxcui) => api.follow(rxcui),
    unfollow: (rxcui) => api.unfollow(rxcui),
    alerts: () => api.alerts(),
    dismiss: (id) => api.dismiss(id),
    dismissAll: () => api.dismissAll(),
  }
}
