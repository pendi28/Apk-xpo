import { Router } from "express";
import { AdminLoginBody, AdminLoginResponse, AdminVerifyResponse } from "@workspace/api-zod";
import { checkPassword, generateToken, requireAuth } from "../lib/auth.js";
import { fbGet, fbSet } from "../lib/firebase.js";

const router = Router();

// Cek apakah password sudah di-set di Firebase
async function hasPasswordInFirebase(): Promise<boolean> {
  try {
    const pwd = await fbGet<string>("admin_config/password");
    return !!pwd && pwd.length > 0;
  } catch {
    return false;
  }
}

// GET /api/admin/status — cek apakah password sudah di-set
router.get("/admin/status", async (_req, res) => {
  const hasPwd = await hasPasswordInFirebase();
  res.json({ passwordSet: hasPwd });
});

// POST /api/admin/setup — set password PERTAMA KALI (hanya kalau belum ada)
// Setelah password di-set, route ini DITUTUP PERMANEN (404)
router.post("/admin/setup", async (req, res) => {
  const already = await hasPasswordInFirebase();
  if (already) {
    // Pura-pura route tidak ada agar tidak bisa dieksploitasi
    res.status(404).json({ error: "Not found" });
    return;
  }
  const { password } = req.body ?? {};
  if (!password || typeof password !== "string" || password.length < 4) {
    res.status(400).json({ error: "Password minimal 4 karakter" });
    return;
  }
  try {
    await fbSet("admin_config/password", password);
    await fbSet("admin_config/setupDone", true); // tandai setup selesai
    const token = generateToken();
    res.json({ success: true, token, message: "Password berhasil di-set!" });
  } catch (e) {
    res.status(500).json({ error: "Gagal menyimpan ke Firebase: " + String(e) });
  }
});

// POST /api/admin/change-password — ganti password (butuh password lama)
router.post("/admin/change-password", async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword || typeof newPassword !== "string" || newPassword.length < 4) {
    res.status(400).json({ error: "Password baru minimal 4 karakter" });
    return;
  }
  const ok = await checkPassword(currentPassword);
  if (!ok) {
    res.status(401).json({ error: "Password lama salah" });
    return;
  }
  try {
    await fbSet("admin_config/password", newPassword);
    const token = generateToken();
    res.json({ success: true, token, message: "Password berhasil diganti!" });
  } catch (e) {
    res.status(500).json({ error: "Gagal menyimpan ke Firebase: " + String(e) });
  }
});

// POST /api/admin/login
router.post("/admin/login", async (req, res) => {
  const parse = AdminLoginBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const ok = await checkPassword(parse.data.password);
  if (!ok) {
    const hasPwd = await hasPasswordInFirebase();
    res.status(401).json({
      error: "Wrong password",
      passwordSet: hasPwd,
    });
    return;
  }
  const token = generateToken();
  const response = AdminLoginResponse.parse({ success: true, token });
  res.json(response);
});

// GET /api/admin/verify
router.get("/admin/verify", requireAuth, (_req, res) => {
  const response = AdminVerifyResponse.parse({ success: true, token: "" });
  res.json(response);
});

export default router;
