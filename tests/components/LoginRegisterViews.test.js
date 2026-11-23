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
const LoginView = (await import('@/presentation/views/LoginView.vue')).default
const RegisterView = (await import('@/presentation/views/RegisterView.vue')).default

const user = { id: 'u-1', username: 'p2_test_user', email: 'p2_test_user@example.com', role: 'user' }
const apiError = (status, message, fieldErrors = {}) => Object.assign(new Error(message), { status, fieldErrors })

let pinia
// The RouterLink stub exposes its target so the tests can check where "Create an account" / "Log in" point.
const RouterLink = { props: ['to'], template: '<a :data-to="JSON.stringify(to)"><slot /></a>' }
const mountView = (view) => mount(view, { global: { plugins: [pinia], stubs: { RouterLink } } })
const showLogin = () => mountView(LoginView)
const showRegister = () => mountView(RegisterView)
const linkTo = (w, text) => JSON.parse(w.findAll('a').find((a) => a.text() === text).attributes('data-to'))

beforeEach(() => {
  vi.resetAllMocks()
  pinia = createPinia()
  setActivePinia(pinia)
  route.query = {}
  services.auth.hasToken.mockReturnValue(false)
})

describe('LoginView and RegisterView', () => {
  it('the login page shows only the login form, with links to sign up and to continue as guest', () => {
    const w = showLogin()
    expect(w.findAll('form')).toHaveLength(1)
    expect(w.text()).toContain('Welcome back.')
    expect(w.text()).not.toContain('Follow medicines and receive alerts.')
    expect(w.find('#reg-email').exists()).toBe(false)
    expect(w.find('label[for="login-identifier"]').text()).toBe('Username or email')
    expect(linkTo(w, 'Create an account')).toEqual({ name: 'register', query: {} })
    expect(w.text()).toContain('Continue as guest')
  })

  it('the register page shows only the register form, with links to log in and to continue as guest', () => {
    const w = showRegister()
    expect(w.findAll('form')).toHaveLength(1)
    expect(w.text()).toContain('Follow medicines and receive alerts.')
    expect(w.text()).not.toContain('Welcome back.')
    expect(w.find('#login-identifier').exists()).toBe(false)
    expect(w.find('label[for="reg-email"]').text()).toBe('Email')
    expect(linkTo(w, 'Log in')).toEqual({ name: 'login', query: {} })
    expect(w.text()).toContain('Continue as guest')
  })

  it('switching between the pages keeps the page to return to', () => {
    route.query = { redirect: '/my-medicines', deleted: '1' }
    expect(linkTo(showLogin(), 'Create an account')).toEqual({ name: 'register', query: { redirect: '/my-medicines' } })
    expect(linkTo(showRegister(), 'Log in')).toEqual({ name: 'login', query: { redirect: '/my-medicines' } })
  })

  it('shows field errors under the inputs and does not call the API when the form is invalid', async () => {
    const w = showRegister()
    await w.find('#reg-username').setValue('ab')
    await w.find('#reg-email').setValue('nope')
    await w.find('#reg-password').setValue('short')
    await w.find('form').trigger('submit')

    const errors = w.find('form').findAll('.error').map((e) => e.text())
    expect(errors).toHaveLength(3)
    expect(errors[0]).toMatch(/3-32/)
    expect(errors[1]).toMatch(/valid email/i)
    expect(errors[2]).toMatch(/at least 8/)
    expect(services.auth.register).not.toHaveBeenCalled()
  })

  it('requires an identifier and a password to log in', async () => {
    const w = showLogin()
    await w.find('form').trigger('submit')
    expect(w.find('form').findAll('.error')).toHaveLength(2)
    expect(services.auth.login).not.toHaveBeenCalled()
  })

  it('disables the button while the request is pending', async () => {
    let finish
    services.auth.login.mockReturnValue(new Promise((resolve) => { finish = resolve }))
    const w = showLogin()
    await w.find('#login-identifier').setValue('p2_test_user')
    await w.find('#login-password').setValue('secret123')

    await w.find('form').trigger('submit')
    const button = w.find('form').find('button')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toBe('Logging in...')

    finish(user)
    await flushPromises()
    expect(button.attributes('disabled')).toBeUndefined()
  })

  it('shows the wrong-password message for a 401', async () => {
    services.auth.login.mockRejectedValue(apiError(401, 'Invalid credentials'))
    const w = showLogin()
    await w.find('#login-identifier').setValue('p2_test_user')
    await w.find('#login-password').setValue('wrong-pass')

    await w.find('form').trigger('submit')
    await flushPromises()

    expect(w.find('form').find('[role="alert"]').text()).toBe('Wrong username/email or password')
    expect(push).not.toHaveBeenCalled()
  })

  it('shows a 409 under the username field', async () => {
    services.auth.register.mockRejectedValue(apiError(409, 'Username or email already registered'))
    const w = showRegister()
    await w.find('#reg-username').setValue('p2_test_user')
    await w.find('#reg-email').setValue('p2_test_user@example.com')
    await w.find('#reg-password').setValue('secret123')

    await w.find('form').trigger('submit')
    await flushPromises()

    const errors = w.find('form').findAll('.error')
    expect(errors).toHaveLength(1)
    expect(errors[0].text()).toBe('Username or email already registered')
    expect(w.find('#reg-username').attributes('aria-invalid')).toBe('true')
  })

  it('shows a banner when the server cannot be reached', async () => {
    services.auth.login.mockRejectedValue(apiError(0, 'Cannot reach the server. Check your connection and try again.'))
    const w = showLogin()
    await w.find('#login-identifier').setValue('p2_test_user')
    await w.find('#login-password').setValue('secret123')

    await w.find('form').trigger('submit')
    await flushPromises()

    expect(w.find('form').find('[role="alert"]').text()).toMatch(/cannot reach the server/i)
  })

  it('goes back to the page the guard interrupted after creating an account', async () => {
    route.query = { redirect: '/my-medicines' }
    services.auth.register.mockResolvedValue(user)
    const w = showRegister()
    await w.find('#reg-username').setValue('p2_test_user')
    await w.find('#reg-email').setValue('p2_test_user@example.com')
    await w.find('#reg-password').setValue('secret123')

    await w.find('form').trigger('submit')
    await flushPromises()

    expect(push).toHaveBeenCalledWith('/my-medicines')
  })

  it('registers and goes to the dashboard', async () => {
    services.auth.register.mockResolvedValue(user)
    const w = showRegister()
    await w.find('#reg-username').setValue(' p2_test_user ')
    await w.find('#reg-email').setValue('p2_test_user@example.com')
    await w.find('#reg-password').setValue('secret123')

    await w.find('form').trigger('submit')
    await flushPromises()

    expect(services.auth.register).toHaveBeenCalledWith({
      username: 'p2_test_user', email: 'p2_test_user@example.com', password: 'secret123',
    })
    expect(push).toHaveBeenCalledWith('/')
  })

  it('goes back to the page the guard interrupted after logging in', async () => {
    route.query = { redirect: '/my-medicines' }
    services.auth.login.mockResolvedValue(user)
    const w = showLogin()
    await w.find('#login-identifier').setValue('p2_test_user')
    await w.find('#login-password').setValue('secret123')

    await w.find('form').trigger('submit')
    await flushPromises()

    expect(push).toHaveBeenCalledWith('/my-medicines')
  })

  it('ignores a redirect that points to another site', async () => {
    route.query = { redirect: '//evil.com' }
    services.auth.login.mockResolvedValue(user)
    const w = showLogin()
    await w.find('#login-identifier').setValue('p2_test_user')
    await w.find('#login-password').setValue('secret123')

    await w.find('form').trigger('submit')
    await flushPromises()

    expect(push).toHaveBeenCalledWith('/')
  })
})

describe('LoginView: after an account was deleted', () => {
  it('says so when the profile page sends the user here with ?deleted=1', () => {
    route.query = { deleted: '1' }
    expect(showLogin().find('.notice').text()).toBe('Your account was deleted.')
  })

  it('shows nothing for a plain visit or any other value', () => {
    expect(showLogin().find('.notice').exists()).toBe(false)
    route.query = { deleted: 'yes' }
    expect(showLogin().find('.notice').exists()).toBe(false)
    route.query = { deleted: ['1'] }
    expect(showLogin().find('.notice').exists()).toBe(false)
  })
})
