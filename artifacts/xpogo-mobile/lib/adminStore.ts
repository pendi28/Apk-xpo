let _token: string | null = null;

export function setAdminToken(token: string | null) {
  _token = token;
}

export function getAdminToken(): string | null {
  return _token;
}

export function isAdminLoggedIn(): boolean {
  return !!_token;
}

export function adminHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...((_token) ? { Authorization: `Bearer ${_token}` } : {}),
  };
}
