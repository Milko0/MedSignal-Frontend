import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from '@/presentation/router'
import { useAuthStore } from '@/application/stores/useAuthStore'
import { configureHttp } from '@/infrastructure/http/httpClient'
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-sans/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/source-serif-4/600.css'
import '@/presentation/styles/tokens.css'
import '@/presentation/styles/base.css'

async function bootstrap() {
  const app = createApp(App).use(createPinia())
  const auth = useAuthStore()

  // Expired or revoked token: drop the session and, if the page needs a login, go to /login and come back after.
  configureHttp({
    onUnauthorized: (error) => {
      if (!auth.handleUnauthorized(error)) return
      const route = router.currentRoute.value
      if (route.meta.requiresAuth) router.push({ name: 'login', query: { redirect: route.fullPath } })
    },
  })

  // Restore the session before the router is installed (installing it starts the first navigation), so the
  // guards see the real state: a stale token is gone by then and the page loads as a guest.
  await auth.restore()
  app.use(router).mount('#app')
}

bootstrap()
