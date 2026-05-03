import { Router } from "express";

const router = Router();
const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";

async function tmdb(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", TMDB_KEY ?? "");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB ${path} failed: ${res.status}`);
  return res.json();
}

router.get("/tmdb/trending", async (req, res) => {
  try {
    const { media_type = "all", time_window = "week", page = "1" } = req.query as Record<string, string>;
    const data = await tmdb(`/trending/${media_type}/${time_window}`, { page });
    res.json(data);
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/tmdb/popular/movies", async (req, res) => {
  try {
    const { page = "1", language = "en-US" } = req.query as Record<string, string>;
    const data = await tmdb("/movie/popular", { page, language });
    res.json(data);
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/tmdb/popular/tv", async (req, res) => {
  try {
    const { page = "1", language = "en-US" } = req.query as Record<string, string>;
    const data = await tmdb("/tv/popular", { page, language });
    res.json(data);
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/tmdb/top-rated/movies", async (req, res) => {
  try {
    const { page = "1", language = "en-US" } = req.query as Record<string, string>;
    const data = await tmdb("/movie/top_rated", { page, language });
    res.json(data);
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/tmdb/top-rated/tv", async (req, res) => {
  try {
    const { page = "1", language = "en-US" } = req.query as Record<string, string>;
    const data = await tmdb("/tv/top_rated", { page, language });
    res.json(data);
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/tmdb/search", async (req, res) => {
  try {
    const { query = "", page = "1", language = "en-US" } = req.query as Record<string, string>;
    const data = await tmdb("/search/multi", { query, page, language });
    res.json(data);
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/tmdb/movie/:id", async (req, res) => {
  try {
    const data = await tmdb(`/movie/${req.params.id}`, {
      append_to_response: "credits,videos,similar",
      language: "en-US",
    });
    res.json(data);
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/tmdb/tv/:id", async (req, res) => {
  try {
    const data = await tmdb(`/tv/${req.params.id}`, {
      append_to_response: "credits,videos,similar",
      language: "en-US",
    });
    res.json(data);
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/tmdb/tv/:id/season/:season", async (req, res) => {
  try {
    const data = await tmdb(`/tv/${req.params.id}/season/${req.params.season}`, {
      language: "en-US",
    });
    res.json(data);
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/tmdb/find", async (req, res) => {
  try {
    const { imdb_id, tmdb_id, query, type = "movie" } = req.query as Record<string, string>;

    // Search by title query
    if (query) {
      const endpoint = type === "series" || type === "tv" ? "/search/tv" : "/search/movie";
      const data = await tmdb(endpoint, { query, page: "1", include_adult: "false", language: "id-ID" });
      const result = data.results?.[0] ?? null;
      if (!result) { res.status(404).json({ error: "Tidak ditemukan di TMDB" }); return; }
      const mediaType = type === "series" || type === "tv" ? "tv" : "movie";
      const detail = await tmdb(`/${mediaType}/${result.id}`, { language: "id-ID", append_to_response: "credits,similar" });
      res.json({ ...detail, media_type: mediaType });
      return;
    }

    // Search by IMDB ID
    if (imdb_id) {
      const data = await tmdb("/find/" + imdb_id, { external_source: "imdb_id" });
      const movie = data.movie_results?.[0];
      const tv = data.tv_results?.[0];
      const result = movie ?? tv ?? null;
      if (!result) { res.status(404).json({ error: "Not found" }); return; }
      const mediaType = movie ? "movie" : "tv";
      const detail = await tmdb(`/${mediaType}/${result.id}`, { language: "id-ID" });
      res.json({ ...detail, media_type: mediaType });
      return;
    }

    // Search by TMDB ID
    if (tmdb_id) {
      const mediaType = type === "series" || type === "tv" ? "tv" : "movie";
      try {
        const data = await tmdb(`/${mediaType}/${tmdb_id}`, { language: "id-ID", append_to_response: "credits" });
        res.json({ ...data, media_type: mediaType });
      } catch {
        const fallback = mediaType === "movie" ? "tv" : "movie";
        const data = await tmdb(`/${fallback}/${tmdb_id}`, { language: "id-ID" });
        res.json({ ...data, media_type: fallback });
      }
      return;
    }

    res.status(400).json({ error: "Berikan query, imdb_id, atau tmdb_id" });
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/tmdb/genres/movies", async (req, res) => {
  try {
    const data = await tmdb("/genre/movie/list", { language: "en-US" });
    res.json(data);
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/tmdb/genres/tv", async (req, res) => {
  try {
    const data = await tmdb("/genre/tv/list", { language: "en-US" });
    res.json(data);
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/tmdb/genre/:genre_id/movies", async (req, res) => {
  try {
    const { page = "1" } = req.query as Record<string, string>;
    const data = await tmdb("/discover/movie", {
      with_genres: req.params.genre_id,
      page,
      language: "en-US",
    });
    res.json(data);
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
