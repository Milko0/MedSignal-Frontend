// UserResponse -> User. The backend calls the id `user_id`.
export const toUser = (d) => ({ id: d.user_id, username: d.username, email: d.email, role: d.role })
