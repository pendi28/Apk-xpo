import { useState, useEffect, useCallback, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  View, StyleSheet, TouchableOpacity, Text,
  StatusBar, ActivityIndicator, Dimensions, ScrollView, BackHandler, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WebView from "react-native-webview";
import * as ScreenOrientation from "expo-screen-orientation";
import * as NavigationBar from "expo-navigation-bar";
import { fb } from "@/lib/firebase";

const BG = "#0d1117";
const CARD_BG = "#1a2332";
const GREEN = "#00c853";
const GRAY = "#8a9bb0";

interface EmbedRecord { id: string; title: string; url: string; type: string; active: boolean; tmdbId?: number; sub?: string; }
interface ServerItem { id: string; label: string; url: string; badge: string; badgeColor: string; icon: string; sub?: string; }

function buildZxcMovieUrl(id: number, serverNum: number) {
  return `https://zxcstream.xyz/player/movie/${id}?server=${serverNum}&color=00c853&autoplay=true&back=true`;
}
function buildZxcTvUrl(id: number, serverNum: number, season: number, episode: number) {
  return `https://zxcstream.xyz/player/tv/${id}?server=${serverNum}&color=00c853&autoplay=true&back=true&season=${season}&episode=${episode}`;
}

async function setImmersive(on: boolean) {
  if (Platform.OS !== "android") return;
  try {
    await NavigationBar.setVisibilityAsync(on ? "hidden" : "visible");
    if (on) await NavigationBar.setBehaviorAsync("overlay-swipe");
  } catch {}
}

export default function PlayerScreen() {
  const params = useLocalSearchParams<{ url: string; title?: string; tmdbId?: string; mediaType?: string; season?: string; episode?: string; }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeUrl, setActiveUrl] = useState(params.url ? decodeURIComponent(params.url) : "");
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [screenSize, setScreenSize] = useState(Dimensions.get("window"));
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [loadingServers, setLoadingServers] = useState(false);

  const tmdbId = params.tmdbId ? Number(params.tmdbId) : null;
  const mediaType = params.mediaType ?? "movie";
  const season = params.season ? Number(params.season) : 1;
  const episode = params.episode ? Number(params.episode) : 1;
  const title = params.title ? decodeURIComponent(params.title) : "";

  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => setScreenSize(window));
    return () => sub?.remove();
  }, []);

  const enterFullscreen = useCallback(async () => {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    await setImmersive(true);
    setFullscreen(true);
  }, []);

  const exitFullscreen = useCallback(async () => {
    setFullscreen(false);
    await setImmersive(false);
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  }, []);

  useEffect(() => {
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (fullscreen) { exitFullscreen(); return true; }
      return false;
    });
    return () => handler.remove();
  }, [fullscreen, exitFullscreen]);

  useEffect(() => {
    return () => {
      setImmersive(false);
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  const buildServers = useCallback((embeds: EmbedRecord[]): ServerItem[] => {
    const list: ServerItem[] = [];
    if (!tmdbId) return list;
    if (mediaType === "movie") {
      list.push(
        { id: "s1", label: "Server 1 — Utama", url: buildZxcMovieUrl(tmdbId, 1), badge: "HD", badgeColor: GREEN, icon: "🖥️" },
        { id: "s2", label: "Server 2", url: buildZxcMovieUrl(tmdbId, 2), badge: "HD", badgeColor: "#3b82f6", icon: "🖥️" },
        { id: "s3", label: "Server 3", url: buildZxcMovieUrl(tmdbId, 3), badge: "ALT", badgeColor: "#8b5cf6", icon: "🖥️" },
      );
    } else {
      list.push(
        { id: "s1", label: "Server 1 — Utama", url: buildZxcTvUrl(tmdbId, 1, season, episode), badge: "HD", badgeColor: GREEN, icon: "🖥️" },
        { id: "s2", label: "Server 2", url: buildZxcTvUrl(tmdbId, 2, season, episode), badge: "HD", badgeColor: "#3b82f6", icon: "🖥️" },
        { id: "s3", label: "Server 3", url: buildZxcTvUrl(tmdbId, 3, season, episode), badge: "ALT", badgeColor: "#8b5cf6", icon: "🖥️" },
      );
    }
    embeds.forEach((e, i) => list.push({ id: e.id, label: e.title || `Embed ${i + 1}`, url: e.url, badge: "EMBED", badgeColor: "#f59e0b", icon: "📡", sub: e.sub ? `Sub: ${e.sub}` : undefined }));
    return list;
  }, [tmdbId, mediaType, season, episode]);

  useEffect(() => {
    if (!tmdbId) return;
    setLoadingServers(true);
    fb.getEmbeds()
      .then((list: any[]) => {
        const matched = list.filter(e => e.active && e.tmdbId === tmdbId && (mediaType === "movie" ? e.type === "movie" : e.type === "series"));
        setServers(buildServers(matched));
      })
      .catch(() => setServers(buildServers([])))
      .finally(() => setLoadingServers(false));
  }, [tmdbId, mediaType, season, episode, buildServers]);

  if (fullscreen) {
    const fsW = Math.max(screenSize.width, screenSize.height);
    const fsH = Math.min(screenSize.width, screenSize.height);
    return (
      <View style={{ flex: 1, width: fsW, height: fsH, backgroundColor: "#000" }}>
        <StatusBar hidden translucent />
        <WebView
          key={activeUrl + "_fs"}
          source={{ uri: activeUrl }}
          style={{ flex: 1, backgroundColor: "#000" }}
          allowsFullscreenVideo
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={["*"]}
          scrollEnabled={false}
        />
        <TouchableOpacity style={S.exitFsBtn} onPress={exitFullscreen} activeOpacity={0.8}>
          <Text style={S.exitFsText}>⤡ Keluar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const PLAYER_H = screenSize.width * (9 / 16);

  if (!activeUrl) {
    return (
      <View style={[S.container, { paddingTop: insets.top }]}>
        <TouchableOpacity style={S.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={S.backText}>✕ Kembali</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: GRAY, fontSize: 14 }}>URL tidak ditemukan.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={BG} translucent={false} />
      <View style={S.topBar}>
        <TouchableOpacity style={S.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={S.backText}>‹ Kembali</Text>
        </TouchableOpacity>
        <TouchableOpacity style={S.fsBtn} onPress={enterFullscreen} activeOpacity={0.8}>
          <Text style={S.fsBtnText}>⛶ Layar Penuh</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: PLAYER_H, backgroundColor: "#000" }}>
        <WebView key={activeUrl} source={{ uri: activeUrl }} style={{ flex: 1, backgroundColor: "#000" }}
          allowsFullscreenVideo allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled domStorageEnabled originWhitelist={["*"]}
          onLoadStart={() => setLoading(true)} onLoadEnd={() => setLoading(false)} />
        {loading && <ActivityIndicator color={GREEN} size="large" style={StyleSheet.absoluteFill} />}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {title ? <Text style={S.titleText} numberOfLines={2}>{title}</Text> : null}

        {loadingServers
          ? <ActivityIndicator color={GREEN} style={{ marginTop: 16 }} />
          : servers.length > 1
            ? <>
                <Text style={S.sectionLabel}>🖥️ Ganti Server</Text>
                {servers.map((sv, i) => (
                  <TouchableOpacity key={sv.id} style={[S.serverRow, activeUrl === sv.url && S.serverRowActive]}
                    onPress={() => setActiveUrl(sv.url)} activeOpacity={0.8}>
                    <View style={[S.serverIcon, { backgroundColor: i === 0 ? "#0a3d1f" : CARD_BG }]}>
                      <Text style={{ fontSize: 16 }}>{sv.icon}</Text>
                    </View>
                    <Text style={S.serverLabel}>{sv.label}</Text>
                    <View style={[S.badge, { backgroundColor: sv.badgeColor + "22", borderColor: sv.badgeColor }]}>
                      <Text style={[S.badgeText, { color: sv.badgeColor }]}>{sv.badge}</Text>
                    </View>
                    {activeUrl === sv.url && <Text style={{ color: GREEN, fontSize: 12, fontWeight: "700" }}>▶ Aktif</Text>}
                  </TouchableOpacity>
                ))}
              </>
            : null
        }
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10 },
  backBtn: { backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  backText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  fsBtn: { backgroundColor: "#1a2332", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  fsBtnText: { color: GREEN, fontSize: 13, fontWeight: "700" },
  exitFsBtn: { position: "absolute", top: 20, right: 16, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  exitFsText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  titleText: { color: "#fff", fontSize: 16, fontWeight: "800", marginBottom: 16, lineHeight: 22 },
  sectionLabel: { color: "#c8d6e5", fontSize: 14, fontWeight: "700", marginBottom: 10 },
  serverRow: { flexDirection: "row", alignItems: "center", backgroundColor: CARD_BG, borderRadius: 12, padding: 12, marginBottom: 8, gap: 10, borderWidth: 1.5, borderColor: "transparent" },
  serverRowActive: { borderColor: GREEN },
  serverIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  serverLabel: { flex: 1, color: "#fff", fontSize: 14, fontWeight: "600" },
  badge: { borderRadius: 8, borderWidth: 1.5, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: "800" },
});
