// A `services` object (same shape as src/composition/container.js) where every method is a vi.fn().
//
// Store tests replace the container with it. vi.mock is hoisted above the imports, so build the mock lazily:
//
//   vi.mock('@/composition/container', async () => ({
//     services: (await import('../helpers/mockServices')).mockServices(),
//   }))
//   import { services } from '@/composition/container'   // now the mock; services.drug.search.mockResolvedValue(...)
//
// Keep the method names in sync with the services in src/application/services.
import { vi } from 'vitest'

const fns = (names) => Object.fromEntries(names.map((name) => [name, vi.fn()]))

const crud = () => fns(['list', 'get', 'create', 'update', 'remove'])

export function mockServices() {
  return {
    auth: fns(['login', 'register', 'restore', 'logout', 'clearSession', 'hasToken']),
    drug: fns(['search', 'getDrug360', 'getReactionTrend', 'getLabelGaps', 'getAlternatives']),
    signal: fns(['list', 'emerging', 'reports', 'statistics']),
    cabinet: fns(['list', 'follow', 'unfollow', 'alerts', 'dismiss', 'dismissAll']),
    profile: fns(['get', 'update', 'changePassword', 'remove', 'getAlertSettings', 'saveAlertSettings']),
    admin: {
      users: crud(),
      reports: crud(),
      labels: crud(),
      shortages: crud(),
      terms: fns(['list', 'add', 'remove']),
      ingestion: fns(['faersFiles', 'quarters', 'startFaers', 'startIncremental', 'runs']),
      reconcile: vi.fn(),
    },
  }
}
