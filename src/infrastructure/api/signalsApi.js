import { httpClient } from '@/infrastructure/http/httpClient'
import { toQuery } from '@/infrastructure/http/query'
import { toPage, unwrap } from '@/infrastructure/mappers/commonMapper'
import { toReportBrief } from '@/infrastructure/mappers/reportMapper'
import { toSignalList } from '@/infrastructure/mappers/signalMapper'

// envelope { data: SignalList, meta.disclaimer } -> signal list model + disclaimer
const toList = (r) => {
  const { data, disclaimer } = unwrap(r.data)
  return { ...toSignalList(data), disclaimer }
}

export const signalsApi = {
  // FR-04, FR-05: omit quarter to get the latest one (the response says which)
  list: ({ quarter, rxcui, reaction, minReports, onlySignals, page, pageSize } = {}) =>
    httpClient.get('/signals', { params: toQuery({ quarter, rxcui, reaction, minReports, onlySignals, page, pageSize }) }).then(toList),
  // FR-06
  emerging: ({ quarter, minReports, page, pageSize } = {}) =>
    httpClient.get('/signals/emerging', { params: toQuery({ quarter, minReports, page, pageSize }) }).then(toList),
  // FR-09: reports behind a signal. The reaction is free text, so it is always encoded.
  reports: (rxcui, reaction, { page, pageSize } = {}) =>
    httpClient
      .get(`/signals/${encodeURIComponent(rxcui)}/${encodeURIComponent(reaction)}/reports`, { params: toQuery({ page, pageSize }) })
      .then((r) => toPage(r.data, toReportBrief)),
}
