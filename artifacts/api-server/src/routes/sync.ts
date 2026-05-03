import { Router } from "express";
import { fbGet, fbSet, fbUpdate } from "../lib/firebase.js";
import { logger } from "../lib/logger.js";
import { requireAuth } from "../lib/auth.js";

const router = Router();

const TMDB_KEY = process.env.TMDB_API_KEY ?? "";
const TMDB_BASE = "https://api.themoviedb.org/3";

const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const SYNC_DB_PATH = "tmdb_sync";
const STATUS_DB_PATH = "tmdb_sync_status";

// ─── TMDB helper ──────────────────────────────────────────────────────────────
async function tmdbFetch(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", TMDB_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB ${path} → ${res.status}`);
  return res.json() as Promise<{ results?: TmdbItem[] }>;
}

interface TmdbItem {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  genre_ids?: number[];
  media_type?: string;
  popularity?: number;
}

interface SyncRecord {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string;
  voteAverage: number;
  voteCount: number;
  genreIds: number[];
  popularity: number;
  syncedAt: number;
  updatedAt: number;
}

// ─── Fetch from multiple TMDB endpoints ───────────────────────────────────────
async function fetchAllTmdbItems(): Promise<TmdbItem[]> {
  const endpoints: Array<{ path: string; mediaType?: string }> = [
    { path: "/trending/movie/week" },
    { path: "/trending/tv/week" },
    { path: "/movie/now_playing" },
    { path: "/movie/upcoming" },
    { path: "/movie/popular" },
    { path: "/movie/top_rated" },
    { path: "/tv/on_the_air" },
    { path: "/tv/airing_today" },
    { path: "/tv/popular" },
    { path: "/tv/top_rated" },
  ];

  const results = await Promise.allSettled(
    endpoints.map(({ path }) =>
      tmdbFetch(path, { language: "id-ID", page: "1" })
    )
  );

  const items: TmdbItem[] = [];
  const seen = new Set<string>();

  results.forEach((r, i) => {
    if (r.status === "rejected") {
      logger.warn({ err: r.reason }, `TMDB endpoint failed: ${endpoints[i]!.path}`);
      return;
    }
    const mediaType = endpoints[i]!.path.includes("/tv/") || endpoints[i]!.path.includes("tv/")
      ? "tv"
      : "movie";
    for (const item of r.value.results ?? []) {
      const finalMedia = (item.media_type as string) || mediaType;
      if (finalMedia !== "movie" && finalMedia !== "tv") continue;
      const key = `${finalMedia}:${item.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ ...item, media_type: finalMedia });
    }
  });

  return items;
}

// ─── Main sync function ───────────────────────────────────────────────────────
export async function runTmdbSync(): Promise<{ added: number; updated: number; total: number }> {
  logger.info("TMDB sync started");
  const startedAt = Date.now();

  // Load existing synced records (keyed by "movie:123" or "tv:123")
  const existing = (await fbGet<Record<string, SyncRecord>>(SYNC_DB_PATH)) ?? {};

  // Build a lookup: `${mediaType}:${tmdbId}` → firebase push key
  const keyByCombo: Record<string, string> = {};
  for (const [fbKey, rec] of Object.entries(existing)) {
    keyByCombo[`${rec.mediaType}:${rec.tmdbId}`] = fbKey;
  }

  const items = await fetchAllTmdbItems();

  let added = 0;
  let updated = 0;

  // Write in small batches to avoid hammering Firebase
  const batchSize = 20;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (item) => {
        const mediaType = (item.media_type === "tv" ? "tv" : "movie") as "movie" | "tv";
        const comboKey = `${mediaType}:${item.id}`;
        const existingFbKey = keyByCombo[comboKey];

        const record: SyncRecord = {
          tmdbId: item.id,
          mediaType,
          title: item.title ?? item.name ?? "",
          overview: item.overview ?? "",
          posterPath: item.poster_path ?? null,
          backdropPath: item.backdrop_path ?? null,
          releaseDate: item.release_date ?? item.first_air_date ?? "",
          voteAverage: item.vote_average ?? 0,
          voteCount: item.vote_count ?? 0,
          genreIds: item.genre_ids ?? [],
          popularity: item.popularity ?? 0,
          syncedAt: existingFbKey ? (existing[existingFbKey]?.syncedAt ?? startedAt) : startedAt,
          updatedAt: startedAt,
        };

        if (existingFbKey) {
          await fbUpdate<SyncRecord>(`${SYNC_DB_PATH}/${existingFbKey}`, {
            title: record.title,
            overview: record.overview,
            posterPath: record.posterPath,
            backdropPath: record.backdropPath,
            releaseDate: record.releaseDate,
            voteAverage: record.voteAverage,
            voteCount: record.voteCount,
            genreIds: record.genreIds,
            popularity: record.popularity,
            updatedAt: record.updatedAt,
          });
          updated++;
        } else {
          // Use tmdbId as the key for easy dedup lookup next time
          await fbSet<SyncRecord>(`${SYNC_DB_PATH}/${mediaType}_${item.id}`, record);
          added++;
        }
      })
    );
  }

  const finishedAt = Date.now();
  const duration = finishedAt - startedAt;

  // Save sync status
  await fbSet(STATUS_DB_PATH, {
    lastSyncAt: finishedAt,
    lastSyncDurationMs: duration,
    lastSyncAdded: added,
    lastSyncUpdated: updated,
    lastSyncTotal: items.length,
    status: "ok",
  });

  logger.info({ added, updated, total: items.length, duration }, "TMDB sync complete");
  return { added, updated, total: items.length };
}

// ─── Scheduler ────────────────────────────────────────────────────────────────
let schedulerStarted = false;

export function startSyncScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  // Run once on boot (after 10s delay so server fully starts)
  setTimeout(() => {
    runTmdbSync().catch((e: unknown) => logger.error({ err: e }, "Initial TMDB sync failed"));
  }, 10_000);

  // Then every 6 hours
  setInterval(() => {
    runTmdbSync().catch((e: unknown) => logger.error({ err: e }, "Scheduled TMDB sync failed"));
  }, SYNC_INTERVAL_MS);

  logger.info(`TMDB sync scheduler started — interval ${SYNC_INTERVAL_MS / 3_600_000}h`);
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/sync/status — lihat status sync terakhir (public)
router.get("/sync/status", async (_req, res) => {
  try {
    const status = await fbGet(STATUS_DB_PATH);
    res.json(status ?? { status: "never_synced" });
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

// GET /api/sync/data — ambil semua film yang sudah di-sync (public)
router.get("/sync/data", async (req, res) => {
  try {
    const { type, limit: limitStr = "100" } = req.query as Record<string, string>;
    const limit = Math.min(Number(limitStr) || 100, 500);
    const raw = (await fbGet<Record<string, SyncRecord>>(SYNC_DB_PATH)) ?? {};
    let items = Object.values(raw);
    if (type === "movie" || type === "tv") {
      items = items.filter((i) => i.mediaType === type);
    }
    // Sort by updatedAt desc
    items.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    res.json({ total: items.length, results: items.slice(0, limit) });
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

// POST /api/sync/run — trigger sync manual (butuh auth)
router.post("/sync/run", requireAuth, async (_req, res) => {
  try {
    logger.info("Manual TMDB sync triggered via API");
    // Non-blocking: respond immediately, sync runs in background
    runTmdbSync().catch((e: unknown) => logger.error({ err: e }, "Manual TMDB sync error"));
    res.json({ message: "Sync dimulai di background. Pantau di GET /api/sync/status" });
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

// POST /api/sync/run-now — sync langsung (await, butuh auth) — untuk testing
router.post("/sync/run-now", requireAuth, async (_req, res) => {
  try {
    logger.info("Blocking TMDB sync triggered via API");
    const result = await runTmdbSync();
    res.json({ message: "Sync selesai", ...result });
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
