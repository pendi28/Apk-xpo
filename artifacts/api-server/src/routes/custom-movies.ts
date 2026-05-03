import { Router } from "express";
import { CreateCustomMovieBody, DeleteCustomMovieParams } from "@workspace/api-zod";
import { fbGet, fbPush, fbDelete, fbUpdate, fbObjectToArray } from "../lib/firebase.js";
import { requireAuth } from "../lib/auth.js";

const router = Router();

interface CustomMovieRecord {
  id: string;
  title: string;
  description?: string;
  posterUrl?: string;
  backdropUrl?: string;
  year?: number;
  genres?: string[];
  embedUrl: string;
  type: "movie" | "series";
  tmdbId?: number;
  imdbId?: string;
  createdAt: number;
}

router.get("/custom-movies", async (_req, res) => {
  try {
    const raw = await fbGet<Record<string, Omit<CustomMovieRecord, "id">>>("custom_movies");
    res.json(fbObjectToArray<CustomMovieRecord>(raw));
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/custom-movies", requireAuth, async (req, res) => {
  try {
    const parse = CreateCustomMovieBody.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Invalid body", details: parse.error });
      return;
    }
    const record = { ...parse.data, createdAt: Date.now() };
    const id = await fbPush("custom_movies", record);
    res.status(201).json({ id, ...record });
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

router.put("/custom-movies/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) { res.status(400).json({ error: "Missing id" }); return; }
    const allowed = [
      "title", "description", "posterUrl", "backdropUrl",
      "year", "embedUrl", "type", "genres", "tmdbId", "imdbId",
    ];
    const patch: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in req.body) patch[key] = req.body[key];
    }
    await fbUpdate(`custom_movies/${id}`, patch);
    res.json({ id, ...patch });
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/custom-movies/:id", requireAuth, async (req, res) => {
  try {
    const parse = DeleteCustomMovieParams.safeParse({ id: req.params.id });
    if (!parse.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await fbDelete(`custom_movies/${parse.data.id}`);
    res.status(204).end();
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
