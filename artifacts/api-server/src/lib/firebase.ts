const DB_URL = "https://apps-tmdb-default-rtdb.asia-southeast1.firebasedatabase.app";
const DB_SECRET = process.env.FIREBASE_DB_SECRET;

export async function fbGet<T>(path: string): Promise<T | null> {
  const url = `${DB_URL}/${path}.json`;
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firebase GET ${path} failed: ${res.status}`);
  const text = await res.text();
  if (!text || text === "null") return null;
  return JSON.parse(text) as T;
}

export async function fbSet<T>(path: string, value: T): Promise<void> {
  const url = `${DB_URL}/${path}.json?auth=${DB_SECRET}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  if (!res.ok) throw new Error(`Firebase PUT ${path} failed: ${res.status}`);
}

export async function fbPush<T>(path: string, value: T): Promise<string> {
  const url = `${DB_URL}/${path}.json?auth=${DB_SECRET}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  if (!res.ok) throw new Error(`Firebase POST ${path} failed: ${res.status}`);
  const json = await res.json();
  return json.name as string;
}

export async function fbDelete(path: string): Promise<void> {
  const url = `${DB_URL}/${path}.json?auth=${DB_SECRET}`;
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) throw new Error(`Firebase DELETE ${path} failed: ${res.status}`);
}

export async function fbUpdate<T>(path: string, value: Partial<T>): Promise<void> {
  const url = `${DB_URL}/${path}.json?auth=${DB_SECRET}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  if (!res.ok) throw new Error(`Firebase PATCH ${path} failed: ${res.status}`);
}

export function fbObjectToArray<T extends { id: string }>(
  obj: Record<string, Omit<T, "id">> | null,
): T[] {
  if (!obj) return [];
  return Object.entries(obj).map(([id, val]) => ({ id, ...val } as T));
}
