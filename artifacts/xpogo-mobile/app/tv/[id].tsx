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

function buildZxcTvUrl(id: number, serverNum: number, season: number, ep: number, settings: Record<string, string> | null) {
  const color = (settings?.playerColor ?? "00c853").replace("#", "");
  const autoplay = settings?.autoplay !== "false" ? "true" : "false";
  return `https://zxcstream.xyz/player/tv/${id}?server=${serverNum}&color=${color}&autoplay=${autoplay}&back=true&season=${season}&episode=${ep}`;
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
              <Text style={P.sheetTitle}>📺 Pilih Server</Text>
              <Text style={P.sheetSub} numberOfLines={1}>{title}</Text>
              <FlatList data={servers} keyExtractor={item => item.id} contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item, index }) => (
                  <TouchableOpacity style={[P.serverRow, index === 0 && P.serverRowFirst]} onPress={() => onSelect(item)} activeOpacity={0.75}>
                    <View style={[P.serverIconWrap, { backgroundColor: index === 0 ? "#0a3d1f" : CARD_BG }]}><Text style={{ fontSize: 20 }}>{item.icon}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={P.serverLabel}>{item.label}</Text>
                      {item.sub && <Text style={P.serverSub} numberOfLines={1}>{item.sub}</Text>}
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

export default function TvDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const tvId = Number(id);

  const [tv, setTv] = useState<any>(null);
  const [settings, setSettings] = useState<Record<string, string> | null>(null);
  const [embeds, setEmbeds] = useState<EmbedRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);

  const loadFirebaseData = useCallback(async () => {
    await Promise.all([
      fb.getSettings().then(setSettings).catch(() => {}),
      fb.getEmbeds().then((list: any[]) => {
        setEmbeds(list.filter(e => e.active && e.type === "series" && e.tmdbId === tvId));
      }).catch(() => {}),
    ]);
  }, [id, tvId]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      tmdb.tvDetail(tvId).then(d => { setTv(d); }).catch(() => {}),
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

  if (isLoading && !tv) {
    return <View style={[S.container, { alignItems: "center", justifyContent: "center" }]}><ActivityIndicator color={GREEN} size="large" /></View>;
  }

  const t = tv;
  const title = t?.name ?? t?.original_name ?? "Serial TV";
  const overview = t?.overview ?? "";
  const backdropUrl = t?.backdrop_path ? `${IMG}/original${t.backdrop_path}` : "";
  const posterUrl = t?.poster_path ? `${IMG}/w342${t.poster_path}` : "";
  const year = t?.first_air_date?.slice(0, 4);
  const seasons = (t?.seasons ?? []).filter((s: any) => s.season_number > 0);
  const cast = t?.credits?.cast?.slice(0, 10) ?? [];
  const similar = t?.similar?.results?.slice(0, 10) ?? [];
  const currentSeason = seasons.find((s: any) => s.season_number === selectedSeason) ?? seasons[0];
  const episodeCount = currentSeason?.episode_count ?? 20;
  const episodes = Array.from({ length: episodeCount }, (_, i) => i + 1);

  const buildServers = (): ServerOption[] => {
    const servers: ServerOption[] = [
      { id: "s1", label: "Server 1 — Utama", url: buildZxcTvUrl(tvId, 1, selectedSeason, selectedEpisode, settings), badge: "HD", badgeColor: GREEN, icon: "🖥️" },
      { id: "s2", label: "Server 2", url: buildZxcTvUrl(tvId, 2, selectedSeason, selectedEpisode, settings), badge: "HD", badgeColor: "#3b82f6", icon: "🖥️" },
      { id: "s3", label: "Server 3", url: buildZxcTvUrl(tvId, 3, selectedSeason, selectedEpisode, settings), badge: "ALT", badgeColor: "#8b5cf6", icon: "🖥️" },
    ];
    embeds.forEach((e, i) => servers.push({ id: e.id, label: e.title || `Embed ${i + 1}`, url: e.url, badge: "EMBED", badgeColor: "#f59e0b", icon: "📡", sub: e.sub ? `Sub: ${e.sub}` : undefined }));
    return servers;
  };

  const openPlayer = (url: string) =>
    router.push(`/player?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&tmdbId=${tvId}&mediaType=tv&season=${selectedSeason}&episode=${selectedEpisode}` as never);

  const servers = buildServers();
  const hasMultiple = servers.length > 1;

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
              : <View style={[S.poster, { backgroundColor: CARD_BG, alignItems: "center", justifyContent: "center" }]}><Text style={{ color: GRAY, fontSize: 30 }}>📺</Text></View>
            }
          </View>
          <View style={S.metaCol}>
            <Text style={S.title} numberOfLines={3}>{title}</Text>
            <View style={S.metaRow}>
              {year && <Text style={S.metaChip}>📅 {year}</Text>}
              {seasons.length > 0 && <Text style={S.metaChip}>📂 {seasons.length} Musim</Text>}
            </View>
            {t?.vote_average ? <RatingCircle score={t.vote_average} /> : null}
          </View>
        </View>

        {t?.genres && t.genres.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.genreRow}>
            {t.genres.map((g: any) => <View key={g.id} style={S.genreChip}><Text style={S.genreText}>{g.name}</Text></View>)}
          </ScrollView>
        )}

        <View style={S.section}>
          <Text style={S.sectionTitle}>Sinopsis</Text>
          <Text style={S.overview}>{overview || "Tidak ada deskripsi."}</Text>
        </View>

        {seasons.length > 0 && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Musim</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
              {seasons.map((s: any) => (
                <TouchableOpacity key={s.season_number}
                  style={[S.seasonChip, selectedSeason === s.season_number && S.seasonChipActive]}
                  onPress={() => { setSelectedSeason(s.season_number); setSelectedEpisode(1); }} activeOpacity={0.8}>
                  <Text style={[S.seasonChipText, selectedSeason === s.season_number && { color: "#fff" }]}>Musim {s.season_number}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={S.section}>
          <Text style={S.sectionTitle}>Episode — Musim {selectedSeason}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            {episodes.map(ep => (
              <TouchableOpacity key={ep}
                style={[S.epChip, selectedEpisode === ep && S.epChipActive]}
                onPress={() => setSelectedEpisode(ep)} activeOpacity={0.8}>
                <Text style={[S.epChipText, selectedEpisode === ep && { color: "#fff" }]}>{ep}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginHorizontal: 16, marginBottom: 16 }}>
          <TouchableOpacity style={[S.watchBtn, { flex: 1, marginHorizontal: 0, marginBottom: 0 }]}
            onPress={() => hasMultiple ? setPickerVisible(true) : openPlayer(servers[0]?.url ?? "")} activeOpacity={0.85}>
            <Text style={S.watchBtnText}>{`▶  S${selectedSeason} E${selectedEpisode}${hasMultiple ? `  ·  ${servers.length} Server` : ""}`}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.shareBtn} onPress={() => setShareVisible(true)} activeOpacity={0.8}>
            <Text style={{ fontSize: 20 }}>📤</Text>
          </TouchableOpacity>
        </View>

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
            <Text style={S.sectionTitle}>Serial Serupa</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
              {similar.map((s: any) => (
                <TouchableOpacity key={s.id} style={S.simCard} onPress={() => router.replace(`/tv/${s.id}` as never)} activeOpacity={0.85}>
                  <Image source={{ uri: s.poster_path ? `${IMG}/w185${s.poster_path}` : "" }} style={S.simPoster} />
                  <View style={S.simRating}><Text style={{ color: GREEN, fontSize: 9, fontWeight: "800" }}>{Math.round((s.vote_average ?? 0) * 10)}%</Text></View>
                  <Text style={S.simTitle} numberOfLines={2}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <CommentsSection mediaType="tv" tmdbId={tvId} />
      </ScrollView>

      <ServerPicker visible={pickerVisible} onClose={() => setPickerVisible(false)} servers={servers}
        title={`${title} S${selectedSeason} E${selectedEpisode}`}
        onSelect={sv => { setPickerVisible(false); setTimeout(() => openPlayer(sv.url), 200); }} />
      <ShareSheet visible={shareVisible} onClose={() => setShareVisible(false)} title={title} year={year}
        overview={overview} posterUrl={posterUrl} tmdbId={tvId} mediaType="tv" />
    </View>
  );
}

const BACK_H = width * 0.46; const POSTER_W = 100; const POSTER_H = POSTER_W * 1.5;
const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  backdropWrap: { width, height: BACK_H },
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
  genreRow: { paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  genreChip: { borderRadius: 20, borderWidth: 1.5, borderColor: "#2a3a4a", paddingHorizontal: 14, paddingVertical: 6 },
  genreText: { color: GRAY, fontSize: 12, fontWeight: "600" },
  section: { marginBottom: 24 },
  sectionTitle: { color: "#fff", fontSize: 17, fontWeight: "800", paddingHorizontal: 16, marginBottom: 10 },
  overview: { color: "#b0c0d0", fontSize: 14, lineHeight: 22, paddingHorizontal: 16 },
  seasonChip: { borderRadius: 20, borderWidth: 1.5, borderColor: "#2a3a4a", paddingHorizontal: 16, paddingVertical: 8 },
  seasonChipActive: { backgroundColor: GREEN, borderColor: GREEN },
  seasonChipText: { color: GRAY, fontSize: 13, fontWeight: "700" },
  epChip: { width: 40, height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: "#2a3a4a", alignItems: "center", justifyContent: "center" },
  epChipActive: { backgroundColor: GREEN, borderColor: GREEN },
  epChipText: { color: GRAY, fontSize: 13, fontWeight: "700" },
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
  serverIconWrap: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  serverLabel: { color: "#fff", fontSize: 15, fontWeight: "700" },
  serverSub: { color: GRAY, fontSize: 11, marginTop: 2 },
  badge: { borderRadius: 8, borderWidth: 1.5, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  sep: { height: 1, backgroundColor: "#1a2332" },
});
