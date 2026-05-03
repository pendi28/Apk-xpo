import { useState, useEffect } from "react";
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  Image, StyleSheet, ActivityIndicator, Dimensions, SafeAreaView, StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { tmdb } from "@/lib/tmdb";

const IMG = "https://image.tmdb.org/t/p/w342";
const { width } = Dimensions.get("window");
const CARD_W = (width - 52) / 3.3;
const BG = "#0d1117";
const CARD_BG = "#1a2332";
const GREEN = "#00c853";
const GRAY = "#8a9bb0";

interface MediaItem {
  id: number; title?: string; name?: string;
  poster_path?: string | null; vote_average?: number; media_type?: string;
}

function RatingBadge({ score }: { score?: number }) {
  if (!score) return null;
  return (
    <View style={S.badge}>
      <Text style={S.badgeText}>{Math.round(score * 10)}%</Text>
    </View>
  );
}

function Card({ item }: { item: MediaItem }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={S.card}
      onPress={() => router.push(`/tv/${item.id}` as never)}
      activeOpacity={0.85}
    >
      <View style={S.posterWrap}>
        {item.poster_path
          ? <Image source={{ uri: `${IMG}${item.poster_path}` }} style={S.poster} />
          : <View style={[S.poster, { alignItems: "center", justifyContent: "center" }]}>
              <Text style={{ color: "#444", fontSize: 9 }}>{item.name}</Text>
            </View>
        }
        <RatingBadge score={item.vote_average} />
      </View>
      <Text style={S.title} numberOfLines={2}>{item.name ?? item.title}</Text>
    </TouchableOpacity>
  );
}

export default function TvScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [popular, setPopular] = useState<MediaItem[]>([]);
  const [topRated, setTopRated] = useState<MediaItem[]>([]);
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    tmdb.popularTv().then(d => setPopular(d.results ?? []));
    tmdb.topTv().then(d => setTopRated(d.results ?? []));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (debouncedQ.length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
    tmdb.search(debouncedQ)
      .then(d => setSearchResults((d.results ?? []).filter((r: any) => r.media_type === "tv")))
      .catch(() => setSearchResults([]))
      .finally(() => setSearchLoading(false));
  }, [debouncedQ]);

  function Section({ title, items }: { title: string; items: MediaItem[] }) {
    if (!items.length) return null;
    return (
      <View style={{ marginBottom: 28 }}>
        <Text style={S.sectionTitle}>{title}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
          {items.map(i => <Card key={i.id} item={i} />)}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={S.container}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <SafeAreaView style={{ backgroundColor: BG }}>
        <View style={S.header}>
          <Text style={S.headerTitle}>Serial TV</Text>
          <TouchableOpacity onPress={() => setSearching(!searching)} style={S.searchIcon}>
            <Text style={{ color: "#fff", fontSize: 18 }}>🔍</Text>
          </TouchableOpacity>
        </View>
        {searching && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <TextInput
              style={S.input}
              placeholder="Cari serial TV..."
              placeholderTextColor={GRAY}
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
          </View>
        )}
      </SafeAreaView>

      {searching && debouncedQ.length > 1 ? (
        <ScrollView contentContainerStyle={S.grid}>
          {searchLoading
            ? <ActivityIndicator color={GREEN} />
            : searchResults.map(i => (
              <TouchableOpacity key={i.id} style={{ width: CARD_W }} onPress={() => router.push(`/tv/${i.id}` as never)} activeOpacity={0.85}>
                <View style={S.posterWrap}>
                  {i.poster_path
                    ? <Image source={{ uri: `${IMG}${i.poster_path}` }} style={S.poster} />
                    : <View style={[S.poster, { alignItems: "center", justifyContent: "center" }]}><Text style={{ color: "#444", fontSize: 9 }}>{i.name}</Text></View>
                  }
                  <RatingBadge score={i.vote_average} />
                </View>
                <Text style={S.title} numberOfLines={2}>{i.name ?? i.title}</Text>
              </TouchableOpacity>
            ))
          }
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 90, paddingTop: 8 }}>
          {!popular.length && !topRated.length
            ? <ActivityIndicator color={GREEN} style={{ marginTop: 60 }} />
            : <>
                <Section title="Populer" items={popular} />
                <Section title="Penilaian Teratas" items={topRated} />
              </>
          }
        </ScrollView>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
  },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "900" },
  searchIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: CARD_BG, alignItems: "center", justifyContent: "center",
  },
  input: {
    backgroundColor: CARD_BG, color: "#fff", borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 15,
  },
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: "800", marginBottom: 12, paddingHorizontal: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, paddingBottom: 100, gap: 10 },
  card: { width: CARD_W },
  posterWrap: { position: "relative", borderRadius: 10, overflow: "hidden" },
  poster: { width: CARD_W, aspectRatio: 2 / 3, borderRadius: 10, backgroundColor: CARD_BG },
  badge: {
    position: "absolute", top: 6, left: 6,
    backgroundColor: "rgba(13,17,23,0.85)", borderRadius: 12,
    paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1.5, borderColor: GREEN,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  title: { color: "#c8d6e5", fontSize: 11, marginTop: 6, lineHeight: 15 },
});
