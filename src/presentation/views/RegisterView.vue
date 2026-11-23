<script setup>
// View 1b - Create account (FR-11). One form; links to /login and "Continue as guest".
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/application/stores/useAuthStore'
import { hasErrors, mapAuthError, validateRegister } from '@/domain/rules/authValidation'
import { safeRedirect } from '@/domain/rules/safeRedirect'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const form = reactive({ username: '', email: '', password: '' })
const errors = ref({})
const banner = ref('')
const pending = ref(false)

// Switching to "Log in" keeps the page the guard interrupted.
const loginLink = computed(() => ({ name: 'login', query: route.query.redirect ? { redirect: route.query.redirect } : {} }))

async function submit() {
  banner.value = ''
  errors.value = validateRegister(form)
  if (hasErrors(errors.value)) return
  pending.value = true
  try {
    await auth.register({ username: form.username.trim(), email: form.email.trim(), password: form.password })
    // Register logs in right away; go back to the interrupted page (?redirect=...), else the dashboard.
    await router.push(safeRedirect(route.query.redirect, '/'))
  } catch (e) {
    const mapped = mapAuthError(e, 'register')
    errors.value = mapped.fields
    banner.value = mapped.banner
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="auth">
    <h1>Know what changes in the medicines you take</h1>
    <p class="muted lede">Alerts when side-effect reports rise, a label changes or a drug goes into shortage.</p>

    <form class="card" novalidate @submit.prevent="submit">
      <h2>Create account</h2>
      <p class="muted">Follow medicines and receive alerts.</p>
      <p v-if="banner" class="error banner" role="alert">{{ banner }}</p>

      <label for="reg-username">Username</label>
      <input id="reg-username" v-model="form.username" placeholder="Choose a username" autocomplete="username"
             :aria-invalid="!!errors.username" />
      <p v-if="errors.username" class="error">{{ errors.username }}</p>

      <label for="reg-email">Email</label>
      <input id="reg-email" v-model="form.email" type="email" placeholder="name@example.com" autocomplete="email"
             :aria-invalid="!!errors.email" />
      <p v-if="errors.email" class="error">{{ errors.email }}</p>

      <label for="reg-password">Password</label>
      <input id="reg-password" v-model="form.password" type="password" placeholder="At least 8 characters"
             autocomplete="new-password" :aria-invalid="!!errors.password" />
      <p v-if="errors.password" class="error">{{ errors.password }}</p>

      <button class="btn" :disabled="pending">{{ pending ? 'Creating account...' : 'Create account' }}</button>
      <p class="switch muted">Already have an account? <RouterLink :to="loginLink">Log in</RouterLink></p>
    </form>

    <p class="muted guest">Just looking? <RouterLink to="/">Continue as guest</RouterLink></p>
  </div>
</template>
