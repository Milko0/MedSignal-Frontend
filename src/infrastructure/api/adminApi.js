import { httpClient } from '@/infrastructure/http/httpClient'
import { toQuery } from '@/infrastructure/http/query'
import { toUser } from '@/infrastructure/mappers/userMapper'
import { toFaersFile, toJobStarted, toLoadedQuarters, toRun } from '@/infrastructure/mappers/adminMapper'

const none = () => undefined // deletes answer 204

// The four CRUD resources of /admin share one shape (backend crud_factory.py). Lists are plain arrays WITHOUT a total,
// so there is no toPage here: callers decide "is there a next page" from the length of what came back.
function makeCrudApi(name, mapItem = (d) => d) {
  const base = `/admin/${name}`
  const one = (id) => `${base}/${encodeURIComponent(id)}`
  return {
    list: ({ page = 1, pageSize = 10 } = {}) =>
      httpClient.get(base, { params: toQuery({ page, pageSize }) }).then((r) => r.data.map(mapItem)),
    get: (id) => httpClient.get(one(id)).then((r) => mapItem(r.data)),
    create: (body) => httpClient.post(base, body).then((r) => mapItem(r.data)),
    update: (id, body) => httpClient.put(one(id), body).then((r) => mapItem(r.data)),
    remove: (id) => httpClient.delete(one(id)).then(none),
  }
}

export const adminApi = {
  // FR-25: UserResponse, same as /profile
  users: makeCrudApi('users', toUser),
  // FR-22, FR-23, FR-24: documents, kept in the backend's shape (JSON in = JSON out)
  reports: makeCrudApi('reports'),
  labels: makeCrudApi('labels'),
  shortages: makeCrudApi('shortages'),

  // FR-26: excluded reaction terms. The term can contain "/" or spaces, so it is encoded in the path.
  terms: {
    list: () => httpClient.get('/admin/excluded-terms').then((r) => r.data.map((t) => t.term)),
    add: (term) => httpClient.post('/admin/excluded-terms', { term }).then((r) => r.data.term),
    remove: (term) => httpClient.delete(`/admin/excluded-terms/${encodeURIComponent(term)}`).then(none),
  },

  // FR-19 to FR-21
  ingestion: {
    faersFiles: () => httpClient.get('/admin/ingestion/faers-files').then((r) => r.data.map(toFaersFile)),
    quarters: (adding) =>
      httpClient.get('/admin/ingestion/quarters', { params: toQuery({ adding }) }).then((r) => toLoadedQuarters(r.data)),
    startFaers: ({ files, windowQuarters }) =>
      httpClient
        .post('/admin/ingestion/faers', { files, ...(windowQuarters ? { window_quarters: windowQuarters } : {}) })
        .then((r) => toJobStarted(r.data)),
    startIncremental: ({ labelLimit, sinceDays } = {}) =>
      httpClient
        .post('/admin/ingestion/incremental', null, { params: toQuery({ labelLimit, sinceDays }) })
        .then((r) => toJobStarted(r.data)),
    runs: ({ skip = 0, limit = 20 } = {}) =>
      httpClient.get('/admin/ingestion/runs', { params: toQuery({ skip, limit }) }).then((r) => r.data.map(toRun)),
  },

  // FR-27: the answer is an untyped dict, shown as it is
  reconcile: () => httpClient.post('/admin/reconciliation').then((r) => r.data),
}
