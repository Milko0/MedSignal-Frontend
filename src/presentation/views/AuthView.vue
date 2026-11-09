<script setup>
// View 1 - Log in and register (FR-11, FR-12). Two forms side by side; "Continue as guest" link.
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/application/stores/useAuthStore'

const auth = useAuthStore()
const router = useRouter()
const login = reactive({ login: '', password: '' })
const reg = reactive({ username: '', email: '', password: '' })
const done = () => router.push({ name: 'dashboard' })
</script>

<template>
  <h1>Know what changes in the medicines you take</h1>
  <p class="muted">Alerts when side-effect reports rise, a label changes or a drug goes into shortage.</p>
  <div class="grid two">
    <form class="card" @submit.prevent="auth.login(login).then(done)">
      <h2>Log in</h2>
      <input v-model="login.login" placeholder="Username or email" />
      <input v-model="login.password" type="password" placeholder="Password" />
      <button class="btn">Log in</button>
    </form>
    <form class="card" @submit.prevent="auth.register(reg).then(done)">
      <h2>Create account</h2>
      <input v-model="reg.username" placeholder="Choose a username" />
      <input v-model="reg.email" type="email" placeholder="name@example.com" />
      <input v-model="reg.password" type="password" placeholder="At least 8 characters" />
      <button class="btn">Create account</button>
    </form>
  </div>
  <p class="muted">Just looking? <RouterLink to="/">Continue as guest</RouterLink></p>
</template>

<style scoped>
form { display: flex; flex-direction: column; gap: .6rem; }
input { padding: .55rem .7rem; border: 1px solid var(--line); border-radius: 8px; font: inherit; }
</style>
