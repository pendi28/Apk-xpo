import { Router } from "express";
import { UpdateSettingsBody } from "@workspace/api-zod";
import { fbGet, fbSet } from "../lib/firebase.js";
import { requireAuth } from "../lib/auth.js";

const router = Router();

const DEFAULT_SETTINGS = {
  playerColor: "E50914",
  posterSize: "medium",
  fontFamily: "Inter, sans-serif",
  siteTitle: "XpoGo",
  playerServer: "1",
  playerDomainAd: "",
  autoplay: true,
};

router.get("/settings", async (_req, res) => {
  try {
    const data = await fbGet<typeof DEFAULT_SETTINGS>("settings");
    res.json(data ?? DEFAULT_SETTINGS);
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

router.put("/settings", requireAuth, async (req, res) => {
  try {
    const parse = UpdateSettingsBody.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Invalid body", details: parse.error });
      return;
    }
    await fbSet("settings", parse.data);
    res.json(parse.data);
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
