import { toSignal } from '@/infrastructure/mappers/signalMapper'

export function createSignalService(signalsApi, statisticsApi) {
  return {
    list: (params) => signalsApi.list(params).then((r) => ({ ...r, items: r.items.map(toSignal) })),
    emerging: (params) => signalsApi.emerging(params).then((r) => ({ ...r, items: r.items.map(toSignal) })),
    reports: (rxcui, reaction, params) => signalsApi.reports(rxcui, reaction, params),
    statistics: (params) => statisticsApi.get(params),
  }
}
