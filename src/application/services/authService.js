// `session` is a port with get() / set(token) / clear(); the composition root passes the token storage.
export function createAuthService(authApi, profileApi, session) {
  // FR-12: login returns only a token, so the user comes from GET /profile.
  async function login({ identifier, password }) {
    const { accessToken } = await authApi.login({ identifier, password })
    session.set(accessToken)
    try {
      return await profileApi.get()
    } catch (e) {
      session.clear() // a token we cannot use must not stay around
      throw e
    }
  }

  return {
    login,
    // FR-11: register returns no token, so log in right after with the same credentials.
    async register({ username, email, password }) {
      await authApi.register({ username, email, password })
      return login({ identifier: username, password })
    },
    // Revoke the token on the server (best effort), then always drop it locally.
    async logout() {
      try {
        if (session.get()) await authApi.logout()
      } catch {
        // already expired or revoked: nothing left to revoke
      } finally {
        session.clear()
      }
    },
    // Reload the user for a stored token. A rejected token (401) is dropped and means "guest" (null);
    // any other failure (network down, 5xx) is rethrown and the token is kept for the next try.
    async restore() {
      if (!session.get()) return null
      try {
        return await profileApi.get()
      } catch (e) {
        if (e?.status !== 401) throw e
        session.clear()
        return null
      }
    },
    // Local only: used when the server already said the token is no good.
    clearSession: () => session.clear(),
    hasToken: () => !!session.get(),
  }
}
