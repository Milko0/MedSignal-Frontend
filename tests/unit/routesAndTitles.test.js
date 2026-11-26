import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from '@/presentation/router/routes'
import { APP_NAME, installTitles, pageTitle } from '@/presentation/router/titles'

const makeRouter = () => createRouter({ history: createMemoryHistory(), routes })

describe('routes', () => {
  it('sends an unknown path to the not-found page', () => {
    const match = makeRouter().resolve('/does-not-exist/at/all')
    expect(match.name).toBe('not-found')
  })

  it('still resolves the real pages before the catch-all', () => {
    const router = makeRouter()
    expect(router.resolve('/').name).toBe('dashboard')
    expect(router.resolve('/signals').name).toBe('signals')
    expect(router.resolve('/drugs/5640').name).toBe('drug')
    expect(router.resolve('/my-medicines').name).toBe('cabinet')
    expect(router.resolve('/login').name).toBe('login')
    expect(router.resolve('/register').name).toBe('register')
  })

  it('gives every named page a title', () => {
    const router = makeRouter()
    for (const path of ['/', '/signals', '/drugs/1', '/my-medicines', '/profile', '/login', '/register', '/nope']) {
      expect(router.resolve(path).meta.title, path).toBeTruthy()
    }
  })

  it('protects the admin area for logged-in admins only, on a wide page, and every child inherits it', () => {
    const match = makeRouter().resolve('/admin')
    expect(match.meta).toMatchObject({ requiresAuth: true, requiresAdmin: true, wide: true })
  })

  it('sends the old /auth address to the login page and keeps its query', async () => {
    const router = makeRouter()
    await router.push('/auth?redirect=/profile')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query).toEqual({ redirect: '/profile' })
  })
})

describe('page titles', () => {
  it('adds the app name after the page title', () => {
    expect(pageTitle('My medicines')).toBe(`My medicines · ${APP_NAME}`)
    expect(pageTitle(undefined)).toBe(APP_NAME)
  })

  it('sets the document title after each navigation', async () => {
    const router = makeRouter()
    const doc = { title: '' }
    installTitles(router, doc)
    await router.push('/signals')
    expect(doc.title).toBe(`Signals & statistics · ${APP_NAME}`)
    await router.push('/missing')
    expect(doc.title).toBe(`Page not found · ${APP_NAME}`)
  })
})
