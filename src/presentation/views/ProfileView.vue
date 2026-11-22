<script setup>
// View 6 - Profile and settings (FR-13, FR-14). One page; the menu on the left jumps to the sections.
import { useAuthStore } from '@/application/stores/useAuthStore'
import ProfileForm from '@/presentation/components/profile/ProfileForm.vue'
import PasswordForm from '@/presentation/components/profile/PasswordForm.vue'
import AlertSettingsCard from '@/presentation/components/profile/AlertSettingsCard.vue'
import AccountCard from '@/presentation/components/profile/AccountCard.vue'

const auth = useAuthStore()
</script>

<template>
  <h1>Profile and settings</h1>
  <p class="muted">Your account and the alerts you receive.</p>

  <div class="layout">
    <nav class="menu" aria-label="Profile sections">
      <a href="#profile">Profile</a>
      <a href="#alerts">Alert settings</a>
      <a href="#account">Account</a>
    </nav>

    <div class="sections">
      <!-- A user who just ended the session (log out, account deleted) is on the way to another page: show nothing. -->
      <section v-if="auth.loggedIn && !auth.user" class="card error" role="alert" aria-label="Profile">
        Could not load your profile.
        <button type="button" class="link" @click="auth.restore()">Retry</button>
      </section>
      <section v-else-if="auth.user" id="profile" class="stack" aria-label="Profile">
        <ProfileForm />
        <PasswordForm />
      </section>
      <section v-if="auth.user" id="alerts" aria-label="Alert settings"><AlertSettingsCard /></section>
      <section v-if="auth.user" id="account" aria-label="Account"><AccountCard /></section>
    </div>
  </div>
</template>

<style scoped>
.layout { display: grid; grid-template-columns: 180px minmax(0, 1fr); gap: var(--s-5); align-items: start; margin-top: var(--s-4); }
.menu { position: sticky; top: var(--s-4); display: flex; flex-direction: column; gap: .125rem; }
.menu a { padding: var(--s-2) var(--s-3); border-radius: var(--radius-sm); color: var(--ink-2); font-size: var(--fs-md); font-weight: 500; transition: background-color var(--t-fast), color var(--t-fast); }
.menu a:hover { background: var(--accent-soft); color: var(--accent); text-decoration: none; }
.sections { display: grid; gap: var(--s-4); min-width: 0; }
.stack { display: grid; gap: var(--s-4); }
.sections section { scroll-margin-top: var(--s-4); }
.error { color: var(--coral); }
.link { background: none; border: 0; padding: 0; color: var(--accent); font: inherit; text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
@media (max-width: 760px) {
  .layout { grid-template-columns: minmax(0, 1fr); }
  .menu { position: static; flex-direction: row; flex-wrap: wrap; }
}
</style>
