import { Router } from "express";
import { fbGet, fbPush, fbUpdate, fbDelete, fbObjectToArray } from "../lib/firebase.js";
import { requireAuth } from "../lib/auth.js";

const router = Router();

interface Comment {
  id: string;
  name: string;
  text: string;
  createdAt: number;
  likes: number;
  replies?: Record<string, { name: string; text: string; createdAt: number }>;
}

function mediaKey(mediaType: string, tmdbId: string) {
  return `comments/${mediaType}_${tmdbId}`;
}

// GET /api/comments/:mediaType/:tmdbId — list all comments (public)
router.get("/comments/:mediaType/:tmdbId", async (req, res) => {
  try {
    const { mediaType, tmdbId } = req.params;
    const raw = await fbGet<Record<string, Omit<Comment, "id">>>(mediaKey(mediaType, tmdbId));
    const list = fbObjectToArray<Comment>(raw as Record<string, Omit<Comment, "id">> | null);
    const sorted = list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    res.json(sorted);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// POST /api/comments/:mediaType/:tmdbId — add comment (public)
router.post("/comments/:mediaType/:tmdbId", async (req, res) => {
  try {
    const { mediaType, tmdbId } = req.params;
    const { name, text } = req.body as { name?: string; text?: string };
    if (!name?.trim() || !text?.trim()) {
      res.status(400).json({ error: "name dan text wajib diisi" });
      return;
    }
    const id = await fbPush(mediaKey(mediaType, tmdbId), {
      name: name.trim().slice(0, 50),
      text: text.trim().slice(0, 500),
      createdAt: Date.now(),
      likes: 0,
    });
    res.json({ id, success: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// POST /api/comments/:mediaType/:tmdbId/:commentId/like — like +1 (public)
router.post("/comments/:mediaType/:tmdbId/:commentId/like", async (req, res) => {
  try {
    const { mediaType, tmdbId, commentId } = req.params;
    const path = `${mediaKey(mediaType, tmdbId)}/${commentId}`;
    const comment = await fbGet<Comment>(path);
    if (!comment) { res.status(404).json({ error: "Komentar tidak ditemukan" }); return; }
    await fbUpdate(path, { likes: (comment.likes ?? 0) + 1 });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// POST /api/comments/:mediaType/:tmdbId/:commentId/replies — add reply (public)
router.post("/comments/:mediaType/:tmdbId/:commentId/replies", async (req, res) => {
  try {
    const { mediaType, tmdbId, commentId } = req.params;
    const { name, text } = req.body as { name?: string; text?: string };
    if (!name?.trim() || !text?.trim()) {
      res.status(400).json({ error: "name dan text wajib diisi" });
      return;
    }
    const path = `${mediaKey(mediaType, tmdbId)}/${commentId}/replies`;
    const id = await fbPush(path, {
      name: name.trim().slice(0, 50),
      text: text.trim().slice(0, 300),
      createdAt: Date.now(),
    });
    res.json({ id, success: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// DELETE /api/comments/:mediaType/:tmdbId/:commentId — admin only
router.delete("/comments/:mediaType/:tmdbId/:commentId", requireAuth, async (req, res) => {
  try {
    const { mediaType, tmdbId, commentId } = req.params;
    await fbDelete(`${mediaKey(mediaType, tmdbId)}/${commentId}`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
