// Call once at the top of a store test file: every test then starts with a fresh Pinia.
import { beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

export function setupPinia() {
  beforeEach(() => setActivePinia(createPinia()))
}
