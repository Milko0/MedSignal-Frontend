<script setup>
// View 6 - Profile and settings (FR-13, FR-14). One page; the menu on the left jumps to the sections.
import { useAuthStore } from '@/application/stores/useAuthStore'
import ProfileForm from '@/presentation/components/profile/ProfileForm.vue'
import PasswordForm from '@/presentation/components/profile/PasswordForm.vue'

const auth = useAuthStore()
</script>

<template>
  <h1>Profile and settings</h1>
  <p class="muted">Your account and the alerts you receive.</p>

  <div class="layout">
    <nav class="menu" aria-label="Profile sections">
      <a href="#profile">Profile</a>
    </nav>

    <div class="sections">
      <section v-if="!auth.user" class="card error" role="alert" aria-label="Profile">
        Could not load your profile.
        <button type="button" class="link" @click="auth.restore()">Retry</button>
      </section>
      <section v-else id="profile" class="stack" aria-label="Profile">
        <ProfileForm />
        <PasswordForm />
      </section>
    </div>
  </div>
</template>

<style scoped>
.layout { display: grid; grid-template-columns: 180px minmax(0, 1fr); gap: 1.25rem; align-items: start; margin-top: 1rem; }
.menu { position: sticky; top: 1rem; display: flex; flex-direction: column; gap: .15rem; }
.menu a { padding: .45rem .75rem; border-radius: 8px; color: var(--ink); }
.menu a:hover { background: var(--teal-soft); color: var(--teal); }
.sections { display: grid; gap: 1rem; min-width: 0; }
.stack { display: grid; gap: 1rem; }
.sections section { scroll-margin-top: 1rem; }
.error { color: var(--coral); }
.link { background: none; border: 0; padding: 0; color: var(--teal); font: inherit; text-decoration: underline; cursor: pointer; }
@media (max-width: 760px) {
  .layout { grid-template-columns: minmax(0, 1fr); }
  .menu { position: static; flex-direction: row; flex-wrap: wrap; }
}
</style>
