import { Router } from "express";
import { fbGet, fbPush, fbUpdate, fbDelete, fbObjectToArray } from "../lib/firebase.js";
import { requireAuth } from "../lib/auth.js";
import { randomUUID } from "crypto";

const router = Router();

interface MessageRecord {
  id: string;
  name: string;
  text: string;
  email?: string;
  ts: number;
  read: boolean;
  reply: string | null;
  replyTs: number | null;
  token: string;
}

// POST /api/messages — anyone can send (public)
router.post("/messages", async (req, res) => {
  try {
    const { name, text, email } = req.body as { name?: string; text?: string; email?: string };
    if (!name || !String(name).trim()) { res.status(400).json({ error: "Nama wajib diisi." }); return; }
    if (!text || !String(text).trim()) { res.status(400).json({ error: "Pesan wajib diisi." }); return; }
    if (String(name).length > 60) { res.status(400).json({ error: "Nama terlalu panjang." }); return; }
    if (String(text).length > 1000) { res.status(400).json({ error: "Pesan terlalu panjang (maks 1000 karakter)." }); return; }

    const token = randomUUID();
    const record = {
      name: String(name).trim(),
      text: String(text).trim(),
      email: email ? String(email).trim() : null,
      ts: Date.now(),
      read: false,
      reply: null,
      replyTs: null,
      token,
    };
    const id = await fbPush("messages", record);
    res.status(201).json({ id, token, message: "Pesan berhasil dikirim!" });
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

// GET /api/messages — admin only
router.get("/messages", requireAuth, async (_req, res) => {
  try {
    const raw = await fbGet<Record<string, Omit<MessageRecord, "id">>>("messages");
    const arr = fbObjectToArray<MessageRecord>(raw);
    arr.sort((a, b) => b.ts - a.ts);
    res.json(arr);
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

// GET /api/messages/check?id=xxx&token=xxx — user checks reply (public, token required)
router.get("/messages/check", async (req, res) => {
  try {
    const { id, token } = req.query as { id?: string; token?: string };
    if (!id || !token) { res.status(400).json({ error: "id dan token diperlukan." }); return; }
    const msg = await fbGet<MessageRecord>(`messages/${id}`);
    if (!msg || msg.token !== token) { res.status(404).json({ error: "Pesan tidak ditemukan." }); return; }
    res.json({
      id,
      name: msg.name,
      text: msg.text,
      ts: msg.ts,
      reply: msg.reply ?? null,
      replyTs: msg.replyTs ?? null,
      read: msg.read,
    });
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

// PUT /api/messages/:id/reply — admin replies
router.put("/messages/:id/reply", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body as { reply?: string };
    if (!reply || !String(reply).trim()) { res.status(400).json({ error: "Balasan tidak boleh kosong." }); return; }
    const update = { reply: String(reply).trim(), replyTs: Date.now(), read: true };
    await fbUpdate(`messages/${id}`, update);
    res.json({ id, ...update });
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

// PATCH /api/messages/:id/read — admin marks as read
router.patch("/messages/:id/read", requireAuth, async (req, res) => {
  try {
    await fbUpdate(`messages/${req.params.id}`, { read: true });
    res.json({ ok: true });
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

// DELETE /api/messages/:id — admin deletes
router.delete("/messages/:id", requireAuth, async (req, res) => {
  try {
    await fbDelete(`messages/${req.params.id}`);
    res.status(204).end();
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
