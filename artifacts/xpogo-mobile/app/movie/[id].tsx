import { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Dimensions, StatusBar,
  SafeAreaView, Modal, TouchableWithoutFeedback, FlatList, AppState,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { tmdb } from "@/lib/tmdb";
import { fb } from "@/lib/firebase";
import CommentsSection from "@/components/CommentsSection";
import ShareSheet from "@/components/ShareSheet";

const IMG = "https://image.tmdb.org/t/p";
const { width } = Dimensions.get("window");
const BG = "#0d1117";
const CARD_BG = "#1a2332";
const GREEN = "#00c853";
const GRAY = "#8a9bb0";

interface EmbedRecord { id: string; title: string; url: string; type: string; active: boolean; tmdbId?: number; sub?: string; }
interface ServerOption { id: string; label: string; url: string; badge: string; badgeColor: string; icon: string; sub?: string; }

function buildZxcUrl(id: number, serverNum: number, settings: Record<string, string> | null) {
  const color = (settings?.playerColor ?? "00c853").replace("#", "");
  const autoplay = settings?.autoplay !== "false" ? "true" : "false";
  return `https://zxcstream.xyz/player/movie/${id}?server=${serverNum}&color=${color}&autoplay=${autoplay}&back=true`;
}

function RatingCircle({ score }: { score?: number }) {
  if (!score) return null;
  const pct = Math.round(score * 10);
  const color = pct >= 70 ? GREEN : pct >= 50 ? "#f5c518" : "#e74c3c";
  return (
    <View style={[S.ratingCircle, { borderColor: color }]}>
      <Text style={[S.ratingPct, { color }]}>{pct}</Text>
      <Text style={S.ratingSymbol}>%</Text>
    </View>
  );
}

function ServerPicker({ visible, onClose, servers, onSelect, title }: {
  visible: boolean; onClose: () => void; servers: ServerOption[]; onSelect: (s: ServerOption) => void; title: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={P.overlay}>
          <TouchableWithoutFeedback>
            <View style={P.sheet}>
              <View style={P.handle} />
              <Text style={P.sheetTitle}>🎬 Pilih Server</Text>
              <Text style={P.sheetSub} numberOfLines={1}>{title}</Text>
              <FlatList
                data={servers} keyExtractor={item => item.id} contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item, index }) => (
                  <TouchableOpacity style={[P.serverRow, index === 0 && P.serverRowFirst]} onPress={() => onSelect(item)} activeOpacity={0.75}>
                    <View style={[P.serverIconWrap, { backgroundColor: index === 0 ? "#0a3d1f" : CARD_BG }]}>
                      <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={P.serverLabel}>{item.label}</Text>
                      {item.sub ? <Text style={P.serverSub} numberOfLines={1}>{item.sub}</Text> : null}
                    </View>
                    <View style={[P.badge, { backgroundColor: item.badgeColor + "22", borderColor: item.badgeColor }]}>
                      <Text style={[P.badgeText, { color: item.badgeColor }]}>{item.badge}</Text>
                    </View>
                    <Text style={{ color: GRAY, fontSize: 18, marginLeft: 6 }}>›</Text>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={P.sep} />}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const movieId = Number(id);

  const [movie, setMovie] = useState<any>(null);
  const [settings, setSettings] = useState<Record<string, string> | null>(null);
  const [customMovie, setCustomMovie] = useState<any>(null);
  const [embeds, setEmbeds] = useState<EmbedRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);

  const loadFirebaseData = useCallback(async () => {
    await Promise.all([
      fb.getSettings().then(setSettings).catch(() => {}),
      fb.getCustomMovies().then(list => {
        const found = list.find((m: any) => String(m.id) === String(id) || String(m.tmdbId) === String(id));
        if (found) setCustomMovie(found);
      }).catch(() => {}),
      fb.getEmbeds().then(list => {
        const matched = list.filter((e: any) => e.active && e.type === "movie" && e.tmdbId === movieId);
        setEmbeds(matched);
      }).catch(() => {}),
    ]);
  }, [id, movieId]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      tmdb.movieDetail(movieId).then(setMovie).catch(() => {}),
      loadFirebaseData(),
    ]).finally(() => setIsLoading(false));
  }, [id]);

  // ── AppState: refresh embed/settings saat kembali ke foreground ─
  useEffect(() => {
    const sub = AppState.addEventListener("change", state => {
      if (state === "active") loadFirebaseData();
    });
    return () => sub.remove();
  }, [loadFirebaseData]);

  if (isLoading && !customMovie) {
    return <View style={[S.container, { alignItems: "center", justifyContent: "center" }]}><ActivityIndicator color={GREEN} size="large" /></View>;
  }

  const m = movie;
  const title = customMovie?.title ?? m?.title ?? "Film";
  const overview = customMovie?.description ?? m?.overview ?? "";
  const backdropUrl = customMovie?.backdropUrl ?? (m?.backdrop_path ? `${IMG}/original${m.backdrop_path}` : "");
  const posterUrl = customMovie?.posterUrl ?? (m?.poster_path ? `${IMG}/w342${m.poster_path}` : "");
  const year = customMovie?.year ?? m?.release_date?.slice(0, 4);
  const runtime = m?.runtime ? `${Math.floor(m.runtime / 60)}j ${m.runtime % 60}m` : null;
  const genres = customMovie?.genres ?? m?.genres?.map((g: any) => g.name);
  const rating = m?.vote_average;
  const cast = m?.credits?.cast?.slice(0, 10) ?? [];
  const similar = m?.similar?.results?.slice(0, 10) ?? [];

  const buildServers = (): ServerOption[] => {
    const servers: ServerOption[] = [];
    if (customMovie) {
      servers.push({ id: "custom", label: "Server Utama", url: customMovie.embedUrl, badge: "CUSTOM", badgeColor: "#f97316", icon: "🎬" });
    } else {
      servers.push(
        { id: "s1", label: "Server 1 — Utama", url: buildZxcUrl(movieId, 1, settings), badge: "HD", badgeColor: GREEN, icon: "🖥️" },
        { id: "s2", label: "Server 2", url: buildZxcUrl(movieId, 2, settings), badge: "HD", badgeColor: "#3b82f6", icon: "🖥️" },
        { id: "s3", label: "Server 3", url: buildZxcUrl(movieId, 3, settings), badge: "ALT", badgeColor: "#8b5cf6", icon: "🖥️" },
      );
    }
    embeds.forEach((e, i) => servers.push({ id: e.id, label: e.title || `Server Embed ${i + 1}`, url: e.url, badge: "EMBED", badgeColor: "#f59e0b", icon: "📡", sub: e.sub ? `Sub: ${e.sub}` : undefined }));
    return servers;
  };

  const servers = buildServers();
  const hasMultiple = servers.length > 1;
  const openPlayer = (url: string) => router.push(`/player?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&tmdbId=${movieId}&mediaType=movie` as never);

  return (
    <View style={S.container}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={S.backdropWrap}>
          {backdropUrl ? <Image source={{ uri: backdropUrl }} style={S.backdrop} /> : <View style={[S.backdrop, { backgroundColor: CARD_BG }]} />}
          <LinearGradient colors={["transparent", "rgba(13,17,23,0.7)", BG]} style={S.backdropGrad} />
          <SafeAreaView>
            <TouchableOpacity style={S.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
              <Text style={S.backBtnText}>‹ Kembali</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        <View style={S.infoRow}>
          <View style={S.posterWrap}>
            {posterUrl
              ? <Image source={{ uri: posterUrl }} style={S.poster} />
              : <View style={[S.poster, { backgroundColor: CARD_BG, alignItems: "center", justifyContent: "center" }]}><Text style={{ color: GRAY, fontSize: 30 }}>🎬</Text></View>
            }
          </View>
          <View style={S.metaCol}>
            <Text style={S.title} numberOfLines={3}>{title}</Text>
            <View style={S.metaRow}>
              {year && <Text style={S.metaChip}>📅 {year}</Text>}
              {runtime && <Text style={S.metaChip}>⏱ {runtime}</Text>}
            </View>
            {rating && <RatingCircle score={rating} />}
            {hasMultiple && <View style={S.serverCountBadge}><Text style={S.serverCountText}>🖥️ {servers.length} Server</Text></View>}
          </View>
        </View>

        {genres && genres.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.genreRow}>
            {genres.map((g: string) => <View key={g} style={S.genreChip}><Text style={S.genreText}>{g}</Text></View>)}
          </ScrollView>
        )}

        <View style={S.section}>
          <Text style={S.sectionTitle}>Sinopsis</Text>
          <Text style={S.overview}>{overview || "Tidak ada deskripsi."}</Text>
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginHorizontal: 16, marginBottom: 16 }}>
          <TouchableOpacity style={[S.watchBtn, { flex: 1, marginHorizontal: 0, marginBottom: 0 }]}
            onPress={() => hasMultiple ? setPickerVisible(true) : openPlayer(servers[0]?.url ?? "")} activeOpacity={0.85}>
            <Text style={S.watchBtnText}>{hasMultiple ? `▶  Tonton  ·  ${servers.length} Server` : "▶  Tonton Sekarang"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.shareBtn} onPress={() => setShareVisible(true)} activeOpacity={0.8}>
            <Text style={{ fontSize: 20 }}>📤</Text>
          </TouchableOpacity>
        </View>

        {hasMultiple && (
          <View style={{ marginHorizontal: 16, marginBottom: 24 }}>
            <Text style={[S.sectionTitle, { paddingHorizontal: 0, marginBottom: 10 }]}>🖥️ Pilihan Server</Text>
            {servers.map((sv, i) => (
              <TouchableOpacity key={sv.id} style={P.serverRowInline} onPress={() => openPlayer(sv.url)} activeOpacity={0.8}>
                <View style={[P.serverIconWrapSm, { backgroundColor: i === 0 ? "#0a3d1f" : CARD_BG }]}><Text style={{ fontSize: 16 }}>{sv.icon}</Text></View>
                <Text style={P.serverLabelInline}>{sv.label}</Text>
                <View style={[P.badge, { backgroundColor: sv.badgeColor + "22", borderColor: sv.badgeColor }]}><Text style={[P.badgeText, { color: sv.badgeColor }]}>{sv.badge}</Text></View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {cast.length > 0 && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Pemeran Utama</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
              {cast.map((c: any) => (
                <View key={c.id} style={S.castCard}>
                  <Image source={{ uri: c.profile_path ? `${IMG}/w185${c.profile_path}` : "" }} style={S.castImg} />
                  <Text style={S.castName} numberOfLines={2}>{c.name}</Text>
                  <Text style={S.castChar} numberOfLines={1}>{c.character}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {similar.length > 0 && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Film Serupa</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
              {similar.map((s: any) => (
                <TouchableOpacity key={s.id} style={S.simCard} onPress={() => router.replace(`/movie/${s.id}` as never)} activeOpacity={0.85}>
                  <Image source={{ uri: s.poster_path ? `${IMG}/w185${s.poster_path}` : "" }} style={S.simPoster} />
                  <View style={S.simRating}><Text style={{ color: GREEN, fontSize: 9, fontWeight: "800" }}>{Math.round((s.vote_average ?? 0) * 10)}%</Text></View>
                  <Text style={S.simTitle} numberOfLines={2}>{s.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <CommentsSection mediaType="movie" tmdbId={movieId} />
      </ScrollView>

      <ServerPicker visible={pickerVisible} onClose={() => setPickerVisible(false)} servers={servers} title={title}
        onSelect={sv => { setPickerVisible(false); setTimeout(() => openPlayer(sv.url), 200); }} />
      <ShareSheet visible={shareVisible} onClose={() => setShareVisible(false)} title={title} year={year} overview={overview} posterUrl={posterUrl} tmdbId={movieId} mediaType="movie" />
    </View>
  );
}

const BACK_H = width * 0.46; const POSTER_W = 100; const POSTER_H = POSTER_W * 1.5;
const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  backdropWrap: { width, height: BACK_H, position: "relative" },
  backdrop: { width, height: BACK_H, resizeMode: "cover" },
  backdropGrad: { position: "absolute", bottom: 0, left: 0, right: 0, height: BACK_H * 0.6 },
  backBtn: { margin: 12, alignSelf: "flex-start", backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  backBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  infoRow: { flexDirection: "row", gap: 14, paddingHorizontal: 16, marginTop: -POSTER_H * 0.5, marginBottom: 14, alignItems: "flex-end" },
  posterWrap: { borderRadius: 12, overflow: "hidden", elevation: 10 },
  poster: { width: POSTER_W, height: POSTER_H, borderRadius: 12 },
  metaCol: { flex: 1, paddingBottom: 8 },
  title: { color: "#fff", fontSize: 20, fontWeight: "900", lineHeight: 26, marginBottom: 8 },
  metaRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 10 },
  metaChip: { color: GRAY, fontSize: 12, fontWeight: "600", backgroundColor: CARD_BG, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  ratingCircle: { width: 46, height: 46, borderRadius: 23, borderWidth: 3, alignItems: "center", justifyContent: "center", flexDirection: "row", backgroundColor: "rgba(13,17,23,0.9)" },
  ratingPct: { fontSize: 14, fontWeight: "900" },
  ratingSymbol: { color: GRAY, fontSize: 9, fontWeight: "700", marginTop: -4 },
  serverCountBadge: { backgroundColor: "#0a3d1f", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: GREEN, alignSelf: "flex-start", marginTop: 6 },
  serverCountText: { color: GREEN, fontSize: 11, fontWeight: "700" },
  genreRow: { paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  genreChip: { borderRadius: 20, borderWidth: 1.5, borderColor: "#2a3a4a", paddingHorizontal: 14, paddingVertical: 6 },
  genreText: { color: GRAY, fontSize: 12, fontWeight: "600" },
  section: { marginBottom: 24 },
  sectionTitle: { color: "#fff", fontSize: 17, fontWeight: "800", paddingHorizontal: 16, marginBottom: 10 },
  overview: { color: "#b0c0d0", fontSize: 14, lineHeight: 22, paddingHorizontal: 16 },
  watchBtn: { marginHorizontal: 16, marginBottom: 16, backgroundColor: GREEN, borderRadius: 14, paddingVertical: 16, alignItems: "center", elevation: 8 },
  watchBtnText: { color: "#fff", fontSize: 16, fontWeight: "900", letterSpacing: 0.3 },
  shareBtn: { width: 54, height: 54, borderRadius: 14, backgroundColor: CARD_BG, borderWidth: 1.5, borderColor: "#2a3a4a", alignItems: "center", justifyContent: "center" },
  castCard: { width: 80, alignItems: "center" },
  castImg: { width: 72, height: 72, borderRadius: 36, backgroundColor: CARD_BG, marginBottom: 6 },
  castName: { color: "#fff", fontSize: 11, fontWeight: "700", textAlign: "center" },
  castChar: { color: GRAY, fontSize: 10, textAlign: "center" },
  simCard: { width: 100 }, simPoster: { width: 100, height: 150, borderRadius: 10, backgroundColor: CARD_BG, marginBottom: 4 },
  simRating: { position: "absolute", top: 6, left: 6, backgroundColor: "rgba(13,17,23,0.85)", borderRadius: 10, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1.5, borderColor: GREEN },
  simTitle: { color: "#c8d6e5", fontSize: 11, lineHeight: 14 },
});
const P = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#111d2e", borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 12, paddingHorizontal: 16, maxHeight: "75%", borderTopWidth: 1, borderColor: "#2a3a4a" },
  handle: { width: 40, height: 4, backgroundColor: "#2a3a4a", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  sheetTitle: { color: "#fff", fontSize: 18, fontWeight: "900", marginBottom: 4 },
  sheetSub: { color: GRAY, fontSize: 13, marginBottom: 18 },
  serverRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 12 },
  serverRowFirst: { backgroundColor: "rgba(0,200,83,0.06)", borderRadius: 12, paddingHorizontal: 10, marginHorizontal: -10 },
  serverRowInline: { flexDirection: "row", alignItems: "center", backgroundColor: CARD_BG, borderRadius: 12, padding: 12, marginBottom: 8, gap: 10 },
  serverIconWrap: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  serverIconWrapSm: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  serverLabel: { color: "#fff", fontSize: 15, fontWeight: "700" },
  serverLabelInline: { flex: 1, color: "#fff", fontSize: 14, fontWeight: "600" },
  serverSub: { color: GRAY, fontSize: 11, marginTop: 2 },
  badge: { borderRadius: 8, borderWidth: 1.5, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  sep: { height: 1, backgroundColor: "#1a2332" },
});
