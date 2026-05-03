import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { fbGet } from "./firebase.js";

// TOKEN_SECRET pakai FIREBASE_DB_SECRET agar stabil tidak berubah
const TOKEN_SECRET = crypto
  .createHash("sha256")
  .update((process.env.FIREBASE_DB_SECRET ?? "xpogo_token_secret") + "_xpg")
  .digest("hex");

// Cache password dari Firebase (30 detik)
let _cachedPwd: string | null = null;
let _cacheTs = 0;

async function getAdminPassword(): Promise<string> {
  if (_cachedPwd !== null && Date.now() - _cacheTs < 30_000) return _cachedPwd;
  try {
    const fromDb = await fbGet<string>("admin_config/password");
    _cachedPwd = fromDb ?? process.env.ADMIN_PASSWORD ?? "";
  } catch {
    _cachedPwd = process.env.ADMIN_PASSWORD ?? "";
  }
  _cacheTs = Date.now();
  return _cachedPwd;
}

export function generateToken(): string {
  const payload = `xpogo:${Date.now()}`;
  const sig = crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function verifyToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(":");
    if (parts.length < 3) return false;
    const sig = parts.pop()!;
    const payload = parts.join(":");
    const expected = crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export async function checkPassword(password: string): Promise<boolean> {
  const adminPassword = await getAdminPassword();
  if (!adminPassword) return false;
  try {
    if (Buffer.from(password).length !== Buffer.from(adminPassword).length) return false;
    return crypto.timingSafeEqual(Buffer.from(password), Buffer.from(adminPassword));
  } catch {
    return false;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = auth.slice(7);
  if (!verifyToken(token)) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
  next();
}
