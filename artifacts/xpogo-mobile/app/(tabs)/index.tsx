import { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Dimensions, StatusBar,
  Animated, BackHandler, Modal, TextInput, FlatList,
  TouchableWithoutFeedback, Alert, AppState, RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { tmdb } from "@/lib/tmdb";
import { fb } from "@/lib/firebase";

const IMG_W = "https://image.tmdb.org/t/p/w342";
const IMG_B = "https://image.tmdb.org/t/p/w780";
const { width, height } = Dimensions.get("window");
const DRAWER_W = Math.min(width * 0.82, 320);
const CARD_W = (width - 56) / 3.2;
const BG = "#0d1117";
const CARD_BG = "#1a2332";
const GREEN = "#00c853";
const GRAY = "#8a9bb0";
const GENRES = ["Aksi", "Komedi", "Drama", "Horor", "Fiksi Ilmiah", "Animasi", "Thriller"];

interface MediaItem {
  id: number; title?: string; name?: string;
  poster_path?: string | null; backdrop_path?: string | null;
  vote_average?: number; media_type?: string; overview?: string;
}
interface CustomMovie {
  id: string; title: string; posterUrl?: string; backdropUrl?: string;
  type: "movie" | "series"; tmdbId?: number; description?: string;
}

function RatingBadge({ score }: { score?: number }) {
  if (!score) return null;
  const pct = Math.round(score * 10);
  const color = pct >= 70 ? GREEN : pct >= 50 ? "#f5c518" : "#e74c3c";
  return (
    <View style={[S.ratingBadge, { borderColor: color }]}>
      <Text style={[S.ratingText, { color }]}>{pct}%</Text>
    </View>
  );
}

function MediaCard({ item, type }: { item: MediaItem; type: "movie" | "tv" }) {
  const router = useRouter();
  const mt = (item.media_type as "movie" | "tv") ?? type;
  return (
    <TouchableOpacity style={S.card} onPress={() => router.push((mt === "tv" ? `/tv/${item.id}` : `/movie/${item.id}`) as never)} activeOpacity={0.85}>
      <View style={S.posterWrap}>
        {item.poster_path
          ? <Image source={{ uri: `${IMG_W}${item.poster_path}` }} style={S.poster} />
          : <View style={[S.poster, S.noImg]}><Text style={{ color: "#444", fontSize: 9, textAlign: "center", padding: 4 }}>{item.title ?? item.name}</Text></View>
        }
        <RatingBadge score={item.vote_average} />
      </View>
      <Text style={S.cardTitle} numberOfLines={2}>{item.title ?? item.name}</Text>
    </TouchableOpacity>
  );
}

function CustomCard({ m }: { m: CustomMovie }) {
  const router = useRouter();
  return (
    <TouchableOpacity style={S.card} onPress={() => router.push((m.tmdbId ? `/movie/${m.tmdbId}` : `/movie/${m.id}`) as never)} activeOpacity={0.85}>
      <View style={S.posterWrap}>
        {m.posterUrl
          ? <Image source={{ uri: m.posterUrl }} style={S.poster} />
          : <View style={[S.poster, { backgroundColor: CARD_BG, alignItems: "center", justifyContent: "center" }]}><Text style={{ fontSize: 28 }}>🎬</Text></View>
        }
        <View style={[S.ratingBadge, { backgroundColor: "rgba(229,9,20,0.9)", borderColor: "#E50914" }]}>
          <Text style={[S.ratingText, { color: "#fff" }]}>{m.type === "series" ? "S" : "M"}</Text>
        </View>
      </View>
      <Text style={S.cardTitle} numberOfLines={2}>{m.title}</Text>
    </TouchableOpacity>
  );
}

function SectionRow({ title, items, type, seeAll }: { title: string; items: MediaItem[]; type: "movie" | "tv"; seeAll?: () => void; }) {
  if (!items.length) return null;
  return (
    <View style={S.section}>
      <View style={S.sectionHeader}>
        <Text style={S.sectionTitle}>{title}</Text>
        {seeAll && <TouchableOpacity onPress={seeAll} style={S.seeAllBtn} activeOpacity={0.7}><Text style={S.seeAllText}>Semua</Text></TouchableOpacity>}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
        {items.map(item => <MediaCard key={item.id} item={item} type={type} />)}
      </ScrollView>
    </View>
  );
}

function HeroBanner({ item, onWatch, onInfo }: { item: MediaItem; onWatch: () => void; onInfo: () => void; }) {
  const pct = item.vote_average ? Math.round(item.vote_average * 10) : 0;
  const rColor = pct >= 70 ? GREEN : pct >= 50 ? "#f5c518" : "#e74c3c";
  return (
    <View style={S.hero}>
      {item.backdrop_path
        ? <Image source={{ uri: `${IMG_B}${item.backdrop_path}` }} style={S.heroImg} resizeMode="cover" />
        : <View style={S.heroImgPlaceholder} />
      }
      <View style={S.heroGrad} />
      <View style={S.heroContent}>
        <View style={S.heroBadge}>
          <Text style={S.heroBadgeText}>{pct > 0 ? `⭐ ${pct}% · ` : ""}{item.media_type === "tv" ? "Serial TV" : "Film"}</Text>
        </View>
        <Text style={S.heroTitle} numberOfLines={2}>{item.title ?? item.name}</Text>
        {item.overview ? <Text style={S.heroOverview} numberOfLines={2}>{item.overview}</Text> : null}
        <View style={S.heroBtns}>
          <TouchableOpacity style={S.btnWatch} onPress={onWatch} activeOpacity={0.85}><Text style={S.btnWatchText}>▶  Tonton</Text></TouchableOpacity>
          <TouchableOpacity style={S.btnInfo} onPress={onInfo} activeOpacity={0.85}><Text style={S.btnInfoText}>ℹ  Info</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function DrawerMenu({ visible, onClose, onOpenSearch }: {
  visible: boolean; onClose: () => void; onOpenSearch: () => void;
}) {
  const slideX = useRef(new Animated.Value(-DRAWER_W)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideX, { toValue: visible ? 0 : -DRAWER_W, duration: 240, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: visible ? 1 : 0, duration: 240, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  const comingSoon = (label: string) => Alert.alert("Segera Hadir", `Fitur "${label}" akan tersedia di pembaruan berikutnya.`);
  const LIBRARY = [
    { icon: "❤️", label: "Favorit" },
    { icon: "🔖", label: "Daftar Tonton" },
    { icon: "⭐", label: "Dinilai" },
    { icon: "📋", label: "Daftar Saya" },
  ];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? "auto" : "none"}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[S.drawerOverlay, { opacity }]} />
      </TouchableWithoutFeedback>
      <Animated.View style={[S.drawerPanel, { transform: [{ translateX: slideX }] }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
          <View style={[S.drawerHeader, { paddingTop: Math.max(insets.top + 12, 24) }]}>
            <View style={S.drawerAvatar}><Text style={{ fontSize: 28 }}>👤</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={S.drawerName}>Tamu</Text>
              <Text style={S.drawerSub}>Admin hanya lewat web</Text>
            </View>
          </View>

          <Text style={S.drawerLabel}>PERPUSTAKAAN SAYA</Text>
          <View style={S.drawerCard}>
            {LIBRARY.map((item, i) => (
              <View key={item.label}>
                <TouchableOpacity style={S.drawerRow} activeOpacity={0.7} onPress={() => comingSoon(item.label)}>
                  <View style={S.drawerIcon}><Text style={{ fontSize: 15 }}>{item.icon}</Text></View>
                  <Text style={S.drawerRowLabel}>{item.label}</Text>
                  <View style={S.comingSoonBadge}><Text style={S.comingSoonText}>Segera</Text></View>
                </TouchableOpacity>
                {i < LIBRARY.length - 1 && <View style={S.divider} />}
              </View>
            ))}
          </View>

          <Text style={S.drawerLabel}>JELAJAHI</Text>
          <View style={S.drawerCard}>
            <TouchableOpacity style={S.drawerRow} activeOpacity={0.7} onPress={() => { onClose(); setTimeout(onOpenSearch, 280); }}>
              <View style={[S.drawerIcon, { backgroundColor: "#0a3d1f" }]}><Text style={{ fontSize: 15 }}>🔍</Text></View>
              <Text style={S.drawerRowLabel}>Cari Film / Serial</Text>
              <Text style={{ color: GRAY, fontSize: 18 }}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={S.drawerAdminCard}>
            <TouchableOpacity style={S.drawerRow} activeOpacity={0.85} onPress={onClose}>
              <View style={[S.drawerIcon, { backgroundColor: "#0a3d1f" }]}><Text style={{ fontSize: 15 }}>🛡️</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={[S.drawerRowLabel, { color: GREEN }]}>Admin hanya di web</Text>
                <Text style={{ color: GRAY, fontSize: 11, marginTop: 1 }}>Kelola konten dan pengaturan lewat browser</Text>
              </View>
              <Text style={{ color: GREEN, fontSize: 18 }}>›</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// ─── HOME SCREEN ─────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [trendingTab, setTrendingTab] = useState<"day" | "week">("week");
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [customMovies, setCustomMovies] = useState<CustomMovie[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchModal, setSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  // ── TMDB data (direct, no API server) ──────────────────────────
  const [trendWeek, setTrendWeek] = useState<any>(null);
  const [trendDay, setTrendDay] = useState<any>(null);
  const [moviesData, setMoviesData] = useState<any>(null);
  const [tvData, setTvData] = useState<any>(null);
  const [topMoviesData, setTopMoviesData] = useState<any>(null);
  const [topTvData, setTopTvData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      tmdb.trending("all", "week").then(setTrendWeek).catch(() => {}),
      tmdb.trending("all", "day").then(setTrendDay).catch(() => {}),
      tmdb.popularMovies().then(setMoviesData).catch(() => {}),
      tmdb.popularTv().then(setTvData).catch(() => {}),
      tmdb.topMovies().then(setTopMoviesData).catch(() => {}),
      tmdb.topTv().then(setTopTvData).catch(() => {}),
    ]).finally(() => setIsLoading(false));
  }, []);

  // ── Firebase data: auto-sync saat web admin update ──────────────
  const loadFirebaseData = useCallback(async () => {
    try {
      const d = await fb.getCustomMovies();
      setCustomMovies(d as CustomMovie[]);
    } catch {}
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadFirebaseData(),
      tmdb.trending("all", "week").then(setTrendWeek).catch(() => {}),
      tmdb.trending("all", "day").then(setTrendDay).catch(() => {}),
      tmdb.popularMovies().then(setMoviesData).catch(() => {}),
      tmdb.popularTv().then(setTvData).catch(() => {}),
      tmdb.topMovies().then(setTopMoviesData).catch(() => {}),
      tmdb.topTv().then(setTopTvData).catch(() => {}),
    ]);
    setRefreshing(false);
  }, [loadFirebaseData]);

  // ── Mount: ambil Firebase data pertama kali ─────────────────────
  useEffect(() => { loadFirebaseData(); }, []);

  // ── AppState: refresh Firebase saat app aktif kembali ──────────
  useEffect(() => {
    const sub = AppState.addEventListener("change", state => {
      if (state === "active") loadFirebaseData();
    });
    return () => sub.remove();
  }, [loadFirebaseData]);

  // ── Polling 30 detik: sync otomatis selama app terbuka ─────────
  useEffect(() => {
    const id = setInterval(loadFirebaseData, 30_000);
    return () => clearInterval(id);
  }, [loadFirebaseData]);

  // ── Search via TMDB directly ────────────────────────────────────
  const doSearch = async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const data = await tmdb.search(q);
      const items = (data.results ?? [])
        .filter((x: any) => x.media_type === "movie" || x.media_type === "tv")
        .slice(0, 20);
      setSearchResults(items);
    } catch { setSearchResults([]); }
    finally { setSearchLoading(false); }
  };

  useEffect(() => {
    const h = BackHandler.addEventListener("hardwareBackPress", () => {
      if (drawerOpen) { setDrawerOpen(false); return true; }
      return false;
    });
    return () => h.remove();
  }, [drawerOpen]);

  const trendResults  = (trendingTab === "day" ? trendDay : trendWeek)?.results as MediaItem[] ?? [];
  const popularMovies = moviesData?.results as MediaItem[] ?? [];
  const popularTv     = tvData?.results as MediaItem[] ?? [];
  const topRatedMovies = topMoviesData?.results as MediaItem[] ?? [];
  const onAir         = topTvData?.results as MediaItem[] ?? [];
  const heroItem      = trendResults[0] ?? popularMovies[0];

  return (
    <View style={S.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View style={[S.headerSafe, { paddingTop: insets.top }]}>
        <View style={S.header}>
          <TouchableOpacity style={S.headerIcon} activeOpacity={0.7} onPress={() => setDrawerOpen(true)}>
            <Text style={{ color: "#fff", fontSize: 20 }}>☰</Text>
          </TouchableOpacity>
          <Text style={S.logoText}>Xpo<Text style={{ color: GREEN }}>Go</Text></Text>
          <TouchableOpacity style={S.headerIcon} activeOpacity={0.7}
            onPress={() => { setSearchQuery(""); setSearchResults([]); setSearchModal(true); }}>
            <Text style={{ color: "#fff", fontSize: 18 }}>🔍</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={GREEN}
            colors={[GREEN]}
          />
        }
      >
        {heroItem && !isLoading && (
          <HeroBanner
            item={heroItem}
            onWatch={() => router.push((heroItem.media_type === "tv" ? `/tv/${heroItem.id}` : `/movie/${heroItem.id}`) as never)}
            onInfo={() => router.push((heroItem.media_type === "tv" ? `/tv/${heroItem.id}` : `/movie/${heroItem.id}`) as never)}
          />
        )}

        {isLoading
          ? <ActivityIndicator color={GREEN} size="large" style={{ marginTop: 60 }} />
          : <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.genres}>
                {GENRES.map(g => (
                  <TouchableOpacity key={g} style={[S.genreChip, activeGenre === g && S.genreChipActive]}
                    onPress={() => setActiveGenre(activeGenre === g ? null : g)} activeOpacity={0.8}>
                    <Text style={[S.genreText, activeGenre === g && S.genreTextActive]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {customMovies.length > 0 && (
                <View style={S.section}>
                  <View style={S.sectionHeader}><Text style={S.sectionTitle}>🎬 Film Khusus</Text></View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
                    {customMovies.map(m => <CustomCard key={m.id} m={m} />)}
                  </ScrollView>
                </View>
              )}

              <SectionRow title="🔥 Populer" items={popularMovies} type="movie"
                seeAll={() => Alert.alert("Semua Film Populer", "Fitur halaman penuh akan segera hadir!", [{ text: "OK" }])} />

              <View style={S.section}>
                <View style={S.sectionHeader}>
                  <Text style={S.sectionTitle}>📈 Trending</Text>
                  <View style={S.toggleRow}>
                    {(["day", "week"] as const).map(tab => (
                      <TouchableOpacity key={tab} style={[S.toggleBtn, trendingTab === tab && S.toggleBtnActive]}
                        onPress={() => setTrendingTab(tab)} activeOpacity={0.8}>
                        <Text style={[S.toggleText, trendingTab === tab && S.toggleTextActive]}>
                          {tab === "day" ? "Hari ini" : "Minggu ini"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
                  {trendResults.map(item => <MediaCard key={item.id} item={item} type="movie" />)}
                </ScrollView>
              </View>

              <SectionRow title="⭐ Penilaian Teratas" items={topRatedMovies} type="movie" />
              <SectionRow title="📺 Serial Populer" items={popularTv} type="tv" />
              <SectionRow title="🏆 Serial Terbaik" items={onAir} type="tv" />
            </>
        }
      </ScrollView>

      <DrawerMenu visible={drawerOpen} onClose={() => setDrawerOpen(false)} onOpenSearch={() => { setSearchQuery(""); setSearchResults([]); setSearchModal(true); }} />

      {/* SEARCH MODAL */}
      <Modal visible={searchModal} transparent animationType="slide" onRequestClose={() => setSearchModal(false)}>
        <View style={[S.searchOverlay, { paddingTop: insets.top }]}>
          <View style={S.searchBar}>
            <TextInput style={S.searchInput} placeholder="Cari film, serial, artis..." placeholderTextColor={GRAY}
              value={searchQuery} onChangeText={q => { setSearchQuery(q); if (q.length > 1) doSearch(q); else setSearchResults([]); }}
              autoFocus returnKeyType="search" onSubmitEditing={() => doSearch(searchQuery)} />
            <TouchableOpacity onPress={() => setSearchModal(false)} style={S.searchCancel} activeOpacity={0.7}>
              <Text style={{ color: GREEN, fontWeight: "700", fontSize: 14 }}>Batal</Text>
            </TouchableOpacity>
          </View>
          {searchLoading
            ? <ActivityIndicator color={GREEN} size="large" style={{ marginTop: 40 }} />
            : searchResults.length > 0
              ? <FlatList data={searchResults} keyExtractor={i => `${i.id}-${i.media_type}`} numColumns={3}
                  contentContainerStyle={{ padding: 12, gap: 12 }} columnWrapperStyle={{ gap: 12 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.85}
                      onPress={() => { setSearchModal(false); router.push((item.media_type === "tv" ? `/tv/${item.id}` : `/movie/${item.id}`) as never); }}>
                      <View style={S.posterWrap}>
                        {item.poster_path
                          ? <Image source={{ uri: `${IMG_W}${item.poster_path}` }} style={S.poster} />
                          : <View style={[S.poster, S.noImg]}><Text style={{ color: "#444", fontSize: 9, textAlign: "center", padding: 4 }}>{item.title ?? item.name}</Text></View>
                        }
                        <View style={[S.ratingBadge, { borderColor: item.media_type === "tv" ? "#3b82f6" : GREEN }]}>
                          <Text style={[S.ratingText, { color: item.media_type === "tv" ? "#3b82f6" : GREEN }]}>{item.media_type === "tv" ? "TV" : "Film"}</Text>
                        </View>
                      </View>
                      <Text style={S.cardTitle} numberOfLines={2}>{item.title ?? item.name}</Text>
                    </TouchableOpacity>
                  )}
                />
              : searchQuery.length > 0
                ? <View style={{ alignItems: "center", marginTop: 60 }}><Text style={{ fontSize: 36 }}>🔍</Text><Text style={{ color: GRAY, marginTop: 12, fontSize: 14 }}>Tidak ada hasil untuk "{searchQuery}"</Text></View>
                : <View style={{ alignItems: "center", marginTop: 60 }}><Text style={{ fontSize: 36 }}>🎬</Text><Text style={{ color: GRAY, marginTop: 12, fontSize: 14 }}>Ketik untuk mencari film atau serial</Text></View>
          }
        </View>
      </Modal>

    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  headerSafe: { backgroundColor: "rgba(13,17,23,0.97)", zIndex: 10 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10 },
  headerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(26,35,50,0.9)", alignItems: "center", justifyContent: "center" },
  logoText: { color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: -1 },
  hero: { marginHorizontal: 14, height: height * 0.28, borderRadius: 16, overflow: "hidden", position: "relative", marginBottom: 12, marginTop: 6 },
  heroImg: { position: "absolute", width: "100%", height: "100%" },
  heroImgPlaceholder: { position: "absolute", width: "100%", height: "100%", backgroundColor: CARD_BG },
  heroGrad: { position: "absolute", inset: 0, backgroundColor: "transparent" },
  heroContent: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 14, paddingBottom: 14 },
  heroBadge: { alignSelf: "flex-start", backgroundColor: "rgba(0,200,83,.2)", borderWidth: 1, borderColor: GREEN, borderRadius: 16, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 6 },
  heroBadgeText: { color: GREEN, fontSize: 10, fontWeight: "700" },
  heroTitle: { color: "#fff", fontSize: 17, fontWeight: "900", lineHeight: 22, marginBottom: 8, textShadowColor: "rgba(0,0,0,.9)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  heroOverview: { color: "rgba(255,255,255,.7)", fontSize: 11, lineHeight: 15, marginBottom: 10 },
  heroBtns: { flexDirection: "row", gap: 8 },
  btnWatch: { backgroundColor: GREEN, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  btnWatchText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  btnInfo: { backgroundColor: "rgba(255,255,255,.14)", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(255,255,255,.2)" },
  btnInfoText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  genres: { paddingHorizontal: 16, gap: 8, paddingVertical: 14 },
  genreChip: { borderRadius: 20, borderWidth: 1.5, borderColor: "#2a3a4a", paddingHorizontal: 16, paddingVertical: 8 },
  genreChipActive: { backgroundColor: GREEN, borderColor: GREEN },
  genreText: { color: GRAY, fontSize: 13, fontWeight: "600" },
  genreTextActive: { color: "#fff" },
  section: { marginBottom: 26 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  seeAllBtn: { backgroundColor: GREEN, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5 },
  seeAllText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  toggleRow: { flexDirection: "row", backgroundColor: CARD_BG, borderRadius: 20, padding: 3 },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18 },
  toggleBtnActive: { backgroundColor: GREEN },
  toggleText: { color: GRAY, fontSize: 12, fontWeight: "600" },
  toggleTextActive: { color: "#fff" },
  card: { width: CARD_W },
  posterWrap: { position: "relative", borderRadius: 10, overflow: "hidden" },
  poster: { width: CARD_W, aspectRatio: 2 / 3, borderRadius: 10, backgroundColor: CARD_BG },
  noImg: { alignItems: "center", justifyContent: "center" },
  ratingBadge: { position: "absolute", top: 6, left: 6, backgroundColor: "rgba(13,17,23,0.88)", borderRadius: 12, paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1.5, borderColor: GREEN },
  ratingText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  cardTitle: { color: "#c8d6e5", fontSize: 12, marginTop: 7, lineHeight: 16, fontWeight: "500" },
  drawerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.72)" },
  drawerPanel: { position: "absolute", left: 0, top: 0, bottom: 0, width: DRAWER_W, backgroundColor: "#0d1420", borderRightWidth: 1, borderRightColor: "#1a2332", shadowColor: "#000", shadowOpacity: 0.6, shadowRadius: 24, elevation: 24 },
  drawerHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 20, paddingBottom: 20, backgroundColor: "#111d2e", marginBottom: 6 },
  drawerAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: CARD_BG, alignItems: "center", justifyContent: "center" },
  drawerName: { color: "#fff", fontSize: 17, fontWeight: "800" },
  drawerSub: { color: GRAY, fontSize: 11, marginTop: 2 },
  drawerMasukBtn: { backgroundColor: GREEN, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  drawerMasukText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  drawerLabel: { color: GRAY, fontSize: 10, fontWeight: "700", letterSpacing: 1.2, paddingHorizontal: 16, marginBottom: 6, marginTop: 12 },
  drawerCard: { backgroundColor: CARD_BG, borderRadius: 14, marginHorizontal: 12, marginBottom: 4, overflow: "hidden" },
  drawerAdminCard: { backgroundColor: "#091a10", borderRadius: 14, marginHorizontal: 12, marginTop: 14, borderWidth: 1.5, borderColor: GREEN, overflow: "hidden" },
  drawerRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  drawerIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#2a3a4a", alignItems: "center", justifyContent: "center" },
  drawerRowLabel: { flex: 1, color: "#fff", fontSize: 14, fontWeight: "600" },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,.04)", marginLeft: 62 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalBox: { backgroundColor: "#111d2e", borderRadius: 18, padding: 24, width: "100%", borderWidth: 1, borderColor: "#2a3a4a" },
  modalTitle: { color: "#fff", fontSize: 20, fontWeight: "900", marginBottom: 6, textAlign: "center" },
  modalSub: { color: GRAY, fontSize: 12, textAlign: "center", lineHeight: 17 },
  modalInput: { backgroundColor: BG, color: "#fff", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, marginBottom: 8, borderWidth: 1.5, borderColor: "#2a3a4a", marginTop: 16 },
  errorText: { color: "#ff4d4d", fontSize: 12, marginBottom: 6, textAlign: "center" },
  modalBtn: { flex: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  modalBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  linkText: { color: GREEN, fontSize: 13, fontWeight: "600", textDecorationLine: "underline" },
  comingSoonBadge: { backgroundColor: "rgba(0,200,83,0.12)", borderWidth: 1, borderColor: GREEN, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  comingSoonText: { color: GREEN, fontSize: 10, fontWeight: "700" },
  searchOverlay: { flex: 1, backgroundColor: BG },
  searchBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: "#1a2332" },
  searchInput: { flex: 1, backgroundColor: CARD_BG, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: "#fff", fontSize: 15, borderWidth: 1, borderColor: "#2a3a4a" },
  searchCancel: { paddingHorizontal: 6, paddingVertical: 8 },
});
