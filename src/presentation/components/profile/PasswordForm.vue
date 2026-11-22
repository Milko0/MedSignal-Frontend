<script setup>
// Change password. The form opens inline; a wrong current password (401) is shown under that field and the user
// stays logged in (the 401 of /profile/password is not a session expiry, see FORM_401_PATHS).
import { reactive, ref, useId } from 'vue'
import { useProfileStore } from '@/application/stores/useProfileStore'
import { hasErrors, mapProfileError, validatePasswordChange } from '@/domain/rules/authValidation'

const profile = useProfileStore()
const uid = useId()

const open = ref(false)
const form = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const errors = ref({})
const banner = ref('')
const pending = ref(false)
const changed = ref(false)

function clear() {
  form.currentPassword = form.newPassword = form.confirmPassword = ''
  errors.value = {}
  banner.value = ''
}
function show() { clear(); changed.value = false; open.value = true }
function cancel() { clear(); open.value = false }

async function submit() {
  banner.value = ''
  errors.value = validatePasswordChange(form)
  if (hasErrors(errors.value)) return
  pending.value = true
  try {
    await profile.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword })
    clear()
    open.value = false
    changed.value = true
  } catch (e) {
    const mapped = mapProfileError(e, 'password')
    errors.value = mapped.fields
    banner.value = mapped.banner
  } finally {
    pending.value = false
  }
}

const FIELDS = [
  { key: 'currentPassword', label: 'Current password', autocomplete: 'current-password' },
  { key: 'newPassword', label: 'New password', autocomplete: 'new-password', placeholder: 'At least 8 characters' },
  { key: 'confirmPassword', label: 'Confirm new password', autocomplete: 'new-password' },
]
</script>

<template>
  <section class="card" aria-labelledby="password-title">
    <div class="head">
      <div>
        <h2 id="password-title">Password</h2>
        <p class="muted">Use at least 8 characters.</p>
      </div>
      <button v-if="!open" type="button" class="btn outline" @click="show">Change password</button>
    </div>
    <p v-if="changed" class="ok" role="status">Password changed.</p>

    <form v-if="open" novalidate aria-label="Change password" @submit.prevent="submit">
      <p v-if="banner" class="error banner" role="alert">{{ banner }}</p>
      <template v-for="f in FIELDS" :key="f.key">
        <label :for="`${uid}-${f.key}`">{{ f.label }}</label>
        <input :id="`${uid}-${f.key}`" v-model="form[f.key]" type="password" :autocomplete="f.autocomplete"
               :placeholder="f.placeholder" :aria-invalid="!!errors[f.key]"
               :aria-describedby="errors[f.key] ? `${uid}-${f.key}-error` : undefined" />
        <p v-if="errors[f.key]" :id="`${uid}-${f.key}-error`" class="error" role="alert">{{ errors[f.key] }}</p>
      </template>
      <div class="actions">
        <button class="btn" :disabled="pending">{{ pending ? 'Changing...' : 'Update password' }}</button>
        <button type="button" class="btn outline" :disabled="pending" @click="cancel">Cancel</button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--s-4); flex-wrap: wrap; }
h2, .head p { margin: 0; }
.head p { font-size: var(--fs-md); color: var(--ink-2); }
form { display: flex; flex-direction: column; gap: var(--s-1); margin-top: var(--s-4); }
form p { margin: 0; }
label { font-size: var(--fs-sm); font-weight: 500; color: var(--ink-2); margin-top: var(--s-2); }
input { padding: .5rem .75rem; border: 1px solid var(--line-strong); border-radius: var(--radius-sm); font: inherit; font-size: var(--fs-md); background: var(--card); color: var(--ink); transition: border-color var(--t-fast), box-shadow var(--t-fast); max-width: 28rem; }
input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
input[aria-invalid='true'] { border-color: var(--coral); }
.error { color: var(--coral); font-size: var(--fs-sm); }
.banner { background: var(--coral-soft); color: var(--coral); border-radius: var(--radius-sm); padding: var(--s-2) var(--s-3); font-size: var(--fs-md); max-width: 28rem; }
.actions { display: flex; gap: var(--s-3); margin-top: var(--s-4); }
.btn:disabled { opacity: .55; cursor: not-allowed; }
.ok { color: var(--green); font-size: var(--fs-md); margin: var(--s-3) 0 0; }
</style>
