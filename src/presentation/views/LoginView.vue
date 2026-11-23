<script setup>
// View 1a - Log in (FR-12). One form; links to /register and "Continue as guest".
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/application/stores/useAuthStore'
import { hasErrors, mapAuthError, validateLogin } from '@/domain/rules/authValidation'
import { safeRedirect } from '@/domain/rules/safeRedirect'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const form = reactive({ identifier: '', password: '' })
const errors = ref({})
const banner = ref('')
const pending = ref(false)

// /login?deleted=1 is where the profile page sends a user whose account was just deleted.
const deleted = route.query.deleted === '1'

// Switching to "Create account" keeps the page the guard interrupted, so signing up also returns there.
const registerLink = computed(() => ({ name: 'register', query: route.query.redirect ? { redirect: route.query.redirect } : {} }))

async function submit() {
  banner.value = ''
  errors.value = validateLogin(form)
  if (hasErrors(errors.value)) return
  pending.value = true
  try {
    await auth.login({ identifier: form.identifier.trim(), password: form.password })
    // After logging in, go back to the page the guard interrupted (?redirect=...), else the dashboard.
    await router.push(safeRedirect(route.query.redirect, '/'))
  } catch (e) {
    const mapped = mapAuthError(e, 'login')
    errors.value = mapped.fields
    banner.value = mapped.banner
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="auth">
    <p v-if="deleted" class="notice" role="status">Your account was deleted.</p>
    <h1>Know what changes in the medicines you take</h1>
    <p class="muted lede">Alerts when side-effect reports rise, a label changes or a drug goes into shortage.</p>

    <form class="card" novalidate @submit.prevent="submit">
      <h2>Log in</h2>
      <p class="muted">Welcome back.</p>
      <p v-if="banner" class="error banner" role="alert">{{ banner }}</p>

      <label for="login-identifier">Username or email</label>
      <input id="login-identifier" v-model="form.identifier" autocomplete="username"
             :aria-invalid="!!errors.identifier" />
      <p v-if="errors.identifier" class="error">{{ errors.identifier }}</p>

      <label for="login-password">Password</label>
      <input id="login-password" v-model="form.password" type="password" autocomplete="current-password"
             :aria-invalid="!!errors.password" />
      <p v-if="errors.password" class="error">{{ errors.password }}</p>

      <button class="btn" :disabled="pending">{{ pending ? 'Logging in...' : 'Log in' }}</button>
      <p class="switch muted">New to MedSignal? <RouterLink :to="registerLink">Create an account</RouterLink></p>
    </form>

    <p class="muted guest">Just looking? <RouterLink to="/">Continue as guest</RouterLink></p>
  </div>
</template>
