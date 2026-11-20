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
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
h2, .head p { margin: 0; }
form { display: flex; flex-direction: column; gap: .4rem; margin-top: .8rem; }
form p { margin: 0; }
label { font-size: .85rem; font-weight: 600; margin-top: .4rem; }
input { padding: .55rem .7rem; border: 1px solid var(--line); border-radius: 8px; font: inherit; max-width: 28rem; }
input[aria-invalid='true'] { border-color: var(--coral); }
.error { color: var(--coral); font-size: .85rem; }
.banner { background: var(--coral-soft); border-radius: 8px; padding: .5rem .7rem; max-width: 28rem; }
.actions { display: flex; gap: .6rem; margin-top: .8rem; }
.btn:disabled { opacity: .6; cursor: not-allowed; }
.ok { color: var(--green); font-size: .9rem; margin: .6rem 0 0; }
</style>
