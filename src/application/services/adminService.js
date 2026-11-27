// Thin pass-through, like the other services: the adapter already returns models, the rules live in domain/rules/admin.js.
export function createAdminService(api) {
  const crud = (resource) => ({
    list: (params) => resource.list(params),
    get: (id) => resource.get(id),
    create: (body) => resource.create(body),
    update: (id, body) => resource.update(id, body),
    remove: (id) => resource.remove(id),
  })
  return {
    users: crud(api.users),
    reports: crud(api.reports),
    labels: crud(api.labels),
    shortages: crud(api.shortages),
    terms: {
      list: () => api.terms.list(),
      add: (term) => api.terms.add(term),
      remove: (term) => api.terms.remove(term),
    },
    ingestion: {
      faersFiles: () => api.ingestion.faersFiles(),
      quarters: (adding) => api.ingestion.quarters(adding),
      startFaers: (body) => api.ingestion.startFaers(body),
      startIncremental: (body) => api.ingestion.startIncremental(body),
      runs: (params) => api.ingestion.runs(params),
    },
    reconcile: () => api.reconcile(),
  }
}
