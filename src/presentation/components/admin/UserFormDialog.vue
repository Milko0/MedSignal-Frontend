<script setup>
// Create or edit an account (FR-25). Creating needs all four fields; editing sends only what changed, and an empty
// password means "keep the current one". The backend's 409 / 422 answers (`error`) are shown under the field they name;
// "last administrator" names none, so it is a banner. Your own role is locked here: use Profile for your own account.
import { computed, reactive, ref, useId, watch } from 'vue'
import AdminDialog from '@/presentation/components/admin/AdminDialog.vue'
import { ROLES, adminUserChanges, mapAdminUserError, newUserBody, validateAdminUser } from '@/domain/rules/admin'
import { hasErrors } from '@/domain/rules/authValidation'

const props = defineProps({
  open: { type: Boolean, default: false },
  user: { type: Object, default: null },        // null = create
  self: { type: Boolean, default: false },      // the signed-in admin's own row
  pending: { type: Boolean, default: false },
  error: { type: Object, default: null },       // the ApiError of the last failed save
})
const emit = defineEmits(['save', 'cancel'])

const uid = useId()
const form = reactive({ username: '', email: '', password: '', role: 'user' })
const problems = ref({})
const creating = computed(() => !props.user)

watch(() => props.open, (open) => {
  if (!open) return
  form.username = props.user?.username ?? ''
  form.email = props.user?.email ?? ''
  form.password = ''
  form.role = props.user?.role ?? 'user'
  problems.value = {}
}, { immediate: true })

// What the server said wins over older local messages; edits clear it again.
const server = computed(() => (props.error ? mapAdminUserError(props.error, form) : { fields: {}, banner: '' }))
const shown = computed(() => ({ ...server.value.fields, ...problems.value }))
const touch = (field) => { delete problems.value[field] }

const changes = computed(() => (creating.value ? null : adminUserChanges(form, props.user)))
const nothingToSave = computed(() => !creating.value && !hasErrors(changes.value))

function submit() {
  if (props.pending) return
  problems.value = validateAdminUser(form, { creating: creating.value })
  if (hasErrors(problems.value) || nothingToSave.value) return
  emit('save', creating.value ? newUserBody(form) : changes.value)
}
</script>

<template>
  <AdminDialog :open="open" :title="creating ? 'New user' : `Edit ${user?.username}`" :busy="pending" @close="emit('cancel')">
    <form novalidate @submit.prevent="submit">
      <p v-if="server.banner" class="error banner" role="alert">{{ server.banner }}</p>

      <label :for="`${uid}-username`">Username</label>
      <input :id="`${uid}-username`" v-model="form.username" autocomplete="off" autofocus :aria-invalid="!!shown.username"
             :aria-describedby="shown.username ? `${uid}-username-error` : undefined" @input="touch('username')" />
      <p v-if="shown.username" :id="`${uid}-username-error`" class="error" role="alert">{{ shown.username }}</p>

      <label :for="`${uid}-email`">Email</label>
      <input :id="`${uid}-email`" v-model="form.email" type="email" autocomplete="off" :aria-invalid="!!shown.email"
             :aria-describedby="shown.email ? `${uid}-email-error` : undefined" @input="touch('email')" />
      <p v-if="shown.email" :id="`${uid}-email-error`" class="error" role="alert">{{ shown.email }}</p>

      <label :for="`${uid}-password`">{{ creating ? 'Password' : 'New password (optional)' }}</label>
      <input :id="`${uid}-password`" v-model="form.password" type="password" autocomplete="new-password"
             :aria-invalid="!!shown.password" :aria-describedby="`${uid}-password-hint`" @input="touch('password')" />
      <p :id="`${uid}-password-hint`" class="muted hint">
        <template v-if="creating">At least 8 characters.</template>
        <template v-else>Leave empty to keep the current password.</template>
      </p>
      <p v-if="shown.password" class="error" role="alert">{{ shown.password }}</p>

      <label :for="`${uid}-role`">Role</label>
      <select :id="`${uid}-role`" v-model="form.role" :disabled="self" :aria-invalid="!!shown.role">
        <option v-for="r in ROLES" :key="r" :value="r">{{ r }}</option>
      </select>
      <p v-if="self" class="muted hint">This is your own account: you cannot change your role here.</p>
      <p v-if="shown.role" class="error" role="alert">{{ shown.role }}</p>
    </form>
    <template #footer>
      <button type="button" class="btn outline" :disabled="pending" @click="emit('cancel')">Cancel</button>
      <button type="button" class="btn" :disabled="pending || nothingToSave" @click="submit">
        {{ pending ? 'Saving…' : creating ? 'Create user' : 'Save changes' }}
      </button>
    </template>
  </AdminDialog>
</template>

<style scoped>
form { display: flex; flex-direction: column; gap: var(--s-1); }
label { font-size: var(--fs-sm); font-weight: 500; color: var(--ink-2); margin-top: var(--s-2); }
input, select { padding: .5rem .75rem; border: 1px solid var(--line-strong); border-radius: var(--radius-sm); font: inherit; font-size: var(--fs-md); background: var(--card); color: var(--ink); transition: border-color var(--t-fast), box-shadow var(--t-fast); }
input:focus, select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
input[aria-invalid='true'], select[aria-invalid='true'] { border-color: var(--coral); }
select:disabled { opacity: .6; }
p { margin: 0; }
.hint { font-size: var(--fs-sm); }
.error { color: var(--coral); font-size: var(--fs-sm); }
.banner { background: var(--coral-soft); border-radius: var(--radius-sm); padding: var(--s-2) var(--s-3); font-size: var(--fs-md); }
.btn:disabled { opacity: .5; cursor: not-allowed; }
</style>
