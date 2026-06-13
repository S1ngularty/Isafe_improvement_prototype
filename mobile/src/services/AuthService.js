export function signInWithUsername(username, password) {
  return Promise.resolve({
    success: Boolean(username && password),
    username,
  });
}

export function requestPasswordReset(username) {
  return Promise.resolve({
    success: Boolean(username),
  });
}
