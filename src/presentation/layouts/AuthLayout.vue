<script setup>
// Log in and Create account fill the whole window under the normal header (users can always go back home or
// search): a full-height brand panel on the left, the form on a white half on the right.
import AppNavbar from '@/presentation/components/common/AppNavbar.vue'
import AppToast from '@/presentation/components/common/AppToast.vue'
import AuthShowcase from '@/presentation/components/auth/AuthShowcase.vue'
</script>

<template>
  <div class="auth-shell">
    <AppNavbar />
    <main class="auth-main">
      <aside class="auth-visual" aria-label="What MedSignal does"><AuthShowcase /></aside>

      <section class="auth-form"><RouterView /></section>
    </main>
    <AppToast />
  </div>
</template>

<!-- Shared by LoginView and RegisterView. Not scoped: both views use the .auth wrapper. -->
<style>
.auth-shell { min-height: 100vh; display: flex; flex-direction: column; background: var(--card); }
.auth-main { flex: 1; display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); }

/* Brand half: full height, slanted right edge; AuthShowcase fills it */
.auth-visual { background: var(--accent); color: var(--on-accent); display: flex; min-height: 100%;
  padding: var(--s-6) 12% var(--s-6) clamp(var(--s-5), 5vw, var(--s-7)); clip-path: polygon(0 0, 100% 0, 90% 100%, 0 100%); }

/* Form half */
.auth-form { display: flex; align-items: center; justify-content: center; padding: var(--s-7) var(--s-6); }
.auth { width: 100%; max-width: 24rem; }
.auth form { display: flex; flex-direction: column; gap: var(--s-1); padding: 0; box-shadow: none; background: none; }
.auth h2 { margin: 0; font-size: 2rem; }
.auth form > p { margin: 0; }
.auth form > p.muted { font-size: var(--fs-base); margin-top: var(--s-1); }
.auth label { font-size: var(--fs-sm); font-weight: 500; color: var(--ink-2); margin-top: var(--s-4); }
.auth input { padding: .75rem .875rem; border: 1px solid var(--line-strong); border-radius: var(--radius); font: inherit; font-size: var(--fs-base); background: var(--card); color: var(--ink); transition: border-color var(--t-fast), box-shadow var(--t-fast); }
.auth input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.auth input[aria-invalid='true'] { border-color: var(--coral); }
.auth .error { color: var(--coral); font-size: var(--fs-sm); }
.auth .notice { background: var(--green-soft); color: var(--green); border-radius: var(--radius-sm); padding: var(--s-3) var(--s-4); margin: 0 0 var(--s-4); font-size: var(--fs-md); }
.auth .banner { background: var(--coral-soft); color: var(--coral); border-radius: var(--radius-sm); padding: var(--s-2) var(--s-3); font-size: var(--fs-md); margin-top: var(--s-4); }
.auth .btn { margin-top: var(--s-6); padding: .75rem; font-size: var(--fs-base); }
.auth .btn:disabled { opacity: .55; cursor: not-allowed; }
.auth .switch { margin-top: var(--s-5); font-size: var(--fs-md); text-align: center; }

@media (max-width: 900px) {
  .auth-main { grid-template-columns: 1fr; }
  .auth-visual { clip-path: none; padding: var(--s-6) var(--s-5); }
  .auth-form { padding: var(--s-6) var(--s-5); }
}
</style>
