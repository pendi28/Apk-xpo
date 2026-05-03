import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fb, hashPassword } from "@/lib/firebase";
import { tmdb } from "@/lib/tmdb";
import { getToken, setToken, clearToken } from "@/lib/auth";
import type {
  Settings, Ad, Embed, CustomMovie, SeriesEpisode,
  CustomServer, BuiltinServerState,
  TmdbListItem, TmdbFindResult, TmdbTvShow,
} from "@/lib/types";
import {
  LogOut, Plus, Trash2, Eye, EyeOff, Save, Lock, Tv,
  Pencil, Search, Check, X, Loader2, ListVideo, Film,
  LayoutList, Server, Palette, MessageSquare, Phone,
  Megaphone, ChevronRight, Link2, AlignJustify, Smartphone,
  ExternalLink, Github, Package, RefreshCw, CheckCircle2,
} from "lucide-react";

const IMG = "https://image.tmdb.org/t/p";

/* ── helpers ─────────────────────────────────────────────── */
const inp = "w-full bg-[#1e2535] border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-gray-600";
const yaBtn = "bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-lg px-4 py-2.5 text-sm transition-colors disabled:opacity-50";
const card = "bg-[#161b27] border border-white/[0.08] rounded-xl";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-yellow-400 text-xs font-bold mb-1.5 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

/* ── BUILTIN SERVERS ─────────────────────────────────────── */
const BUILTIN = [
  { id: "myvercel",  name: "Server Utama (No Ads)", desc: "Server bawaan (myvercel)",  url: "https://myvercel-player.vercel.app/embed/{type}/{id}" },
  { id: "vidking",   name: "ZxcStream",             desc: "Server bawaan (vidking)",   url: "https://vidking.xyz/embed/{type}/{id}" },
  { id: "vidsrc",    name: "VidSrc",                desc: "Server bawaan (vidsrc)",    url: "https://vidsrc.to/embed/{type}/{id}" },
  { id: "vidsrcxyz", name: "VidSrc.xyz",            desc: "Server bawaan (vidsrcxyz)", url: "https://vidsrc.xyz/embed/{type}/{id}" },
];
const DEFAULT_EMBED_URL = BUILTIN[0]?.url ?? "https://myvercel-player.vercel.app/embed/{type}/{id}";

type NavTab = "daftar" | "tambah" | "server" | "tema" | "build" | "kontak";

/* ══════════════════════════════════════════════════════════ */
/*  LOGIN                                                     */
/* ══════════════════════════════════════════════════════════ */
function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [pw, setPw]       = useState("");
  const [err, setErr]     = useState("");
  const [loading, setLd]  = useState(false);
  const [show, setShow]   = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setLd(true);
    try {
      const hash = await hashPassword(pw);
      const stored = await fb.getPasswordHash();
      if (!stored || hash !== stored) throw new Error();
      setToken(hash); onLogin();
    } catch { setErr("Password salah."); }
    finally { setLd(false); }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center px-4">
      <div className={`${card} w-full max-w-sm p-8`}>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center">
            <Tv className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-white font-black text-lg">XpoGo Admin</h1>
            <p className="text-gray-500 text-xs">Streaming Management</p>
          </div>
        </div>
        <form onSubmit={handle} className="space-y-4">
          <Field label="Password Admin">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type={show ? "text" : "password"} value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Masukkan password" autoFocus
                className={`${inp} pl-10 pr-10`}
              />
              <button type="button" onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {err && <p className="text-red-400 text-xs mt-1">{err}</p>}
          </Field>
          <button type="submit" disabled={loading} className={`${yaBtn} w-full`}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  TAMBAH TAB – search by title / ID / trending             */
/* ══════════════════════════════════════════════════════════ */
type AddSubTab = "cari" | "id" | "pilihan";
type TmdbItem = TmdbListItem & { imdb_id?: string };

type FilmForm = {
  title: string; description: string; posterUrl: string; backdropUrl: string;
  year: string; embedUrl: string; type: "movie" | "series"; tmdbId: string; imdbId: string;
};
const emptyFilm: FilmForm = {
  title: "", description: "", posterUrl: "", backdropUrl: "",
  year: "", embedUrl: "", type: "movie", tmdbId: "", imdbId: "",
};

