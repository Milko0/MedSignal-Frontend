<script setup>
// View 1 - Log in and register (FR-11, FR-12). Two cards side by side; "Continue as guest" link.
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/application/stores/useAuthStore'
import { hasErrors, mapAuthError, validateLogin, validateRegister } from '@/domain/rules/authValidation'
import { safeRedirect } from '@/domain/rules/safeRedirect'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const login = reactive({ identifier: '', password: '' })
const reg = reactive({ username: '', email: '', password: '' })
const loginErrors = ref({})
const regErrors = ref({})
const loginBanner = ref('')
const regBanner = ref('')
const loginPending = ref(false)
const regPending = ref(false)

// /auth?deleted=1 is where the profile page sends a user whose account was just deleted.
const deleted = route.query.deleted === '1'

// After logging in, go back to the page the guard interrupted (?redirect=...), else the dashboard.
const done = () => router.push(safeRedirect(route.query.redirect, '/'))

async function submitLogin() {
  loginBanner.value = ''
  loginErrors.value = validateLogin(login)
  if (hasErrors(loginErrors.value)) return
  loginPending.value = true
  try {
    await auth.login({ identifier: login.identifier.trim(), password: login.password })
    await done()
  } catch (e) {
    const { fields, banner } = mapAuthError(e, 'login')
    loginErrors.value = fields
    loginBanner.value = banner
  } finally {
    loginPending.value = false
  }
}

async function submitRegister() {
  regBanner.value = ''
  regErrors.value = validateRegister(reg)
  if (hasErrors(regErrors.value)) return
  regPending.value = true
  try {
    await auth.register({ username: reg.username.trim(), email: reg.email.trim(), password: reg.password })
    await done()
  } catch (e) {
    const { fields, banner } = mapAuthError(e, 'register')
    regErrors.value = fields
    regBanner.value = banner
  } finally {
    regPending.value = false
  }
}
</script>

<template>
  <p v-if="deleted" class="notice" role="status">Your account was deleted.</p>
  <h1>Know what changes in the medicines you take</h1>
  <p class="muted">Alerts when side-effect reports rise, a label changes or a drug goes into shortage.</p>
  <div class="grid two">
    <form class="card" novalidate @submit.prevent="submitLogin">
      <h2>Log in</h2>
      <p class="muted">Welcome back.</p>
      <p v-if="loginBanner" class="error banner" role="alert">{{ loginBanner }}</p>

      <label for="login-identifier">Username or email</label>
      <input id="login-identifier" v-model="login.identifier" autocomplete="username"
             :aria-invalid="!!loginErrors.identifier" />
      <p v-if="loginErrors.identifier" class="error">{{ loginErrors.identifier }}</p>

      <label for="login-password">Password</label>
      <input id="login-password" v-model="login.password" type="password" autocomplete="current-password"
             :aria-invalid="!!loginErrors.password" />
      <p v-if="loginErrors.password" class="error">{{ loginErrors.password }}</p>

      <button class="btn" :disabled="loginPending">{{ loginPending ? 'Logging in...' : 'Log in' }}</button>
    </form>

    <form class="card" novalidate @submit.prevent="submitRegister">
      <h2>Create account</h2>
      <p class="muted">Follow medicines and receive alerts.</p>
      <p v-if="regBanner" class="error banner" role="alert">{{ regBanner }}</p>

      <label for="reg-username">Username</label>
      <input id="reg-username" v-model="reg.username" placeholder="Choose a username" autocomplete="username"
             :aria-invalid="!!regErrors.username" />
      <p v-if="regErrors.username" class="error">{{ regErrors.username }}</p>

      <label for="reg-email">Email</label>
      <input id="reg-email" v-model="reg.email" type="email" placeholder="name@example.com" autocomplete="email"
             :aria-invalid="!!regErrors.email" />
      <p v-if="regErrors.email" class="error">{{ regErrors.email }}</p>

      <label for="reg-password">Password</label>
      <input id="reg-password" v-model="reg.password" type="password" placeholder="At least 8 characters"
             autocomplete="new-password" :aria-invalid="!!regErrors.password" />
      <p v-if="regErrors.password" class="error">{{ regErrors.password }}</p>

      <button class="btn" :disabled="regPending">{{ regPending ? 'Creating account...' : 'Create account' }}</button>
    </form>
  </div>
  <p class="muted">Just looking? <RouterLink to="/">Continue as guest</RouterLink></p>
</template>

<style scoped>
form { display: flex; flex-direction: column; gap: var(--s-1); }
h2, form p { margin: 0; }
label { font-size: var(--fs-sm); font-weight: 500; color: var(--ink-2); margin-top: var(--s-2); }
input { padding: .5rem .75rem; border: 1px solid var(--line-strong); border-radius: var(--radius-sm); font: inherit; font-size: var(--fs-md); background: var(--card); color: var(--ink); transition: border-color var(--t-fast), box-shadow var(--t-fast); }
input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
input[aria-invalid='true'] { border-color: var(--coral); }
.error { color: var(--coral); font-size: var(--fs-sm); }

.notice { background: var(--green-soft); color: var(--green); border-radius: var(--radius-sm); padding: var(--s-3) var(--s-4); margin: 0 0 var(--s-4); font-size: var(--fs-md); }
.banner { background: var(--coral-soft); color: var(--coral); border-radius: var(--radius-sm); padding: var(--s-2) var(--s-3); font-size: var(--fs-md); }
.btn { margin-top: var(--s-4); }
.btn:disabled { opacity: .55; cursor: not-allowed; }
</style>
