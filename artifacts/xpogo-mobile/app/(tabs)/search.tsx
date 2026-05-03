import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar } from "react-native";
import { useRouter } from "expo-router";

const BG = "#0d1117";
const CARD_BG = "#1a2332";
const GREEN = "#00c853";
const GRAY = "#8a9bb0";

const LIBRARY = [
  { icon: "❤️", label: "Favorit" },
  { icon: "🔖", label: "Daftar Tonton" },
  { icon: "⭐", label: "Dinilai" },
  { icon: "📋", label: "Daftar Saya" },
];

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <View style={S.container}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <SafeAreaView style={{ backgroundColor: BG }}>
        <View style={S.header}>
          <Text style={S.headerTitle}>Profil</Text>
          <TouchableOpacity style={S.notifBtn} activeOpacity={0.7}>
            <Text style={{ fontSize: 18 }}>🔔</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* TAMU CARD */}
        <View style={S.tamuCard}>
          <View style={S.avatar}>
            <Text style={{ fontSize: 30 }}>👤</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={S.tamuName}>Tamu</Text>
            <Text style={S.tamuSub}>Admin hanya lewat web</Text>
          </View>
          <TouchableOpacity style={S.masukBtn} activeOpacity={0.8} onPress={() => router.push("/" as never)}>
            <Text style={S.masukText}>Beranda</Text>
          </TouchableOpacity>
        </View>

        {/* PERPUSTAKAAN SAYA */}
        <Text style={S.sectionLabel}>PERPUSTAKAAN SAYA</Text>
        <View style={S.menuCard}>
          {LIBRARY.map((item, i) => (
            <View key={item.label}>
              <TouchableOpacity style={S.menuRow} activeOpacity={0.7}>
                <View style={S.menuIcon}><Text style={{ fontSize: 16 }}>{item.icon}</Text></View>
                <Text style={S.menuLabel}>{item.label}</Text>
                <Text style={{ color: GRAY, fontSize: 16 }}>🔒</Text>
              </TouchableOpacity>
              {i < LIBRARY.length - 1 && <View style={S.divider} />}
            </View>
          ))}
        </View>

        {/* JELAJAHI */}
        <Text style={S.sectionLabel}>JELAJAHI</Text>
        <View style={S.menuCard}>
          <TouchableOpacity style={S.menuRow} activeOpacity={0.7}>
            <View style={[S.menuIcon, { backgroundColor: "#0a3d1f" }]}><Text style={{ fontSize: 16 }}>🧭</Text></View>
            <Text style={S.menuLabel}>Jelajahi</Text>
            <Text style={{ color: GRAY, fontSize: 18 }}>›</Text>
          </TouchableOpacity>
          <View style={S.divider} />
          <TouchableOpacity style={S.menuRow} activeOpacity={0.7}>
            <View style={S.menuIcon}><Text style={{ fontSize: 16 }}>🕐</Text></View>
            <Text style={S.menuLabel}>Baru Dilihat</Text>
            <Text style={{ color: GRAY, fontSize: 16 }}>🔒</Text>
          </TouchableOpacity>
        </View>

        {/* ADMIN PANEL SHORTCUT */}
        <Text style={S.sectionLabel}>KHUSUS ADMIN</Text>
        <View style={S.menuCard}>
          <TouchableOpacity style={S.menuRow} activeOpacity={0.7} onPress={() => router.push("/" as never)}>
            <View style={[S.menuIcon, { backgroundColor: "#0a3d1f" }]}><Text style={{ fontSize: 16 }}>🛡️</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={S.menuLabel}>Admin hanya di web</Text>
              <Text style={{ color: GRAY, fontSize: 11, marginTop: 2 }}>Gunakan web untuk login dan kelola konten</Text>
            </View>
            <Text style={{ color: GRAY, fontSize: 18 }}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "900" },
  notifBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: CARD_BG, alignItems: "center", justifyContent: "center" },

  tamuCard: { flexDirection: "row", alignItems: "center", gap: 14, marginHorizontal: 16, marginBottom: 24, backgroundColor: CARD_BG, borderRadius: 14, padding: 16 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#2a3a4a", alignItems: "center", justifyContent: "center" },
  tamuName: { color: "#fff", fontSize: 18, fontWeight: "800" },
  tamuSub: { color: GRAY, fontSize: 12, marginTop: 2 },
  masukBtn: { backgroundColor: GREEN, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  masukText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  sectionLabel: { color: GRAY, fontSize: 11, fontWeight: "700", letterSpacing: 1, paddingHorizontal: 16, marginBottom: 8, marginTop: 4 },
  menuCard: { backgroundColor: CARD_BG, borderRadius: 14, marginHorizontal: 16, marginBottom: 20, overflow: "hidden" },
  menuRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 14 },
  menuIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: "#2a3a4a", alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, color: "#fff", fontSize: 15, fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#0d1117", marginLeft: 66 },
});
