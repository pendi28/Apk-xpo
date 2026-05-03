import { Router } from "express";
import { CreateAdBody, UpdateAdBody, UpdateAdParams, DeleteAdParams } from "@workspace/api-zod";
import { fbGet, fbPush, fbSet, fbDelete, fbUpdate, fbObjectToArray } from "../lib/firebase.js";
import { requireAuth } from "../lib/auth.js";

const router = Router();

interface AdRecord {
  id: string;
  type: "banner-top" | "banner-bottom" | "popunder";
  label: string;
  code: string;
  active: boolean;
  createdAt: number;
}

router.get("/ads", async (_req, res) => {
  try {
    const raw = await fbGet<Record<string, Omit<AdRecord, "id">>>("ads");
    res.json(fbObjectToArray<AdRecord>(raw));
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/ads", requireAuth, async (req, res) => {
  try {
    const parse = CreateAdBody.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Invalid body", details: parse.error });
      return;
    }
    const record = {
      ...parse.data,
      active: parse.data.active ?? true,
      createdAt: Date.now(),
    };
    const id = await fbPush("ads", record);
    res.status(201).json({ id, ...record });
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

router.put("/ads/:id", requireAuth, async (req, res) => {
  try {
    const paramsParse = UpdateAdParams.safeParse({ id: req.params.id });
    if (!paramsParse.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const bodyParse = UpdateAdBody.safeParse(req.body);
    if (!bodyParse.success) {
      res.status(400).json({ error: "Invalid body", details: bodyParse.error });
      return;
    }
    await fbUpdate(`ads/${paramsParse.data.id}`, bodyParse.data);
    res.json({ id: paramsParse.data.id, ...bodyParse.data });
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/ads/:id", requireAuth, async (req, res) => {
  try {
    const parse = DeleteAdParams.safeParse({ id: req.params.id });
    if (!parse.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await fbDelete(`ads/${parse.data.id}`);
    res.status(204).end();
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
