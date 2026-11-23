<script setup>
// Account actions: log out, and delete the account (FR-14). Deleting cannot be undone, so it asks the user to type
// their username first. After it the server has revoked the token, and the user lands on /login with a notice.
import { computed, nextTick, ref, useId } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/application/stores/useAuthStore'
import { useProfileStore } from '@/application/stores/useProfileStore'

const auth = useAuthStore()
const profile = useProfileStore()
const router = useRouter()
const uid = useId()

const confirming = ref(false)
const typed = ref('')
const pending = ref(false)
const failure = ref('')
const field = ref(null)
const openButton = ref(null)

// The name must be typed exactly (usernames are case sensitive); spaces around it do not count.
const matches = computed(() => !!auth.user && typed.value.trim() === auth.user.username)

async function logOut() {
  await auth.logout()
  router.push({ name: 'dashboard' })
}

async function ask() {
  typed.value = ''
  failure.value = ''
  confirming.value = true
  await nextTick()
  field.value?.focus()
}
function cancel() {
  if (pending.value) return
  confirming.value = false
  openButton.value?.focus()
}

async function remove() {
  if (!matches.value || pending.value) return
  pending.value = true
  failure.value = ''
  try {
    await profile.deleteAccount()
    await router.push({ name: 'login', query: { deleted: '1' } })
  } catch (e) {
    failure.value = e?.message || 'Could not delete the account. Please try again.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <section class="card" aria-labelledby="account-title">
    <h2 id="account-title">Account</h2>

    <div class="row">
      <div>
        <h3>Log out</h3>
        <p class="muted">End this session on this device.</p>
      </div>
      <button type="button" class="btn outline" @click="logOut">Log out</button>
    </div>

    <div class="row danger">
      <div>
        <h3>Delete account</h3>
        <p class="muted">Permanently removes your account, the medicines you follow and your alerts. This cannot be undone.</p>
      </div>
      <button ref="openButton" type="button" class="btn danger-btn" aria-haspopup="dialog" @click="ask">Delete account</button>
    </div>

    <div v-if="confirming" class="backdrop" @click.self="cancel">
      <div class="dialog" role="dialog" aria-modal="true" :aria-labelledby="`${uid}-title`" :aria-describedby="`${uid}-text`" @keydown.esc="cancel">
        <h3 :id="`${uid}-title`">Delete your account?</h3>
        <p :id="`${uid}-text`">
          This permanently deletes your account, your followed medicines and your alerts, and logs you out.
          Type your username <strong>{{ auth.user?.username }}</strong> to confirm.
        </p>
        <p v-if="failure" class="error banner" role="alert">{{ failure }}</p>
        <label :for="`${uid}-confirm`">Username</label>
        <input :id="`${uid}-confirm`" ref="field" v-model="typed" autocomplete="off" autocapitalize="off" spellcheck="false"
               @keydown.enter.prevent="remove" />
        <div class="actions">
          <button type="button" class="btn danger-btn" :disabled="!matches || pending" @click="remove">{{ pending ? 'Deleting...' : 'Delete my account' }}</button>
          <button type="button" class="btn outline" :disabled="pending" @click="cancel">Cancel</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
h2, h3, .row p { margin: 0; }
h3 { font-size: var(--fs-base); font-weight: 600; }
.row { display: flex; justify-content: space-between; align-items: center; gap: var(--s-4); flex-wrap: wrap; padding: var(--s-4) 0; border-top: 1px solid var(--line); }
.row:first-of-type { margin-top: var(--s-3); }
.row p { font-size: var(--fs-md); color: var(--ink-2); max-width: 34rem; }
.danger-btn { background: var(--coral); border-color: var(--coral); }
.danger-btn:hover:not(:disabled) { background: color-mix(in srgb, var(--coral) 85%, var(--ink)); border-color: color-mix(in srgb, var(--coral) 85%, var(--ink)); }
.btn:disabled { opacity: .55; cursor: not-allowed; }
.backdrop { position: fixed; inset: 0; background: var(--scrim); display: grid; place-items: center; padding: var(--s-4); z-index: 50; }
.dialog { background: var(--card); border-radius: var(--radius); box-shadow: var(--shadow); padding: var(--s-5); width: min(30rem, 100%); display: flex; flex-direction: column; gap: var(--s-2); }
.dialog p { margin: 0; }
label { font-size: var(--fs-sm); font-weight: 500; color: var(--ink-2); margin-top: var(--s-2); }
input { padding: .5rem .75rem; border: 1px solid var(--line-strong); border-radius: var(--radius-sm); font: inherit; font-size: var(--fs-md); background: var(--card); color: var(--ink); transition: border-color var(--t-fast), box-shadow var(--t-fast); }
input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.actions { display: flex; gap: var(--s-3); margin-top: var(--s-3); }
.error { color: var(--coral); font-size: var(--fs-md); }
.banner { background: var(--coral-soft); color: var(--coral); border-radius: var(--radius-sm); padding: var(--s-2) var(--s-3); font-size: var(--fs-md); }
</style>
