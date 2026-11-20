// Requests whose 401 is an answer to the form, not the end of the session:
//   /auth/login        wrong username or password
//   /auth/logout       the token is already revoked or expired
//   /profile/password  wrong current password; the user stays logged in
// Any other 401 means the token is no good and the session ends.
export const FORM_401_PATHS = ['/auth/login', '/auth/logout', '/profile/password']
