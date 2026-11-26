import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { services } from '@/composition/container'
import { ADMIN_PAGE_SIZE } from '@/core/constants/admin'
import { hasNextPage } from '@/domain/rules/admin'

// One paged list with create / update / delete, for users, reports, labels and shortages (they share one backend shape).
//   id      Pinia store id
//   pick    () => services.admin.<resource>   (a function, so tests can swap the container before it is read)
//   idOf    (record) => the record's id, to PUT / DELETE it
//
// The list answers a plain array with no total, so there is only Previous / Next (see hasNextPage).
// create / update / remove RETHROW: the dialog that asked shows the message. A list that fails to load keeps its last
// rows and sets `error` (the view offers Retry). Answers of a request that has been overtaken are dropped.
export function defineAdminCrudStore(id, pick, idOf) {
  return defineStore(id, () => {
    const items = ref([])
    const page = ref(1)
    const loading = ref(false)
    const error = ref('')
    const loaded = ref(false)
    let seq = 0

    const pageSize = ADMIN_PAGE_SIZE
    const hasNext = computed(() => hasNextPage(items.value, pageSize))
    const hasPrev = computed(() => page.value > 1)

    async function load(target = page.value) {
      const mine = ++seq
      loading.value = true
      error.value = ''
      try {
        const rows = await pick().list({ page: target, pageSize })
        if (mine !== seq) return
        items.value = rows
        page.value = target
        loaded.value = true
      } catch (e) {
        if (mine !== seq) return
        error.value = e?.message || 'Could not load the list.'
      } finally {
        if (mine === seq) loading.value = false
      }
    }

    const next = () => (hasNext.value && !loading.value ? load(page.value + 1) : undefined)
    const prev = () => (hasPrev.value && !loading.value ? load(page.value - 1) : undefined)

    async function create(body) {
      const saved = await pick().create(body)
      await load(page.value)
      return saved
    }

    async function update(recordId, body) {
      const saved = await pick().update(recordId, body)
      await load(page.value)
      return saved
    }

    // Deleting the only row of a later page would leave an empty page: step back one.
    async function remove(record) {
      await pick().remove(idOf(record))
      await load(page.value)
      if (!items.value.length && page.value > 1 && !error.value) await load(page.value - 1)
    }

    // Used by "open by id": one record, not part of the list.
    const fetchOne = (recordId) => pick().get(recordId)

    function reset() {
      seq++                      // a request still on its way is ignored
      items.value = []
      page.value = 1
      loading.value = false
      error.value = ''
      loaded.value = false
    }

    return { items, page, pageSize, loading, error, loaded, hasNext, hasPrev, load, next, prev, create, update, remove, fetchOne, reset }
  })
}

export const useAdminUsersStore = defineAdminCrudStore('adminUsers', () => services.admin.users, (u) => u.id)
export const useAdminReportsStore = defineAdminCrudStore('adminReports', () => services.admin.reports, (r) => r.report_id)
export const useAdminLabelsStore = defineAdminCrudStore('adminLabels', () => services.admin.labels, (l) => l.set_id)
export const useAdminShortagesStore = defineAdminCrudStore('adminShortages', () => services.admin.shortages, (s) => s.package_ndc)

export function resetAdminCrudStores() {
  useAdminUsersStore().reset()
  useAdminReportsStore().reset()
  useAdminLabelsStore().reset()
  useAdminShortagesStore().reset()
}
