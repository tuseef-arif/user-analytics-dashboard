// Must match the cookie name the backend sets on login (api/deps.py), or the route
// guard never sees the session.
export const ACCESS_TOKEN_COOKIE = 'access_token';