function TambahTab() {
  const qc = useQueryClient();
  const [sub, setSub]         = useState<AddSubTab>("cari");
  const [mediaType, setMt]    = useState<"movie" | "tv">("movie");
  const [q, setQ]             = useState("");
  const [results, setResults] = useState<TmdbItem[]>([]);
  const [loading, setLd]      = useState(false);
  const [selected, setSel]    = useState<TmdbItem | null>(null);
  const [form, setForm]       = useState<FilmForm>({ ...emptyFilm });
  const [idInput, setIdInput] = useState("");
  const [saved, setSaved]     = useState(false);
  const formRef               = useRef<HTMLDivElement>(null);

  const applyItem = (item: TmdbItem) => {
    setSel(item);
    setForm({
      title:       item.title ?? item.name ?? "",
      description: item.overview ?? "",
      posterUrl:   item.poster_path   ? `${IMG}/w500${item.poster_path}`       : "",
      backdropUrl: item.backdrop_path ? `${IMG}/original${item.backdrop_path}` : "",
      year:        (item.release_date ?? item.first_air_date ?? "").slice(0, 4),
      type:        item.media_type === "tv" ? "series" : "movie",
      tmdbId:      String(item.id),
      imdbId:      item.imdb_id ?? "",
      embedUrl:    DEFAULT_EMBED_URL,
    });
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  const doSearch = async () => {
    if (!q.trim()) return;
    setLd(true); setResults([]); setSel(null);
    try {
      const res = await tmdb.search(q.trim());
      const filtered = res.results.filter((r) =>
        mediaType === "movie" ? r.media_type === "movie" : r.media_type === "tv"
      );
      setResults(filtered.slice(0, 12));
    } catch { /* ignore */ }
    finally { setLd(false); }
  };

  const doFetchId = async () => {
    if (!idInput.trim()) return;
    setLd(true); setSel(null);
    try {
      const isImdb = idInput.trim().toLowerCase().startsWith("tt");
      let item: TmdbItem;
      if (isImdb) {
        const res: TmdbFindResult = await tmdb.findByImdb(idInput.trim());
        const raw = res.movie_results[0] ?? res.tv_results[0];
        if (!raw) throw new Error();
        item = { ...raw, media_type: res.movie_results[0] ? "movie" : "tv", imdb_id: idInput.trim() };
      } else {
        const num = Number(idInput.trim());
        const res = mediaType === "tv" ? await tmdb.tvDetail(num) : await tmdb.movieDetail(num);
        item = {
          id: res.id,
          title: "title" in res ? res.title : undefined,
          name:  "name"  in res ? res.name  : undefined,
          overview: res.overview,
          poster_path: res.poster_path,
          backdrop_path: res.backdrop_path,
          release_date:   "release_date"    in res ? res.release_date    : undefined,
          first_air_date: "first_air_date"  in res ? res.first_air_date  : undefined,
          media_type: mediaType === "tv" ? "tv" : "movie",
          imdb_id: "imdb_id" in res ? (res as { imdb_id?: string }).imdb_id : undefined,
        };
      }
      applyItem(item);
    } catch { alert("Tidak ditemukan. Cek ID-nya."); }
    finally { setLd(false); }
  };

  const { data: trending = [] } = useQuery<TmdbItem[]>({
    queryKey: ["trending_all"],
    queryFn: async () => {
      const r = await tmdb.trending("all", "week");
      return r.results.slice(0, 18);
    },
    staleTime: 1000 * 60 * 10,
  });

  const save = useMutation({
    mutationFn: () => fb.addCustomMovie({
      title: form.title, description: form.description || undefined,
      posterUrl: form.posterUrl || undefined, backdropUrl: form.backdropUrl || undefined,
      year: form.year ? Number(form.year) : undefined, embedUrl: form.embedUrl?.trim() || DEFAULT_EMBED_URL,
      type: form.type, tmdbId: form.tmdbId ? Number(form.tmdbId) : undefined,
      imdbId: form.imdbId || undefined,
    }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["custom_movies"] });
      qc.invalidateQueries({ queryKey: ["custom_movies"] });
      setForm({ ...emptyFilm }); setSel(null); setResults([]);
      setQ(""); setIdInput(""); setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  return (
    <div className="pb-4">
      <h2 className="text-yellow-400 text-xl font-black mb-4">Tambah Film / Series</h2>

      {/* Sub-tabs */}
      <div className="flex bg-[#161b27] rounded-xl p-1 mb-5 border border-white/[0.08]">
        {(["cari", "id", "pilihan"] as AddSubTab[]).map((t) => (
          <button key={t} onClick={() => { setSub(t); setSel(null); setResults([]); }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors capitalize ${sub === t ? "bg-yellow-400 text-black" : "text-gray-400 hover:text-white"}`}>
            {t === "cari" ? "Cari" : t === "id" ? "ID Manual" : "Pilihan"}
          </button>
        ))}
      </div>

      {/* CARI */}
      {sub === "cari" && (
        <div>
          <div className="flex gap-2 mb-4">
            <select value={mediaType} onChange={(e) => setMt(e.target.value as "movie" | "tv")}
              className="bg-[#1e2535] border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500 flex-shrink-0">
              <option value="movie">Film</option>
              <option value="tv">Series</option>
            </select>
            <input value={q} onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              placeholder="Judul film/series..." className={`${inp} flex-1`} />
            <button onClick={doSearch} disabled={loading}
              className={`${yaBtn} flex-shrink-0 flex items-center gap-1.5`}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Cari
            </button>
          </div>
          {results.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-5">
              {results.map((r) => (
                <button key={r.id} onClick={() => applyItem(r)}
                  className={`text-left rounded-xl overflow-hidden border-2 transition-all ${selected?.id === r.id ? "border-yellow-400" : "border-transparent"}`}>
                  <div className="aspect-[2/3] bg-[#1e2535]">
                    {r.poster_path
                      ? <img src={`${IMG}/w185${r.poster_path}`} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><Film className="w-6 h-6 text-gray-700" /></div>
                    }
                  </div>
                  <div className="p-1.5">
                    <p className="text-white text-xs font-semibold truncate leading-tight">{r.title ?? r.name}</p>
                    <p className="text-gray-500 text-[10px]">{(r.release_date ?? r.first_air_date ?? "").slice(0,4)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ID MANUAL */}
      {sub === "id" && (
        <div className="mb-5">
          <div className="flex gap-2 mb-3">
            <select value={mediaType} onChange={(e) => setMt(e.target.value as "movie" | "tv")}
              className="bg-[#1e2535] border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500 flex-shrink-0">
              <option value="movie">Film</option>
              <option value="tv">Series</option>
            </select>
            <input value={idInput} onChange={(e) => setIdInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doFetchId()}
              placeholder="TMDB ID (mis: 550) atau IMDB ID (mis: tt0137523)"
              className={`${inp} flex-1`} />
            <button onClick={doFetchId} disabled={loading}
              className={`${yaBtn} flex-shrink-0 flex items-center gap-1.5`}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Fetch
            </button>
          </div>
          <p className="text-gray-600 text-xs">Masukkan TMDB ID (angka) atau IMDB ID (tt…)</p>
        </div>
      )}

      {/* PILIHAN – trending */}
      {sub === "pilihan" && (
        <div className="mb-5">
          <p className="text-gray-500 text-xs mb-3">Trending minggu ini — klik untuk tambah</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {trending.map((r) => (
              <button key={r.id} onClick={() => applyItem(r)}
                className={`text-left rounded-xl overflow-hidden border-2 transition-all ${selected?.id === r.id ? "border-yellow-400" : "border-transparent"}`}>
                <div className="aspect-[2/3] bg-[#1e2535]">
                  {r.poster_path
                    ? <img src={`${IMG}/w185${r.poster_path}`} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><Film className="w-6 h-6 text-gray-700" /></div>
                  }
                </div>
                <div className="p-1.5">
                  <p className="text-white text-xs font-semibold truncate">{r.title ?? r.name}</p>
                  <p className="text-gray-500 text-[10px]">{r.media_type === "tv" ? "Series" : "Film"}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ADD FORM (appears when item selected) */}
      {selected && (
        <div ref={formRef} className={`${card} p-5 mt-2`}>
          <div className="flex items-start gap-4 mb-5">
            {selected.poster_path && (
              <img src={`${IMG}/w154${selected.poster_path}`} alt=""
                className="w-16 rounded-lg object-cover flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-yellow-400 text-black text-[10px] font-black px-2 py-0.5 rounded uppercase">
                  {selected.media_type === "tv" ? "Series" : "Film"}
                </span>
                <span className="text-gray-500 text-xs">{(selected.release_date ?? selected.first_air_date ?? "").slice(0,4)}</span>
              </div>
              <p className="text-white font-bold text-base leading-tight">{selected.title ?? selected.name}</p>
              <p className="text-gray-500 text-xs mt-1 line-clamp-2">{selected.overview}</p>
            </div>
            <button onClick={() => { setSel(null); setForm({ ...emptyFilm }); }} className="text-gray-500 hover:text-white flex-shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Judul">
                <input className={inp} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </Field>
              <Field label="Tipe">
                <select className={inp} value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as "movie" | "series" })}>
                  <option value="movie">Movie</option>
                  <option value="series">Series / TV</option>
                </select>
              </Field>
              <Field label="TMDB ID">
                <input className={inp} value={form.tmdbId} readOnly />
              </Field>
              <Field label="IMDB ID">
                <input className={inp} value={form.imdbId}
                  onChange={(e) => setForm({ ...form, imdbId: e.target.value })}
                  placeholder="tt1234567" />
              </Field>
            </div>
            {saved && (
              <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                <Check className="w-4 h-4" /> Berhasil disimpan!
              </div>
            )}
            <button onClick={() => { if (!form.title) { alert("Judul wajib diisi!"); return; } save.mutate(); }}
              disabled={save.isPending}
              className={`${yaBtn} w-full flex items-center justify-center gap-2`}>
              {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {save.isPending ? "Menyimpan..." : "Simpan ke Daftar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  DAFTAR TAB                                               */
/* ══════════════════════════════════════════════════════════ */
type DaftarSub = "film" | "episode";

function DaftarTab() {
  const qc = useQueryClient();
  const [sub, setSub]     = useState<DaftarSub>("film");
  const [editId, setEdit] = useState<string | null>(null);
  const [form, setForm]   = useState<{ embedUrl: string; title: string }>({ embedUrl: "", title: "" });
  const [epFilter, setEpFilter] = useState("");

  const { data: movies = [], isLoading: ldM } = useQuery<CustomMovie[]>({
    queryKey: ["custom_movies"], queryFn: fb.getCustomMovies,
  });
  const { data: episodes = [], isLoading: ldE } = useQuery<SeriesEpisode[]>({
    queryKey: ["series_episodes"], queryFn: fb.getSeriesEpisodes,
  });

  const delMovie = useMutation({
    mutationFn: (id: string) => fb.deleteCustomMovie(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["custom_movies"] });
      await qc.refetchQueries({ queryKey: ["custom_movies"] });
    },
  });
  const updMovie = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CustomMovie> }) => fb.updateCustomMovie(id, data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["custom_movies"] });
      await qc.refetchQueries({ queryKey: ["custom_movies"] });
      setEdit(null);
    },
  });
  const delEp = useMutation({
    mutationFn: (id: string) => fb.deleteSeriesEpisode(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["series_episodes"] }),
  });
  const toggleEp = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => fb.updateSeriesEpisode(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["series_episodes"] }),
  });

  const grouped = episodes.reduce<Record<string, SeriesEpisode[]>>((acc, ep) => {
    const k = `${ep.tmdbId}`;
    if (!acc[k]) acc[k] = [];
    acc[k].push(ep);
    return acc;
  }, {});

  return (
    <div className="pb-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-yellow-400 text-xl font-black">Daftar Konten</h2>
        <span className="text-gray-500 text-sm">{movies.length} film · {episodes.length} episode</span>
      </div>

      <div className="flex bg-[#161b27] rounded-xl p-1 mb-5 border border-white/[0.08]">
        <button onClick={() => setSub("film")}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${sub === "film" ? "bg-yellow-400 text-black" : "text-gray-400 hover:text-white"}`}>
          Film / Series
        </button>
        <button onClick={() => setSub("episode")}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${sub === "episode" ? "bg-yellow-400 text-black" : "text-gray-400 hover:text-white"}`}>
          Episodes
        </button>
      </div>

      {sub === "film" && (
        ldM ? <div className="text-gray-500 text-sm">Loading...</div>
        : movies.length === 0 ? (
          <div className="text-center py-16 text-gray-700">
            <Film className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Belum ada film. Tambah lewat tab TAMBAH.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {movies.map((m) => (
              <div key={m.id} className={`${card} overflow-hidden group`}>
                <div className="aspect-[2/3] bg-[#1e2535] relative">
                  {m.posterUrl
                    ? <img src={m.posterUrl} alt={m.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><Film className="w-8 h-8 text-gray-700" /></div>
                  }
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button onClick={() => { setEdit(m.id); setForm({ embedUrl: m.embedUrl, title: m.title }); }}
                      className="bg-yellow-400 hover:bg-yellow-300 text-black rounded-full w-8 h-8 flex items-center justify-center">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => { if (confirm("Hapus film ini?")) delMovie.mutate(m.id); }}
                      className="bg-red-600 hover:bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-white text-xs font-semibold truncate">{m.title}</p>
                  <p className="text-gray-600 text-[10px]">{m.year ?? "—"} · {m.type}</p>
                </div>
                {editId === m.id && (
                  <div className="p-3 border-t border-white/10 space-y-2">
                    <input className={`${inp} text-xs`} value={form.embedUrl}
                      onChange={(e) => setForm({ ...form, embedUrl: e.target.value })}
                      placeholder="URL Embed baru" />
                    <div className="flex gap-2">
                      <button onClick={() => updMovie.mutate({ id: m.id, data: { embedUrl: form.embedUrl } })}
                        className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-bold py-1.5 rounded-lg">
                        {updMovie.isPending ? "..." : "Simpan"}
                      </button>
                      <button onClick={() => setEdit(null)} className="text-gray-500 hover:text-white text-xs px-2">Batal</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {sub === "episode" && (
        <div>
          <input value={epFilter} onChange={(e) => setEpFilter(e.target.value)}
            placeholder="Cari nama series..." className={`${inp} mb-4 max-w-xs`} />
          {ldE ? <div className="text-gray-500 text-sm">Loading...</div>
          : episodes.length === 0 ? (
            <div className="text-center py-16 text-gray-700">
              <ListVideo className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Belum ada episode. Tambah lewat tab SERVER.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped)
                .filter(([, eps]) => !epFilter || eps[0]?.seriesTitle?.toLowerCase().includes(epFilter.toLowerCase()))
                .map(([tmdbId, eps]) => {
                  const sorted = [...eps].sort((a, b) => a.season - b.season || a.episode - b.episode);
                  const first = sorted[0];
                  return (
                    <div key={tmdbId} className={`${card} overflow-hidden`}>
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.08] bg-white/[0.03]">
                        {first.posterPath && <img src={`${IMG}/w92${first.posterPath}`} alt="" className="w-8 h-12 rounded object-cover flex-shrink-0" />}
                        <div>
                          <p className="text-white font-bold text-sm">{first.seriesTitle}</p>
                          <p className="text-gray-500 text-xs">TMDB {tmdbId} · {sorted.length} episode</p>
                        </div>
                      </div>
                      <div className="divide-y divide-white/[0.05]">
                        {sorted.map((ep) => (
                          <div key={ep.id} className={`flex items-center gap-3 px-4 py-2.5 ${!ep.active ? "opacity-40" : ""}`}>
                            <span className="text-yellow-400 text-xs font-mono w-14 flex-shrink-0">
                              S{String(ep.season).padStart(2,"0")}E{String(ep.episode).padStart(2,"0")}
                            </span>
                            <p className="text-gray-400 text-xs flex-1 truncate">{ep.url}</p>
                            {ep.sub && <span className="text-blue-400 text-xs flex-shrink-0">{ep.sub}</span>}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button onClick={() => toggleEp.mutate({ id: ep.id, active: !ep.active })} className="text-gray-500 hover:text-white p-1">
                                {ep.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                              </button>
                              <button onClick={() => { if (confirm("Hapus episode?")) delEp.mutate(ep.id); }}
                                className="text-red-500 hover:text-red-400 p-1">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  SERVER TAB                                               */
/* ══════════════════════════════════════════════════════════ */
const VARS = ["{id}", "{type}", "{s}", "{e}", "{imdb}", "+sub"];

function ServerTab() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen]   = useState(false);
  const [srvName, setSrvName]   = useState("");
  const [srvUrl, setSrvUrl]     = useState("");

  const { data: builtinStates = {} } = useQuery<BuiltinServerState>({
    queryKey: ["builtin_states"],
    queryFn: async () => (await fb.getBuiltinServerStates()) ?? {},
  });
  const { data: customSrvs = [] } = useQuery<CustomServer[]>({
    queryKey: ["custom_servers"], queryFn: fb.getCustomServers,
  });
  const { data: ads = [] } = useQuery<Ad[]>({ queryKey: ["ads"], queryFn: fb.getAds });

  const toggleBuiltin = useMutation({
    mutationFn: ({ id, val }: { id: string; val: boolean }) => fb.setBuiltinServerState(id, val),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["builtin_states"] }),
  });
  const addSrv = useMutation({
    mutationFn: () => fb.addCustomServer({ name: srvName, url: srvUrl, active: true, createdAt: Date.now() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["custom_servers"] }); setSrvName(""); setSrvUrl(""); setAddOpen(false); },
  });
  const delSrv = useMutation({
    mutationFn: (id: string) => fb.deleteCustomServer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom_servers"] }),
  });
  const toggleSrv = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => fb.updateCustomServer(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom_servers"] }),
  });
  const toggleAd = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => fb.updateAd(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ads"] }),
  });
  const delAd = useMutation({
    mutationFn: (id: string) => fb.deleteAd(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ads"] }),
  });

  const insertVar = (v: string) => {
    if (v === "+sub") { setSrvUrl((u) => u + (u.includes("?") ? "&" : "?") + "sub=true"); return; }
    setSrvUrl((u) => u + v);
  };

  return (
    <div className="pb-4 space-y-6">
      <h2 className="text-yellow-400 text-xl font-black">Server Player</h2>

      {/* Placeholder info */}
      <div className={`${card} p-4 text-xs text-gray-400 leading-relaxed`}>
        <p className="mb-1 font-semibold text-white">Placeholder URL custom:</p>
        <p><span className="text-yellow-400">{"{id}"}</span>=TMDB ID, <span className="text-yellow-400">{"{type}"}</span>=movie/tv, <span className="text-yellow-400">{"{s}"}</span>=season, <span className="text-yellow-400">{"{e}"}</span>=episode, <span className="text-yellow-400">{"{imdb}"}</span>=IMDB ID.</p>
        <p className="mt-1 text-blue-400 break-all">Contoh: https://contoh.com/embed/{"{type}"}/{"{id}"}?s={"{s}"}&e={"{e}"}</p>
      </div>

      {/* Built-in servers */}
      <div className="space-y-2">
        {BUILTIN.map((s) => {
          const active = builtinStates[s.id] !== false;
          return (
            <div key={s.id} className={`${card} flex items-center gap-3 px-4 py-3`}>
              <AlignJustify className="w-4 h-4 text-gray-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white font-bold text-sm">{s.name}</p>
                  <span className="bg-yellow-400/20 text-yellow-400 text-[10px] font-black px-1.5 py-0.5 rounded">BAWAAN</span>
                </div>
                <p className="text-gray-500 text-xs truncate">{s.desc}</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                <span className="text-gray-400 text-xs">Aktif</span>
                <button type="button" onClick={() => toggleBuiltin.mutate({ id: s.id, val: !active })}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${active ? "bg-yellow-400" : "bg-gray-700"}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${active ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </label>
            </div>
          );
        })}

        {/* Custom servers */}
        {customSrvs.map((s) => (
          <div key={s.id} className={`${card} flex items-center gap-3 px-4 py-3`}>
            <AlignJustify className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white font-bold text-sm">{s.name}</p>
                <span className="bg-blue-500/20 text-blue-400 text-[10px] font-black px-1.5 py-0.5 rounded">CUSTOM</span>
              </div>
              <p className="text-gray-500 text-xs truncate">{s.url}</p>
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0">
              <span className="text-gray-400 text-xs">Aktif</span>
              <button type="button" onClick={() => toggleSrv.mutate({ id: s.id, active: !s.active })}
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${s.active ? "bg-yellow-400" : "bg-gray-700"}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${s.active ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </label>
            <button onClick={() => { if (confirm("Hapus server ini?")) delSrv.mutate(s.id); }}
              className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0 flex items-center gap-1">
              <X className="w-3 h-3" /> Hapus
            </button>
          </div>
        ))}
      </div>

      {/* Add custom server */}
      {!addOpen ? (
        <button onClick={() => setAddOpen(true)}
          className="w-full text-yellow-400 border-2 border-dashed border-yellow-400/30 hover:border-yellow-400/60 rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors">
          <Plus className="w-4 h-4" /> Tambah Server Custom
        </button>
      ) : (
        <div className={`${card} p-5 space-y-4`}>
          <div className="flex items-center justify-between">
            <p className="text-yellow-400 font-bold">+ Tambah Server Custom</p>
            <button onClick={() => setAddOpen(false)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <Field label="Nama Server">
            <input className={inp} value={srvName} onChange={(e) => setSrvName(e.target.value)} placeholder="mis. MyServer" />
          </Field>
          <Field label="URL Template">
            <input className={inp} value={srvUrl} onChange={(e) => setSrvUrl(e.target.value)}
              placeholder="https://example.com/embed/{type}/{id}" />
            <div className="flex flex-wrap gap-2 mt-2">
              {VARS.map((v) => (
                <button key={v} type="button" onClick={() => insertVar(v)}
                  className="bg-[#1e2535] hover:bg-yellow-400/10 border border-white/10 hover:border-yellow-400/40 text-yellow-400 text-xs font-mono px-2 py-1 rounded-lg transition-colors">
                  {v}
                </button>
              ))}
            </div>
          </Field>
          <button onClick={() => { if (!srvName || !srvUrl) return; addSrv.mutate(); }}
            disabled={addSrv.isPending || !srvName || !srvUrl}
            className={`${yaBtn} flex items-center gap-2`}>
            {addSrv.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Simpan Server
          </button>
        </div>
      )}

      {/* Ads section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-white font-bold flex items-center gap-2"><Megaphone className="w-4 h-4 text-yellow-400" /> Manajemen Iklan</p>
        </div>
        {ads.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-6">Belum ada iklan. Tambah di tab TEMA.</p>
        ) : (
          <div className="space-y-2">
            {ads.map((ad) => (
              <div key={ad.id} className={`${card} flex items-center gap-3 px-4 py-3 ${!ad.active ? "opacity-50" : ""}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{ad.label}</p>
                  <p className="text-gray-600 text-xs">{ad.type}</p>
                </div>
                <div onClick={() => toggleAd.mutate({ id: ad.id, active: !ad.active })}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${ad.active ? "bg-yellow-400" : "bg-gray-700"}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${ad.active ? "translate-x-5" : "translate-x-0.5"}`} />
                </div>
                <button onClick={() => { if (confirm("Hapus iklan?")) delAd.mutate(ad.id); }}
                  className="text-red-500 hover:text-red-400 p-1 flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  TEMA TAB                                                 */
/* ══════════════════════════════════════════════════════════ */
type SettingsForm = {
  siteTitle: string; playerColor: string; playerServer: string;
  playerDomainAd: string; posterSize: string; fontFamily: string; autoplay: boolean;
};

function TemaTab() {
  const qc = useQueryClient();
  const { data: settings } = useQuery<Settings | null>({ queryKey: ["settings"], queryFn: fb.getSettings });
  const [form, setForm] = useState<SettingsForm>({
    siteTitle: "XpoGo", playerColor: "E50914", playerServer: "1",
    playerDomainAd: "", posterSize: "medium", fontFamily: "Inter, sans-serif", autoplay: true,
  });
  const [saved, setSaved] = useState(false);

  /* Add ad */
  const [adOpen, setAdOpen] = useState(false);
  const [adForm, setAdForm] = useState<{ type: Ad["type"]; label: string; code: string }>({
    type: "banner-top", label: "", code: "",
  });
  const addAd = useMutation({
    mutationFn: () => fb.addAd({ ...adForm, active: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ads"] }); setAdForm({ type: "banner-top", label: "", code: "" }); setAdOpen(false); },
  });

  useEffect(() => {
    if (settings) setForm((f) => ({
      ...f,
      siteTitle:      settings.siteTitle      ?? f.siteTitle,
      playerColor:    settings.playerColor     ?? f.playerColor,
      playerServer:   settings.playerServer    ?? f.playerServer,
      playerDomainAd: settings.playerDomainAd  ?? f.playerDomainAd,
      posterSize:     settings.posterSize      ?? f.posterSize,
      fontFamily:     settings.fontFamily      ?? f.fontFamily,
      autoplay:       settings.autoplay !== "false",
    }));
  }, [settings]);

  const save = useMutation({
    mutationFn: (d: Settings) => fb.setSettings(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings"] }); setSaved(true); setTimeout(() => setSaved(false), 2000); },
  });

  return (
    <div className="pb-4 space-y-6">
      <h2 className="text-yellow-400 text-xl font-black">Tema & Pengaturan</h2>

      <div className={`${card} p-5 space-y-5`}>
        <Field label="Nama Situs">
          <input className={inp} value={form.siteTitle} onChange={(e) => setForm({ ...form, siteTitle: e.target.value })} />
        </Field>
        <Field label="Warna Aksen Player (hex tanpa #)">
          <div className="flex gap-3 items-center">
            <input className={`${inp} flex-1`} value={form.playerColor}
              onChange={(e) => setForm({ ...form, playerColor: e.target.value })} maxLength={6} placeholder="E50914" />
            <div className="w-10 h-10 rounded-lg border border-white/20 flex-shrink-0" style={{ background: `#${form.playerColor}` }} />
          </div>
        </Field>
        <Field label="Domain Iklan Player (opsional)">
          <input className={inp} value={form.playerDomainAd}
            onChange={(e) => setForm({ ...form, playerDomainAd: e.target.value })} placeholder="yourdomain.com" />
        </Field>
        <Field label="Ukuran Poster">
          <select className={inp} value={form.posterSize} onChange={(e) => setForm({ ...form, posterSize: e.target.value })}>
            <option value="sm">Kecil</option>
            <option value="medium">Sedang</option>
            <option value="lg">Besar</option>
          </select>
        </Field>
        <Field label="Font">
          <select className={inp} value={form.fontFamily} onChange={(e) => setForm({ ...form, fontFamily: e.target.value })}>
            <option value="Inter, sans-serif">Inter</option>
            <option value="Roboto, sans-serif">Roboto</option>
            <option value="Poppins, sans-serif">Poppins</option>
            <option value="Georgia, serif">Georgia</option>
          </select>
        </Field>
        <Field label="Autoplay">
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => setForm({ ...form, autoplay: !form.autoplay })}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${form.autoplay ? "bg-yellow-400" : "bg-gray-700"}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${form.autoplay ? "translate-x-7" : "translate-x-1"}`} />
            </div>
            <span className="text-gray-300 text-sm">{form.autoplay ? "Aktif" : "Nonaktif"}</span>
          </label>
        </Field>
        <button onClick={() => save.mutate({ ...form, autoplay: form.autoplay ? "true" : "false" })}
          disabled={save.isPending}
          className={`${yaBtn} flex items-center gap-2`}>
          <Save className="w-4 h-4" />
          {saved ? "Tersimpan!" : save.isPending ? "Menyimpan..." : "Simpan Pengaturan"}
        </button>
      </div>

      {/* Add ad form */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-white font-bold flex items-center gap-2"><Megaphone className="w-4 h-4 text-yellow-400" /> Tambah Iklan</p>
          <button onClick={() => setAdOpen(!adOpen)}
            className="text-yellow-400 text-sm font-bold flex items-center gap-1 hover:text-yellow-300">
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </div>
        {adOpen && (
          <div className={`${card} p-5 space-y-4`}>
            <Field label="Label">
              <input className={inp} value={adForm.label}
                onChange={(e) => setAdForm({ ...adForm, label: e.target.value })}
                placeholder="mis. Banner Atas 728x90" />
            </Field>
            <Field label="Jenis">
              <select className={inp} value={adForm.type}
                onChange={(e) => setAdForm({ ...adForm, type: e.target.value as Ad["type"] })}>
                <option value="banner-top">Banner Atas</option>
                <option value="banner-bottom">Banner Bawah</option>
                <option value="popunder">Popunder</option>
              </select>
            </Field>
            <Field label="Kode HTML / Script">
              <textarea className={`${inp} h-32 resize-y font-mono text-xs`} value={adForm.code}
                onChange={(e) => setAdForm({ ...adForm, code: e.target.value })}
                placeholder="<script>...</script>" />
            </Field>
            <div className="flex gap-3">
              <button onClick={() => { if (!adForm.label || !adForm.code) return; addAd.mutate(); }}
                disabled={addAd.isPending}
                className={`${yaBtn} flex items-center gap-2`}>
                {addAd.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Simpan Iklan
              </button>
              <button onClick={() => setAdOpen(false)} className="text-gray-500 hover:text-white text-sm">Batal</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  BUILD APK TAB                                            */
/* ══════════════════════════════════════════════════════════ */
function BuildTab() {
  const EAS_URL = "https://expo.dev/accounts/pendi55/projects/xpogo-mobile/builds";
  const GITHUB_ACTIONS_URL = "https://github.com/pendi28/Apk-xpo/actions";
  const GITHUB_REPO_URL = "https://github.com/pendi28/Apk-xpo";
  const GITHUB_SECRETS_URL = "https://github.com/pendi28/Apk-xpo/settings/secrets/actions";
  const EXPO_TOKEN_URL = "https://expo.dev/settings/access-tokens";

  const steps = [
    {
      num: "1",
      title: "Pastikan secrets GitHub sudah diset",
      desc: "Buka GitHub repo → Settings → Secrets → Actions. Tambahkan 3 secrets:",
      items: ["EXPO_TOKEN — dari expo.dev/settings/access-tokens", "TMDB_API_KEY — API key TMDB kamu", "FIREBASE_DB_SECRET — Firebase DB secret"],
      link: GITHUB_SECRETS_URL,
      linkLabel: "Buka GitHub Secrets",
    },
    {
      num: "2",
      title: "Connect GitHub di expo.dev",
      desc: "Buka project xpogo-mobile di expo.dev → tab GitHub → connect ke repo pendi28/Apk-xpo",
      link: EAS_URL,
      linkLabel: "Buka expo.dev Project",
    },
    {
      num: "3",
      title: "Trigger Build",
      desc: "Setelah connect, klik 'New Build' di expo.dev atau push code ke GitHub — GitHub Actions akan otomatis trigger EAS build.",
      link: EAS_URL,
      linkLabel: "Buka Halaman Build",
    },
    {
      num: "4",
      title: "Download APK",
      desc: "Setelah build selesai (~5-10 menit), download APK langsung dari expo.dev.",
      link: EAS_URL,
      linkLabel: "Lihat Semua Build",
    },
  ];

  return (
    <div className="pb-8 space-y-5">
      <div>
        <h2 className="text-yellow-400 text-xl font-black mb-1">Build APK Android</h2>
        <p className="text-gray-500 text-sm">Build APK via EAS (Expo Application Services) terhubung ke GitHub repo</p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3">
        <a href={EAS_URL} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 bg-[#1e2535] hover:bg-[#252e42] border border-white/10 rounded-xl p-4 transition-colors group">
          <div className="w-10 h-10 bg-yellow-400/15 rounded-xl flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-bold">EAS Builds</p>
            <p className="text-gray-500 text-xs truncate">expo.dev</p>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-yellow-400 ml-auto flex-shrink-0 transition-colors" />
        </a>
        <a href={GITHUB_ACTIONS_URL} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 bg-[#1e2535] hover:bg-[#252e42] border border-white/10 rounded-xl p-4 transition-colors group">
          <div className="w-10 h-10 bg-purple-400/15 rounded-xl flex items-center justify-center flex-shrink-0">
            <RefreshCw className="w-5 h-5 text-purple-400" />
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-bold">GitHub Actions</p>
            <p className="text-gray-500 text-xs truncate">Auto build on push</p>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-purple-400 ml-auto flex-shrink-0 transition-colors" />
        </a>
        <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 bg-[#1e2535] hover:bg-[#252e42] border border-white/10 rounded-xl p-4 transition-colors group">
          <div className="w-10 h-10 bg-blue-400/15 rounded-xl flex items-center justify-center flex-shrink-0">
            <Github className="w-5 h-5 text-blue-400" />
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-bold">Repo APK</p>
            <p className="text-gray-500 text-xs truncate">pendi28/Apk-xpo</p>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-blue-400 ml-auto flex-shrink-0 transition-colors" />
        </a>
        <a href={EXPO_TOKEN_URL} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 bg-[#1e2535] hover:bg-[#252e42] border border-white/10 rounded-xl p-4 transition-colors group">
          <div className="w-10 h-10 bg-green-400/15 rounded-xl flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-bold">Expo Token</p>
            <p className="text-gray-500 text-xs truncate">Buat/perbarui token</p>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-green-400 ml-auto flex-shrink-0 transition-colors" />
        </a>
      </div>

      {/* Info box */}
      <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-xl p-4">
        <p className="text-yellow-400 text-xs font-bold uppercase tracking-widest mb-1">Info Penting</p>
        <p className="text-yellow-200/80 text-sm leading-relaxed">
          APK sudah tersinkron dengan web hosting <span className="font-bold text-yellow-400">apps-tmdb.web.app</span> (repo TMDB_CLONE).
          Build profile: <span className="font-bold text-yellow-400">preview</span> → output berupa file <span className="font-bold text-yellow-400">.apk</span> yang bisa langsung diinstall.
        </p>
      </div>

      {/* Steps */}
      <div>
        <p className="text-white font-bold mb-3">Langkah Setup (sekali saja)</p>
        <div className="space-y-3">
          {steps.map((s) => (
            <div key={s.num} className={`${card} p-4`}>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-black text-xs font-black">{s.num}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-bold mb-1">{s.title}</p>
                  <p className="text-gray-400 text-xs leading-relaxed mb-2">{s.desc}</p>
                  {s.items && (
                    <ul className="mb-2 space-y-1">
                      {s.items.map((item) => (
                        <li key={item} className="text-gray-400 text-xs flex items-start gap-1.5">
                          <span className="text-yellow-400 mt-0.5">•</span>{item}
                        </li>
                      ))}
                    </ul>
                  )}
                  <a href={s.link} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-yellow-400 text-xs font-bold hover:text-yellow-300 transition-colors">
                    {s.linkLabel} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Build config info */}
      <div className={`${card} p-4`}>
        <p className="text-white text-sm font-bold mb-3 flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-yellow-400" /> Konfigurasi Build
        </p>
        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
          {[
            ["Project ID", "af11294c-dbb9"],
            ["Owner", "pendi55"],
            ["Package", "com.xpogo.streaming"],
            ["Profile", "preview"],
            ["Output", "APK (.apk)"],
            ["Web Domain", "apps-tmdb.web.app"],
          ].map(([k, v]) => (
            <div key={k}>
              <span className="text-gray-500">{k}: </span>
              <span className="text-white font-mono">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  KOMEN & KONTAK – placeholder                             */
/* ══════════════════════════════════════════════════════════ */
function PlaceholderTab({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 bg-[#161b27] border border-white/10 rounded-2xl flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-yellow-400" />
      </div>
      <p className="text-white font-bold text-lg mb-1">{title}</p>
      <p className="text-gray-500 text-sm">{desc}</p>
      <span className="mt-4 bg-yellow-400/10 text-yellow-400 text-xs font-bold px-3 py-1.5 rounded-full border border-yellow-400/20">
        Segera Hadir
      </span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  MAIN ADMIN                                               */
/* ══════════════════════════════════════════════════════════ */
const NAV: { id: NavTab; label: string; icon: React.ElementType; special?: boolean }[] = [
  { id: "daftar",  label: "Daftar",  icon: LayoutList   },
  { id: "tambah",  label: "Tambah",  icon: Plus, special: true },
  { id: "build",   label: "Build",   icon: Smartphone   },
  { id: "server",  label: "Server",  icon: Server       },
  { id: "tema",    label: "Tema",    icon: Palette       },
  { id: "kontak",  label: "Kontak",  icon: Phone        },
];

export default function AdminPage() {
  const [loggedIn, setLI]   = useState(false);
  const [verifying, setV]   = useState(true);
  const [tab, setTab]       = useState<NavTab>("tambah");
  const qc = useQueryClient();

  useEffect(() => {
    const token = getToken();
    if (!token) { setV(false); return; }
    fb.getPasswordHash()
      .then((hash) => { if (hash && token === hash) setLI(true); else clearToken(); })
      .finally(() => setV(false));
  }, []);

  if (verifying) return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!loggedIn) return <LoginPage onLogin={() => setLI(true)} />;

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col">
      {/* Header */}
      <div className="bg-[#0d1117] border-b border-white/[0.08] px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sticky top-0 z-10">
        <div className="min-w-0">
          <p className="text-yellow-400 font-black text-lg leading-none truncate">XpoGo Admin</p>
          <p className="text-gray-500 text-xs mt-0.5 truncate">Streaming Management</p>
        </div>
        <button onClick={() => { clearToken(); setLI(false); qc.clear(); }}
          className="shrink-0 bg-[#1e2535] hover:bg-red-600/20 border border-white/10 hover:border-red-500/30 text-white hover:text-red-400 px-3 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5">
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-28">
        {tab === "daftar"  && <DaftarTab />}
        {tab === "tambah"  && <TambahTab />}
        {tab === "build"   && <BuildTab />}
        {tab === "server"  && <ServerTab />}
        {tab === "tema"    && <TemaTab />}
        {tab === "kontak"  && <PlaceholderTab icon={Phone} title="Kontak" desc="Info kontak dan dukungan" />}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0d1117] border-t border-white/[0.08] z-20">
        <div className="flex items-center">
          {NAV.map(({ id, label, icon: Icon, special }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                special
                  ? tab === id
                    ? "text-black"
                    : "text-black"
                  : tab === id
                    ? "text-yellow-400"
                    : "text-gray-600 hover:text-gray-400"
              }`}>
              {special ? (
                <div className={`w-10 h-10 rounded-full flex items-center justify-center -mt-5 border-4 border-[#0d1117] transition-colors ${tab === id ? "bg-yellow-300" : "bg-yellow-400"}`}>
                  <Icon className="w-5 h-5 text-black" />
                </div>
              ) : (
                <Icon className="w-5 h-5" />
              )}
              <span className={`text-[10px] font-bold leading-none ${special ? "text-yellow-400" : ""}`}>{label}</span>
            </button>
          ))}
        </div>
        <div className="h-safe-area-inset-bottom" />
      </div>
    </div>
  );
}
