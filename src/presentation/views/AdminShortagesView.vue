<script setup>
// FR-24: administrator CRUD on shortage records (the current FDA shortage list, one row per package NDC). Changes
// refresh the cached shortage status on the server; the daily poll replaces the list with the FDA's again.
import { onMounted, ref, useId } from 'vue'
import { useAdminShortagesStore } from '@/application/stores/useAdminCrudStore'
import { useUiStore } from '@/application/stores/useUiStore'
import { shortageRow } from '@/domain/rules/admin'
import { formatDate } from '@/domain/rules/formatShortage'
import StatusChip from '@/presentation/components/common/StatusChip.vue'
import PagerBar from '@/presentation/components/admin/PagerBar.vue'
import ConfirmDialog from '@/presentation/components/admin/ConfirmDialog.vue'
import ShortageFormDialog from '@/presentation/components/admin/ShortageFormDialog.vue'

const store = useAdminShortagesStore()
const ui = useUiStore()
const uid = useId()

const form = ref({ open: false, record: null, pending: false, error: null })
const removal = ref({ open: false, record: null, pending: false, failure: '' })
const lookup = ref({ ndc: '', pending: false, error: '' })

onMounted(() => store.load(1))

const openCreate = () => { form.value = { open: true, record: null, pending: false, error: null } }
const openEdit = (record) => { form.value = { open: true, record, pending: false, error: null } }
const closeForm = () => { if (!form.value.pending) form.value.open = false }

// The list is ordered by package NDC and has no search, so a record far down is reached by its NDC.
async function openByNdc() {
  const ndc = lookup.value.ndc.trim()
  if (!ndc || lookup.value.pending) return
  lookup.value.pending = true
  lookup.value.error = ''
  try {
    openEdit(await store.fetchOne(ndc))
  } catch (e) {
    lookup.value.error = e?.status === 404 ? `No shortage record with package NDC ${ndc}.` : e?.message || 'Could not open the record.'
  } finally {
    lookup.value.pending = false
  }
}

async function save(body) {
  form.value.pending = true
  form.value.error = null
  try {
    const editing = form.value.record
    if (editing) await store.update(editing.package_ndc, body)
    else await store.create(body)
    ui.notify(editing ? 'Shortage record updated.' : 'Shortage record created.', 'green')
    form.value.open = false
  } catch (e) {
    form.value.error = e
  } finally {
    form.value.pending = false
  }
}

const askRemove = (record) => { removal.value = { open: true, record, pending: false, failure: '' } }
const cancelRemove = () => { if (!removal.value.pending) removal.value.open = false }
async function remove() {
  removal.value.pending = true
  removal.value.failure = ''
  try {
    await store.remove(removal.value.record)
    ui.notify(`Shortage record ${removal.value.record.package_ndc} deleted.`, 'green')
    removal.value.open = false
  } catch (e) {
    removal.value.failure = e?.message || 'Could not delete the record.'
  } finally {
    removal.value.pending = false
  }
}
</script>

<template>
  <section aria-labelledby="shortages-title">
    <div class="admin-bar">
      <div>
        <h2 id="shortages-title">Shortages</h2>
        <p class="muted">One record per package NDC. Edits refresh the cached shortage status; the daily FDA poll overwrites manual changes.</p>
      </div>
      <button type="button" class="btn" @click="openCreate">New record</button>
    </div>

    <form class="lookup card" novalidate @submit.prevent="openByNdc">
      <label :for="`${uid}-ndc`">Edit by package NDC</label>
      <div class="lookup-row">
        <input :id="`${uid}-ndc`" v-model="lookup.ndc" autocomplete="off" :aria-invalid="!!lookup.error" @input="lookup.error = ''" />
        <button class="btn outline" :disabled="!lookup.ndc.trim() || lookup.pending">{{ lookup.pending ? 'Opening…' : 'Open' }}</button>
      </div>
      <p v-if="lookup.error" class="error" role="alert">{{ lookup.error }}</p>
    </form>

    <div class="card">
      <p v-if="store.error" class="admin-state error" role="alert">
        {{ store.error }} <button type="button" class="link-btn" @click="store.load()">Retry</button>
      </p>
      <p v-else-if="!store.loaded && store.loading" class="admin-state muted" role="status">Loading shortage records…</p>
      <p v-else-if="store.loaded && !store.items.length" class="admin-state muted">No shortage records on this page.</p>

      <div v-if="store.items.length" class="data-scroll">
        <table class="data-table" :class="{ dim: store.loading }" :aria-busy="store.loading">
          <thead>
            <tr>
              <th scope="col">Package NDC</th><th scope="col">Generic name</th><th scope="col">Form</th>
              <th scope="col">Status</th><th scope="col">Availability</th><th scope="col">Updated</th>
              <th scope="col"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in store.items" :key="d.package_ndc">
              <td class="mono">{{ shortageRow(d).id }}</td>
              <td>{{ shortageRow(d).name }}</td>
              <td>{{ shortageRow(d).form }}</td>
              <td><StatusChip :status="d.status" /></td>
              <td>{{ d.availability }}</td>
              <td>{{ formatDate(shortageRow(d).updated) || '—' }}</td>
              <td class="row-actions">
                <button type="button" class="link-btn" :aria-label="`Edit ${d.package_ndc}`" @click="openEdit(d)">Edit</button>
                <button type="button" class="link-btn danger" :aria-label="`Delete ${d.package_ndc}`" @click="askRemove(d)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <PagerBar :page="store.page" :has-prev="store.hasPrev" :has-next="store.hasNext" :loading="store.loading"
                @prev="store.prev()" @next="store.next()" />
    </div>

    <ShortageFormDialog :open="form.open" :record="form.record" :pending="form.pending" :error="form.error"
                        @save="save" @cancel="closeForm" />
    <ConfirmDialog :open="removal.open" title="Delete shortage record" confirm-label="Delete record" :pending="removal.pending"
                   :failure="removal.failure" :message="`Delete the shortage record for package ${removal.record?.package_ndc ?? ''}?`"
                   @confirm="remove" @cancel="cancelRemove" />
  </section>
</template>
