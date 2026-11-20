export function createSignalService(signalsApi, statisticsApi) {
  return {
    list: (params) => signalsApi.list(params),
    emerging: (params) => signalsApi.emerging(params),
    reports: (rxcui, reaction, params) => signalsApi.reports(rxcui, reaction, params),
    statistics: (params) => statisticsApi.get(params),
  }
}
