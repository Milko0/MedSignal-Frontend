import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // /api goes to the dev API on 8000; API_PROXY_TARGET=http://localhost:8001 uses the API of the Docker cluster instead
  server: { port: 5173, proxy: { '/api': { target: process.env.API_PROXY_TARGET || 'http://localhost:8000', changeOrigin: true } } },
  test: { environment: 'jsdom' },
})
