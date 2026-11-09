export function createProfileService(api) {
  return {
    get: () => api.get(),
    update: (body) => api.update(body),
    changePassword: (body) => api.changePassword(body),
    remove: () => api.remove(),
    getAlertSettings: () => api.getAlertSettings(),
    saveAlertSettings: (body) => api.saveAlertSettings(body),
  }
}
