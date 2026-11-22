<script setup>
// FR-14: username and email. "Save changes" is enabled only when something differs from the saved user; the
// backend's 409 (already in use) and 422 answers are shown under the field they name.
import { computed, reactive, ref, useId, watch } from 'vue'
import { useAuthStore } from '@/application/stores/useAuthStore'
import { useProfileStore } from '@/application/stores/useProfileStore'
import { hasErrors, mapProfileError, profileChanges, validateProfile } from '@/domain/rules/authValidation'

const auth = useAuthStore()
const profile = useProfileStore()
const uid = useId()

const form = reactive({ username: '', email: '' })
const errors = ref({})
const banner = ref('')
const pending = ref(false)
const saved = ref(false)

// The form always mirrors the saved user: after a successful save that is the server's version (email in lower case).
watch(() => auth.user, (user) => { form.username = user?.username ?? ''; form.email = user?.email ?? '' }, { immediate: true })

const changed = computed(() => Object.keys(profileChanges(form, auth.user)).length > 0)
const edit = () => { saved.value = false; banner.value = '' }

async function submit() {
  edit()
  errors.value = validateProfile(form)
  if (hasErrors(errors.value) || !changed.value) return
  pending.value = true
  try {
    await profile.updateProfile(form)
    saved.value = true
  } catch (e) {
    const mapped = mapProfileError(e, 'profile')
    errors.value = mapped.fields
    banner.value = mapped.banner
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <form class="card" novalidate aria-labelledby="profile-title" @submit.prevent="submit">
    <h2 id="profile-title">Profile</h2>
    <p class="muted">The name and email address of your account.</p>
    <p v-if="banner" class="error banner" role="alert">{{ banner }}</p>

    <label :for="`${uid}-username`">Username</label>
    <input :id="`${uid}-username`" v-model="form.username" autocomplete="username" :aria-invalid="!!errors.username"
           :aria-describedby="errors.username ? `${uid}-username-error` : undefined" @input="edit" />
    <p v-if="errors.username" :id="`${uid}-username-error`" class="error" role="alert">{{ errors.username }}</p>

    <label :for="`${uid}-email`">Email</label>
    <input :id="`${uid}-email`" v-model="form.email" type="email" autocomplete="email" :aria-invalid="!!errors.email"
           :aria-describedby="errors.email ? `${uid}-email-error` : undefined" @input="edit" />
    <p v-if="errors.email" :id="`${uid}-email-error`" class="error" role="alert">{{ errors.email }}</p>

    <div class="actions">
      <button class="btn" :disabled="!changed || pending">{{ pending ? 'Saving...' : 'Save changes' }}</button>
      <span v-if="saved" class="ok" role="status">Profile saved.</span>
    </div>
  </form>
</template>

<style scoped>
form { display: flex; flex-direction: column; gap: var(--s-1); }
h2, form p { margin: 0; }
label { font-size: var(--fs-sm); font-weight: 500; color: var(--ink-2); margin-top: var(--s-2); }
input { padding: .5rem .75rem; border: 1px solid var(--line-strong); border-radius: var(--radius-sm); font: inherit; font-size: var(--fs-md); background: var(--card); color: var(--ink); transition: border-color var(--t-fast), box-shadow var(--t-fast); max-width: 28rem; }
input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
input[aria-invalid='true'] { border-color: var(--coral); }
.error { color: var(--coral); font-size: var(--fs-sm); }
.banner { background: var(--coral-soft); color: var(--coral); border-radius: var(--radius-sm); padding: var(--s-2) var(--s-3); font-size: var(--fs-md); max-width: 28rem; }
.actions { display: flex; align-items: center; gap: var(--s-3); margin-top: var(--s-4); }
.btn:disabled { opacity: .55; cursor: not-allowed; }
.ok { color: var(--green); font-size: var(--fs-md); }
</style>
