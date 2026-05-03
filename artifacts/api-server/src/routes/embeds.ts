import { Router } from "express";
import {
  CreateEmbedBody,
  UpdateEmbedBody,
  UpdateEmbedParams,
  DeleteEmbedParams,
  GetEmbedsByTmdbIdParams,
} from "@workspace/api-zod";
import { fbGet, fbPush, fbDelete, fbUpdate, fbObjectToArray } from "../lib/firebase.js";
import { requireAuth } from "../lib/auth.js";

const router = Router();

interface EmbedRecord {
  id: string;
  type: "movie" | "series";
  tmdbId?: number;
  title: string;
  url: string;
  sub?: string;
  active: boolean;
  seasons?: Record<string, Record<string, string>>;
  createdAt: number;
}

router.get("/embeds", async (_req, res) => {
  try {
    const raw = await fbGet<Record<string, Omit<EmbedRecord, "id">>>("embeds");
    res.json(fbObjectToArray<EmbedRecord>(raw));
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/embeds", requireAuth, async (req, res) => {
  try {
    const parse = CreateEmbedBody.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Invalid body", details: parse.error });
      return;
    }
    const record = { ...parse.data, active: parse.data.active ?? true, createdAt: Date.now() };
    const id = await fbPush("embeds", record);
    res.status(201).json({ id, ...record });
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

router.put("/embeds/:id", requireAuth, async (req, res) => {
  try {
    const paramsParse = UpdateEmbedParams.safeParse({ id: req.params.id });
    if (!paramsParse.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const bodyParse = UpdateEmbedBody.safeParse(req.body);
    if (!bodyParse.success) {
      res.status(400).json({ error: "Invalid body", details: bodyParse.error });
      return;
    }
    await fbUpdate(`embeds/${paramsParse.data.id}`, bodyParse.data);
    res.json({ id: paramsParse.data.id, ...bodyParse.data });
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/embeds/:id", requireAuth, async (req, res) => {
  try {
    const parse = DeleteEmbedParams.safeParse({ id: req.params.id });
    if (!parse.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await fbDelete(`embeds/${parse.data.id}`);
    res.status(204).end();
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/embeds/tmdb/:tmdbId", async (req, res) => {
  try {
    const parse = GetEmbedsByTmdbIdParams.safeParse({ tmdbId: Number(req.params.tmdbId) });
    if (!parse.success) {
      res.status(400).json({ error: "Invalid tmdbId" });
      return;
    }
    const raw = await fbGet<Record<string, Omit<EmbedRecord, "id">>>("embeds");
    const all = fbObjectToArray<EmbedRecord>(raw);
    const filtered = all.filter((e) => e.tmdbId === parse.data.tmdbId && e.active);
    res.json(filtered);
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
