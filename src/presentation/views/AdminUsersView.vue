<script setup>
// FR-25: administrator CRUD on accounts. Passwords are never shown; the backend refuses to demote or delete the last
// administrator (422) and says so in the dialog. The signed-in admin's own row cannot be deleted or demoted here.
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/application/stores/useAuthStore'
import { useAdminUsersStore } from '@/application/stores/useAdminCrudStore'
import { useUiStore } from '@/application/stores/useUiStore'
import { isSelf } from '@/domain/rules/admin'
import StatusChip from '@/presentation/components/common/StatusChip.vue'
import PagerBar from '@/presentation/components/admin/PagerBar.vue'
import ConfirmDialog from '@/presentation/components/admin/ConfirmDialog.vue'
import UserFormDialog from '@/presentation/components/admin/UserFormDialog.vue'

const auth = useAuthStore()
const store = useAdminUsersStore()
const ui = useUiStore()

const form = ref({ open: false, user: null, pending: false, error: null })
const removal = ref({ open: false, user: null, pending: false, failure: '' })
const selfId = computed(() => auth.user?.id)

onMounted(() => store.load(1))

const openCreate = () => { form.value = { open: true, user: null, pending: false, error: null } }
const openEdit = (user) => { form.value = { open: true, user, pending: false, error: null } }
const closeForm = () => { if (!form.value.pending) form.value.open = false }

async function save(body) {
  form.value.pending = true
  form.value.error = null
  try {
    const editing = form.value.user
    const saved = editing ? await store.update(editing.id, body) : await store.create(body)
    ui.notify(editing ? 'User updated.' : 'User created.', 'green')
    form.value.open = false
    // The signed-in admin may change their own username or email here: keep the navbar in step.
    if (editing && saved?.id === selfId.value) auth.setUser(saved)
  } catch (e) {
    form.value.error = e
  } finally {
    form.value.pending = false
  }
}

const askRemove = (user) => { removal.value = { open: true, user, pending: false, failure: '' } }
const cancelRemove = () => { if (!removal.value.pending) removal.value.open = false }
async function remove() {
  removal.value.pending = true
  removal.value.failure = ''
  try {
    await store.remove(removal.value.user)
    ui.notify(`User ${removal.value.user.username} deleted.`, 'green')
    removal.value.open = false
  } catch (e) {
    removal.value.failure = e?.message || 'Could not delete the user.'
  } finally {
    removal.value.pending = false
  }
}
</script>

<template>
  <section aria-labelledby="users-title">
    <div class="admin-bar">
      <div>
        <h2 id="users-title">Users</h2>
        <p class="muted">Create accounts, change roles, reset passwords. Deleting a user also removes their followed medicines and alerts.</p>
      </div>
      <button type="button" class="btn" @click="openCreate">New user</button>
    </div>

    <div class="card">
      <p v-if="store.error" class="admin-state error" role="alert">
        {{ store.error }} <button type="button" class="link-btn" @click="store.load()">Retry</button>
      </p>
      <p v-else-if="!store.loaded && store.loading" class="admin-state muted" role="status">Loading users…</p>
      <p v-else-if="store.loaded && !store.items.length" class="admin-state muted">No users on this page.</p>

      <div v-if="store.items.length" class="data-scroll">
        <table class="data-table" :class="{ dim: store.loading }" :aria-busy="store.loading">
          <thead>
            <tr><th scope="col">Username</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col"><span class="sr-only">Actions</span></th></tr>
          </thead>
          <tbody>
            <tr v-for="u in store.items" :key="u.id">
              <td>{{ u.username }} <span v-if="isSelf(u, selfId)" class="you">you</span></td>
              <td>{{ u.email }}</td>
              <td><StatusChip :status="u.role" :label="u.role" :tone="u.role === 'admin' ? 'teal' : 'slate'" /></td>
              <td class="row-actions">
                <button type="button" class="link-btn" :aria-label="`Edit ${u.username}`" @click="openEdit(u)">Edit</button>
                <button type="button" class="link-btn danger" :disabled="isSelf(u, selfId)" :aria-label="`Delete ${u.username}`"
                        :title="isSelf(u, selfId) ? 'Delete your own account from Profile' : undefined" @click="askRemove(u)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <PagerBar :page="store.page" :has-prev="store.hasPrev" :has-next="store.hasNext" :loading="store.loading"
                @prev="store.prev()" @next="store.next()" />
    </div>

    <UserFormDialog :open="form.open" :user="form.user" :self="!!form.user && isSelf(form.user, selfId)"
                    :pending="form.pending" :error="form.error" @save="save" @cancel="closeForm" />
    <ConfirmDialog :open="removal.open" title="Delete user" confirm-label="Delete user" :pending="removal.pending"
                   :failure="removal.failure" :require-text="removal.user?.username ?? ''"
                   :message="`This permanently deletes ${removal.user?.username ?? ''} and everything they follow.`"
                   @confirm="remove" @cancel="cancelRemove" />
  </section>
</template>

<style scoped>
.you { background: var(--slate-soft); color: var(--ink-2); border-radius: var(--radius-sm); padding: 0 .375rem; margin-left: var(--s-1); font-size: var(--fs-xs); }
</style>
