import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/composition/container', async () => ({
  services: (await import('../helpers/mockServices')).mockServices(),
}))

const push = vi.fn()
const route = { query: {} }
vi.mock('vue-router', () => ({ useRouter: () => ({ push }), useRoute: () => route }))

const { services } = await import('@/composition/container')
const AuthView = (await import('@/presentation/views/AuthView.vue')).default

const user = { id: 'u-1', username: 'p2_test_user', email: 'p2_test_user@example.com', role: 'user' }
const apiError = (status, message, fieldErrors = {}) => Object.assign(new Error(message), { status, fieldErrors })

let pinia
function show() {
  return mount(AuthView, { global: { plugins: [pinia], stubs: { RouterLink: { template: '<a><slot /></a>' } } } })
}
const forms = (w) => ({ login: w.findAll('form')[0], register: w.findAll('form')[1] })

beforeEach(() => {
  vi.resetAllMocks()
  pinia = createPinia()
  setActivePinia(pinia)
  route.query = {}
  services.auth.hasToken.mockReturnValue(false)
})

describe('AuthView', () => {
  it('shows both cards with labels above the inputs and a guest link', () => {
    const w = show()
    expect(w.text()).toContain('Welcome back.')
    expect(w.text()).toContain('Follow medicines and receive alerts.')
    expect(w.find('label[for="login-identifier"]').text()).toBe('Username or email')
    expect(w.find('label[for="reg-email"]').text()).toBe('Email')
    expect(w.text()).toContain('Continue as guest')
  })

  it('shows field errors under the inputs and does not call the API when the form is invalid', async () => {
    const w = show()
    await w.find('#reg-username').setValue('ab')
    await w.find('#reg-email').setValue('nope')
    await w.find('#reg-password').setValue('short')
    await forms(w).register.trigger('submit')

    const errors = forms(w).register.findAll('.error').map((e) => e.text())
    expect(errors).toHaveLength(3)
    expect(errors[0]).toMatch(/3-32/)
    expect(errors[1]).toMatch(/valid email/i)
    expect(errors[2]).toMatch(/at least 8/)
    expect(services.auth.register).not.toHaveBeenCalled()
  })

  it('requires an identifier and a password to log in', async () => {
    const w = show()
    await forms(w).login.trigger('submit')
    expect(forms(w).login.findAll('.error')).toHaveLength(2)
    expect(services.auth.login).not.toHaveBeenCalled()
  })

  it('disables the button while the request is pending', async () => {
    let finish
    services.auth.login.mockReturnValue(new Promise((resolve) => { finish = resolve }))
    const w = show()
    await w.find('#login-identifier').setValue('p2_test_user')
    await w.find('#login-password').setValue('secret123')

    await forms(w).login.trigger('submit')
    const button = forms(w).login.find('button')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toBe('Logging in...')

    finish(user)
    await flushPromises()
    expect(button.attributes('disabled')).toBeUndefined()
  })

  it('shows the wrong-password message for a 401', async () => {
    services.auth.login.mockRejectedValue(apiError(401, 'Invalid credentials'))
    const w = show()
    await w.find('#login-identifier').setValue('p2_test_user')
    await w.find('#login-password').setValue('wrong-pass')

    await forms(w).login.trigger('submit')
    await flushPromises()

    expect(forms(w).login.find('[role="alert"]').text()).toBe('Wrong username/email or password')
    expect(push).not.toHaveBeenCalled()
  })

  it('shows a 409 under the username field', async () => {
    services.auth.register.mockRejectedValue(apiError(409, 'Username or email already registered'))
    const w = show()
    await w.find('#reg-username').setValue('p2_test_user')
    await w.find('#reg-email').setValue('p2_test_user@example.com')
    await w.find('#reg-password').setValue('secret123')

    await forms(w).register.trigger('submit')
    await flushPromises()

    const errors = forms(w).register.findAll('.error')
    expect(errors).toHaveLength(1)
    expect(errors[0].text()).toBe('Username or email already registered')
    expect(w.find('#reg-username').attributes('aria-invalid')).toBe('true')
  })

  it('shows a banner when the server cannot be reached', async () => {
    services.auth.login.mockRejectedValue(apiError(0, 'Cannot reach the server. Check your connection and try again.'))
    const w = show()
    await w.find('#login-identifier').setValue('p2_test_user')
    await w.find('#login-password').setValue('secret123')

    await forms(w).login.trigger('submit')
    await flushPromises()

    expect(forms(w).login.find('[role="alert"]').text()).toMatch(/cannot reach the server/i)
  })

  it('registers and goes to the dashboard', async () => {
    services.auth.register.mockResolvedValue(user)
    const w = show()
    await w.find('#reg-username').setValue(' p2_test_user ')
    await w.find('#reg-email').setValue('p2_test_user@example.com')
    await w.find('#reg-password').setValue('secret123')

    await forms(w).register.trigger('submit')
    await flushPromises()

    expect(services.auth.register).toHaveBeenCalledWith({
      username: 'p2_test_user', email: 'p2_test_user@example.com', password: 'secret123',
    })
    expect(push).toHaveBeenCalledWith('/')
  })

  it('goes back to the page the guard interrupted after logging in', async () => {
    route.query = { redirect: '/my-medicines' }
    services.auth.login.mockResolvedValue(user)
    const w = show()
    await w.find('#login-identifier').setValue('p2_test_user')
    await w.find('#login-password').setValue('secret123')

    await forms(w).login.trigger('submit')
    await flushPromises()

    expect(push).toHaveBeenCalledWith('/my-medicines')
  })

  it('ignores a redirect that points to another site', async () => {
    route.query = { redirect: '//evil.com' }
    services.auth.login.mockResolvedValue(user)
    const w = show()
    await w.find('#login-identifier').setValue('p2_test_user')
    await w.find('#login-password').setValue('secret123')

    await forms(w).login.trigger('submit')
    await flushPromises()

    expect(push).toHaveBeenCalledWith('/')
  })
})
