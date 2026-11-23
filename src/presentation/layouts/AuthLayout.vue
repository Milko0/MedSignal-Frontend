<template><main class="page"><RouterView /></main></template>

<!-- Shared by LoginView and RegisterView (one centred form each). Not scoped: both views use the .auth wrapper. -->
<style>
.auth { max-width: 440px; margin: var(--s-5) auto 0; }
.auth h1 { margin-bottom: var(--s-2); }
.auth .lede { margin: 0 0 var(--s-5); }
.auth form { display: flex; flex-direction: column; gap: var(--s-1); }
.auth h2, .auth form p { margin: 0; }
.auth label { font-size: var(--fs-sm); font-weight: 500; color: var(--ink-2); margin-top: var(--s-2); }
.auth input { padding: .5rem .75rem; border: 1px solid var(--line-strong); border-radius: var(--radius-sm); font: inherit; font-size: var(--fs-md); background: var(--card); color: var(--ink); transition: border-color var(--t-fast), box-shadow var(--t-fast); }
.auth input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.auth input[aria-invalid='true'] { border-color: var(--coral); }
.auth .error { color: var(--coral); font-size: var(--fs-sm); }
.auth .notice { background: var(--green-soft); color: var(--green); border-radius: var(--radius-sm); padding: var(--s-3) var(--s-4); margin: 0 0 var(--s-4); font-size: var(--fs-md); }
.auth .banner { background: var(--coral-soft); color: var(--coral); border-radius: var(--radius-sm); padding: var(--s-2) var(--s-3); font-size: var(--fs-md); }
.auth .btn { margin-top: var(--s-4); }
.auth .btn:disabled { opacity: .55; cursor: not-allowed; }
.auth .switch { margin-top: var(--s-3); font-size: var(--fs-sm); text-align: center; }
.auth .guest { margin-top: var(--s-4); text-align: center; }
</style>
