const TOKEN_KEY = "xpogo_admin_token";
const WRITE_KEY = "xpogo_write_token";

/* ── login-state (hash) persisted across tabs ── */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
export function isLoggedIn(): boolean {
  return !!getToken();
}

/* ── write-token (raw password = Firebase DB secret) stored in sessionStorage only ──
   Never included in the JS bundle. Entered at login time, cleared when tab closes. */
export function getWriteToken(): string {
  return sessionStorage.getItem(WRITE_KEY) ?? "";
}
export function setWriteToken(token: string): void {
  sessionStorage.setItem(WRITE_KEY, token);
}
export function clearWriteToken(): void {
  sessionStorage.removeItem(WRITE_KEY);
}
