import { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  TouchableWithoutFeedback, Share, Linking, Alert,
  ScrollView, Image, ActivityIndicator,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

const BG = "#0d1117";
const CARD_BG = "#1a2332";
const GREEN = "#00c853";
const GRAY = "#8a9bb0";

const WEB_DOMAIN = process.env.EXPO_PUBLIC_WEB_DOMAIN || "xpogo.web.app";

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  year?: string;
  overview?: string;
  posterUrl?: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
}

export default function ShareSheet({ visible, onClose, title, year, overview, posterUrl, tmdbId, mediaType }: Props) {
  const [sharingPoster, setSharingPoster] = useState(false);

  const webUrl = `https://${WEB_DOMAIN}/${mediaType}/${tmdbId}`;
  const shareText = `🎬 ${title}${year ? ` (${year})` : ""}\n\n${overview ? overview.slice(0, 120) + "..." : ""}\n\n${webUrl}`;

  const shareNative = async () => {
    try {
      await Share.share({ message: shareText, title });
    } catch { /* silent */ }
  };

  const copyLink = async () => {
    await Clipboard.setStringAsync(webUrl);
    Alert.alert("✅ Disalin!", "Link berhasil disalin ke clipboard.");
    onClose();
  };

  const shareWhatsApp = () => {
    const url = `whatsapp://send?text=${encodeURIComponent(shareText)}`;
    Linking.openURL(url).catch(() => Alert.alert("WhatsApp tidak tersedia"));
    onClose();
  };

  const sharePoster = async () => {
    if (!posterUrl) { Alert.alert("Tidak ada poster"); return; }
    setSharingPoster(true);
    try {
      const dest = (FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? "") + `poster_${tmdbId}.jpg`;
      const { uri } = await FileSystem.downloadAsync(posterUrl, dest);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: "image/jpeg", dialogTitle: title });
      } else {
        Alert.alert("Sharing tidak tersedia di perangkat ini.");
      }
    } catch { Alert.alert("Gagal", "Gagal berbagi poster."); }
    finally { setSharingPoster(false); }
    onClose();
  };

  const OPTIONS = [
    { icon: "📤", label: "Bagikan", color: GREEN, onPress: shareNative },
    { icon: "🔗", label: "Salin Link", color: "#3b82f6", onPress: copyLink },
    { icon: "💬", label: "WhatsApp", color: "#25D366", onPress: shareWhatsApp },
    { icon: "🖼️", label: "Bagikan Poster", color: "#f59e0b", onPress: sharePoster },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={S.overlay}>
          <TouchableWithoutFeedback>
            <View style={S.sheet}>
              <View style={S.handle} />
              <View style={S.header}>
                {posterUrl && <Image source={{ uri: posterUrl }} style={S.poster} />}
                <View style={{ flex: 1 }}>
                  <Text style={S.title} numberOfLines={2}>{title}</Text>
                  {year && <Text style={S.year}>{year}</Text>}
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.options}>
                {OPTIONS.map(opt => (
                  <TouchableOpacity key={opt.label} style={S.optBtn} onPress={opt.onPress} activeOpacity={0.8} disabled={sharingPoster}>
                    <View style={[S.optIcon, { backgroundColor: opt.color + "22", borderColor: opt.color }]}>
                      {sharingPoster && opt.label === "Bagikan Poster"
                        ? <ActivityIndicator color={opt.color} size="small" />
                        : <Text style={{ fontSize: 22 }}>{opt.icon}</Text>
                      }
                    </View>
                    <Text style={S.optLabel}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity style={S.cancelBtn} onPress={onClose} activeOpacity={0.8}>
                <Text style={S.cancelText}>Batal</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const S = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#111d2e", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 16, paddingBottom: 32, borderTopWidth: 1, borderColor: "#2a3a4a" },
  handle: { width: 40, height: 4, backgroundColor: "#2a3a4a", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  header: { flexDirection: "row", gap: 12, marginBottom: 20, alignItems: "center" },
  poster: { width: 60, height: 90, borderRadius: 8, backgroundColor: CARD_BG },
  title: { color: "#fff", fontSize: 16, fontWeight: "800", lineHeight: 22 },
  year: { color: GRAY, fontSize: 13, marginTop: 4 },
  options: { paddingVertical: 8, gap: 16, paddingHorizontal: 4 },
  optBtn: { alignItems: "center", gap: 8, minWidth: 72 },
  optIcon: { width: 54, height: 54, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  optLabel: { color: "#c8d6e5", fontSize: 11, fontWeight: "600", textAlign: "center" },
  cancelBtn: { backgroundColor: CARD_BG, borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  cancelText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
