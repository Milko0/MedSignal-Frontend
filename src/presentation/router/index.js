import { createRouter, createWebHistory } from 'vue-router'
import { routes } from './routes'
import { installGuards } from './guards'
import { installTitles } from './titles'

const router = createRouter({ history: createWebHistory(), routes })
installGuards(router)
installTitles(router)
export default router
