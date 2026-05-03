import { useState, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { fb } from "@/lib/firebase";

const BG = "#0d1117";
const CARD_BG = "#1a2332";
const GREEN = "#00c853";
const GRAY = "#8a9bb0";

interface Reply { id: string; name: string; text: string; createdAt: number; }
interface Comment {
  id: string; name: string; text: string;
  createdAt: number; likes: number;
  replies?: Record<string, Omit<Reply, "id">>;
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}d lalu`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}

function getInitial(name: string): string {
  return (name?.trim()?.[0] ?? "?").toUpperCase();
}

function avatarColor(name: string): string {
  const colors = ["#2563eb", "#7c3aed", "#db2777", "#dc2626", "#ea580c", "#16a34a", "#0891b2"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % colors.length;
  return colors[h];
}

function ReplyItem({ reply }: { reply: Reply }) {
  return (
    <View style={S.replyItem}>
      <View style={[S.avatarSm, { backgroundColor: avatarColor(reply.name) }]}>
        <Text style={S.avatarTextSm}>{getInitial(reply.name)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={S.commentMeta}>
          <Text style={S.commentName}>{reply.name}</Text>
          <Text style={S.commentTime}>{timeAgo(reply.createdAt)}</Text>
        </View>
        <Text style={S.commentText}>{reply.text}</Text>
      </View>
    </View>
  );
}

function CommentItem({ comment, mediaType, tmdbId, onLiked }: {
  comment: Comment; mediaType: string; tmdbId: number; onLiked: (id: string, current: number) => void;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const [replyInput, setReplyInput] = useState(false);
  const [replyName, setReplyName] = useState("");
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const replies: Reply[] = comment.replies
    ? Object.entries(comment.replies).map(([id, r]) => ({ id, ...r })).sort((a, b) => a.createdAt - b.createdAt)
    : [];

  const submitReply = async () => {
    if (!replyName.trim() || !replyText.trim()) {
      Alert.alert("Lengkapi", "Nama dan balasan tidak boleh kosong.");
      return;
    }
    setSubmitting(true);
    try {
      await fb.addReply(mediaType, tmdbId, comment.id, {
        name: replyName, text: replyText, createdAt: Date.now(),
      });
      setReplyText(""); setReplyInput(false); setShowReplies(true);
      Alert.alert("✅ Terkirim", "Balasan kamu sudah dikirim!");
    } catch { Alert.alert("Error", "Gagal mengirim balasan."); }
    finally { setSubmitting(false); }
  };

  return (
    <View style={S.commentCard}>
      <View style={S.commentRow}>
        <View style={[S.avatar, { backgroundColor: avatarColor(comment.name) }]}>
          <Text style={S.avatarText}>{getInitial(comment.name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={S.commentMeta}>
            <Text style={S.commentName}>{comment.name}</Text>
            <Text style={S.commentTime}>{timeAgo(comment.createdAt)}</Text>
          </View>
          <Text style={S.commentText}>{comment.text}</Text>

          <View style={S.commentActions}>
            <TouchableOpacity style={S.actionBtn} onPress={() => onLiked(comment.id, comment.likes || 0)} activeOpacity={0.7}>
              <Text style={S.actionText}>👍 {comment.likes || 0}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={S.actionBtn} onPress={() => { setReplyInput(r => !r); setShowReplies(true); }} activeOpacity={0.7}>
              <Text style={[S.actionText, { color: GREEN }]}>↩ Balas</Text>
            </TouchableOpacity>
            {replies.length > 0 && (
              <TouchableOpacity style={S.actionBtn} onPress={() => setShowReplies(r => !r)} activeOpacity={0.7}>
                <Text style={[S.actionText, { color: "#3b82f6" }]}>
                  {showReplies ? "▲ Sembunyikan" : `▼ ${replies.length} Balasan`}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {replyInput && (
            <View style={S.replyForm}>
              <TextInput style={S.replyInput} placeholder="Nama kamu..." placeholderTextColor={GRAY} value={replyName} onChangeText={setReplyName} maxLength={50} />
              <TextInput style={[S.replyInput, { marginTop: 6 }]} placeholder="Tulis balasan..." placeholderTextColor={GRAY} value={replyText} onChangeText={setReplyText} multiline maxLength={300} />
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <TouchableOpacity style={[S.replyBtn, { backgroundColor: GREEN }]} onPress={submitReply} disabled={submitting} activeOpacity={0.8}>
                  {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={S.replyBtnText}>Kirim Balasan</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={[S.replyBtn, { backgroundColor: "#2a3a4a" }]} onPress={() => { setReplyInput(false); setReplyText(""); }} activeOpacity={0.8}>
                  <Text style={S.replyBtnText}>Batal</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {showReplies && replies.length > 0 && (
            <View style={S.repliesList}>
              {replies.map(r => <ReplyItem key={r.id} reply={r} />)}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

export default function CommentsSection({ mediaType, tmdbId }: { mediaType: "movie" | "tv"; tmdbId: number }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const data = await fb.getComments(mediaType, tmdbId);
      setComments((data as Comment[]).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    } catch { setComments([]); }
    finally { setLoading(false); }
  }, [mediaType, tmdbId]);

  useEffect(() => { load(); }, [load]);

  const submitComment = async () => {
    if (!name.trim() || !text.trim()) {
      Alert.alert("Lengkapi", "Nama dan komentar tidak boleh kosong."); return;
    }
    setSubmitting(true);
    try {
      await fb.addComment(mediaType, tmdbId, { name, text, likes: 0, createdAt: Date.now() });
      setText(""); await load();
      Alert.alert("✅ Terkirim", "Komentar kamu sudah ditambahkan!");
    } catch { Alert.alert("Error", "Gagal mengirim komentar."); }
    finally { setSubmitting(false); }
  };

  const likeComment = async (commentId: string, current: number) => {
    if (likedIds.has(commentId)) { Alert.alert("", "Kamu sudah menyukai komentar ini."); return; }
    try {
      await fb.likeComment(mediaType, tmdbId, commentId, current);
      setLikedIds(prev => new Set([...prev, commentId]));
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, likes: current + 1 } : c));
    } catch { /* silent */ }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={S.container}>
        <Text style={S.title}>💬 Komentar ({comments.length})</Text>
        <View style={S.form}>
          <TextInput style={S.input} placeholder="Nama kamu..." placeholderTextColor={GRAY} value={name} onChangeText={setName} maxLength={50} />
          <TextInput style={[S.input, S.textArea]} placeholder="Tulis komentar..." placeholderTextColor={GRAY} value={text} onChangeText={setText} multiline numberOfLines={3} maxLength={500} />
          <TouchableOpacity style={[S.submitBtn, submitting && { opacity: 0.6 }]} onPress={submitComment} disabled={submitting} activeOpacity={0.8}>
            {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={S.submitBtnText}>✉ Kirim Komentar</Text>}
          </TouchableOpacity>
        </View>
        {loading
          ? <ActivityIndicator color={GREEN} style={{ marginTop: 24 }} />
          : comments.length === 0
            ? <View style={S.empty}><Text style={{ fontSize: 32 }}>🗨️</Text><Text style={S.emptyText}>Belum ada komentar. Jadilah yang pertama!</Text></View>
            : comments.map(c => <CommentItem key={c.id} comment={c} mediaType={mediaType} tmdbId={tmdbId} onLiked={likeComment} />)
        }
      </View>
    </KeyboardAvoidingView>
  );
}

const S = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingBottom: 24 },
  title: { color: "#fff", fontSize: 17, fontWeight: "800", marginBottom: 14 },
  form: { backgroundColor: CARD_BG, borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: "#2a3a4a" },
  input: { backgroundColor: BG, color: "#fff", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: "#2a3a4a", marginBottom: 8 },
  textArea: { minHeight: 80, textAlignVertical: "top", paddingTop: 10 },
  submitBtn: { backgroundColor: GREEN, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  submitBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  commentCard: { marginBottom: 14 },
  commentRow: { flexDirection: "row", gap: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  commentMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  commentName: { color: "#fff", fontWeight: "700", fontSize: 13 },
  commentTime: { color: GRAY, fontSize: 11 },
  commentText: { color: "#c8d6e5", fontSize: 14, lineHeight: 20 },
  commentActions: { flexDirection: "row", gap: 14, marginTop: 8 },
  actionBtn: { paddingVertical: 2 },
  actionText: { color: GRAY, fontSize: 12, fontWeight: "600" },
  replyForm: { backgroundColor: BG, borderRadius: 10, padding: 10, marginTop: 10, borderWidth: 1, borderColor: "#2a3a4a" },
  replyInput: { backgroundColor: CARD_BG, color: "#fff", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, borderWidth: 1, borderColor: "#2a3a4a" },
  replyBtn: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  replyBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  repliesList: { marginTop: 10, paddingLeft: 4, borderLeftWidth: 2, borderLeftColor: "#2a3a4a", gap: 10 },
  replyItem: { flexDirection: "row", gap: 8, paddingLeft: 8 },
  avatarSm: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarTextSm: { color: "#fff", fontWeight: "800", fontSize: 12 },
  empty: { alignItems: "center", paddingVertical: 24, gap: 8 },
  emptyText: { color: GRAY, fontSize: 13, textAlign: "center" },
});
