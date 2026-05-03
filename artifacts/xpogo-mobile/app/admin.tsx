import { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, TextInput, Modal, Switch,
  ActivityIndicator, Alert, BackHandler, TouchableWithoutFeedback,
  KeyboardAvoidingView, Platform, FlatList, Image,
} from "react-native";
import { useRouter } from "expo-router";
import { fb } from "@/lib/firebase";
import { tmdb } from "@/lib/tmdb";

const BG = "#0d1117";
const CARD = "#1a2332";
const GREEN = "#00c853";
const RED = "#e74c3c";
const GRAY = "#8a9bb0";
const BORDER = "#2a3a4a";

// ─── SHARED COMPONENTS ───────────────────────────────────────────
function SectionHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <View style={C.rowBetween}>
      <Text style={C.sectionTitle}>{title}</Text>
      <TouchableOpacity style={C.addBtn} onPress={onAdd} activeOpacity={0.8}>
        <Text style={C.addBtnText}>+ Tambah</Text>
      </TouchableOpacity>
    </View>
  );
}

function InputField({ label, value, onChangeText, placeholder, multiline = false, secureTextEntry = false, keyboardType = "default" }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; multiline?: boolean; secureTextEntry?: boolean; keyboardType?: string;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={C.inputLabel}>{label}</Text>
      <TextInput
        style={[C.input, multiline && { height: 80, textAlignVertical: "top" }]}
        value={value} onChangeText={onChangeText}
        placeholder={placeholder ?? label} placeholderTextColor={GRAY}
        multiline={multiline} secureTextEntry={secureTextEntry}
        keyboardType={keyboardType as never} autoCorrect={false}
      />
    </View>
  );
}

function ModalWrap({ visible, title, onClose, onSave, saving, children }: {
  visible: boolean; title: string; onClose: () => void; onSave: () => void; saving: boolean; children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={C.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={C.modalBox}>
                <View style={C.modalHeader}>
                  <Text style={C.modalTitle}>{title}</Text>
                  <TouchableOpacity onPress={onClose}><Text style={{ color: GRAY, fontSize: 22 }}>✕</Text></TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>{children}</ScrollView>
                <TouchableOpacity style={[C.saveBtn, saving && { opacity: 0.6 }]} onPress={onSave} disabled={saving} activeOpacity={0.85}>
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={C.saveBtnText}>💾  Simpan</Text>}
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── FILM TAB ────────────────────────────────────────────────────
interface CustomMovie {
  id: string; title: string; description?: string; posterUrl?: string;
  backdropUrl?: string; year?: number; genres?: string[];
  embedUrl: string; type: "movie" | "series"; tmdbId?: number; imdbId?: string;
}
const EMPTY_FILM: Omit<CustomMovie, "id"> = {
  title: "", description: "", posterUrl: "", backdropUrl: "",
  year: undefined, genres: [], embedUrl: "", type: "movie", tmdbId: undefined, imdbId: "",
};

function FilmTab() {
  const [items, setItems] = useState<CustomMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<CustomMovie | null>(null);
  const [form, setForm] = useState<typeof EMPTY_FILM>({ ...EMPTY_FILM });
  const [saving, setSaving] = useState(false);
  const [tmdbSearch, setTmdbSearch] = useState("");
  const [tmdbLoading, setTmdbLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await fb.getCustomMovies() as CustomMovie[]); }
    catch { Alert.alert("Error", "Gagal memuat data film"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm({ ...EMPTY_FILM }); setTmdbSearch(""); setModal(true); };
  const openEdit = (m: CustomMovie) => {
    setEditing(m);
    setForm({ title: m.title, description: m.description ?? "", posterUrl: m.posterUrl ?? "", backdropUrl: m.backdropUrl ?? "", year: m.year, genres: m.genres ?? [], embedUrl: m.embedUrl, type: m.type, tmdbId: m.tmdbId, imdbId: m.imdbId ?? "" });
    setTmdbSearch(""); setModal(true);
  };

  const doTmdbLookup = async () => {
    if (!tmdbSearch.trim()) return;
    setTmdbLoading(true);
    try {
      const searchData = await tmdb.find(tmdbSearch, form.type);
      const data = searchData.results?.[0] ?? null;
      if (data) {
        setForm(f => ({
          ...f,
          title: data.title ?? data.name ?? f.title,
          description: data.overview ?? f.description,
          posterUrl: data.poster_path ? `https://image.tmdb.org/t/p/w342${data.poster_path}` : f.posterUrl,
          backdropUrl: data.backdrop_path ? `https://image.tmdb.org/t/p/w780${data.backdrop_path}` : f.backdropUrl,
          year: (data.release_date ?? data.first_air_date ?? "").slice(0, 4) ? Number((data.release_date ?? data.first_air_date).slice(0, 4)) : f.year,
          tmdbId: data.id ?? f.tmdbId,
          genres: data.genres?.map((g: { name: string }) => g.name) ?? f.genres,
        }));
        Alert.alert("✅ Ditemukan", `${data.title ?? data.name} berhasil di-load dari TMDB!`);
      } else {
        Alert.alert("Tidak ditemukan", "Data tidak ada di TMDB.");
      }
    } catch { Alert.alert("Error", "Gagal lookup TMDB."); }
    finally { setTmdbLoading(false); }
  };

  const doSave = async () => {
    if (!form.title.trim()) { Alert.alert("Error", "Judul wajib diisi."); return; }
    if (!form.embedUrl.trim()) { Alert.alert("Error", "Embed URL wajib diisi."); return; }
    setSaving(true);
    try {
      const payload = { ...form, year: form.year ? Number(form.year) : undefined, tmdbId: form.tmdbId ? Number(form.tmdbId) : undefined };
      if (editing) {
        await fb.updateCustomMovie(editing.id, payload);
        Alert.alert("✅ Berhasil", "Film berhasil diupdate!");
      } else {
        await fb.addCustomMovie(payload);
        Alert.alert("✅ Berhasil", "Film berhasil ditambahkan!");
      }
      setModal(false); load();
    } catch (e) { Alert.alert("Error", String(e)); }
    finally { setSaving(false); }
  };

  const doDelete = (m: CustomMovie) => {
    Alert.alert("Hapus Film", `Hapus "${m.title}"?`, [
      { text: "Batal", style: "cancel" },
      { text: "Hapus", style: "destructive", onPress: async () => {
        try { await fb.deleteCustomMovie(m.id); load(); Alert.alert("✅", "Film dihapus."); }
        catch (e) { Alert.alert("Error", String(e)); }
      }},
    ]);
  };

  const f = (k: keyof typeof EMPTY_FILM) => (v: string) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <View style={{ flex: 1 }}>
      <SectionHeader title={`Film Khusus (${items.length})`} onAdd={openAdd} />
      {loading
        ? <ActivityIndicator color={GREEN} style={{ marginTop: 40 }} />
        : items.length === 0
          ? <Text style={C.emptyText}>Belum ada film. Tap "+ Tambah"</Text>
          : <FlatList data={items} keyExtractor={i => i.id} contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => (
                <View style={C.itemCard}>
                  <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                    {item.posterUrl
                      ? <Image source={{ uri: item.posterUrl }} style={C.itemPoster} />
                      : <View style={[C.itemPoster, { backgroundColor: BORDER, alignItems: "center", justifyContent: "center" }]}><Text style={{ fontSize: 20 }}>🎬</Text></View>
                    }
                    <View style={{ flex: 1 }}>
                      <Text style={C.itemTitle} numberOfLines={2}>{item.title}</Text>
                      <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                        <View style={[C.typeBadge, { backgroundColor: item.type === "series" ? "#1a3a2a" : "#1a1a3a" }]}>
                          <Text style={[C.typeBadgeText, { color: item.type === "series" ? GREEN : "#6c8ebf" }]}>{item.type === "series" ? "Series" : "Movie"}</Text>
                        </View>
                        {item.year && <Text style={C.itemMeta}>{item.year}</Text>}
                        {item.tmdbId && <Text style={C.itemMeta}>TMDB #{item.tmdbId}</Text>}
                      </View>
                      <Text style={[C.itemMeta, { marginTop: 4 }]} numberOfLines={1}>{item.embedUrl}</Text>
                    </View>
                  </View>
                  <View style={C.itemActions}>
                    <TouchableOpacity style={[C.actionBtn, { backgroundColor: "#1a3a5a" }]} onPress={() => openEdit(item)} activeOpacity={0.8}><Text style={[C.actionBtnText, { color: "#6c8ebf" }]}>✏️ Edit</Text></TouchableOpacity>
                    <TouchableOpacity style={[C.actionBtn, { backgroundColor: "#3a1a1a" }]} onPress={() => doDelete(item)} activeOpacity={0.8}><Text style={[C.actionBtnText, { color: RED }]}>🗑 Hapus</Text></TouchableOpacity>
                  </View>
                </View>
              )}
            />
      }
      <ModalWrap visible={modal} title={editing ? "Edit Film" : "Tambah Film"} onClose={() => setModal(false)} onSave={doSave} saving={saving}>
        <View style={C.lookupRow}>
          <TextInput style={[C.input, { flex: 1 }]} placeholder="Cari di TMDB (judul)..." placeholderTextColor={GRAY} value={tmdbSearch} onChangeText={setTmdbSearch} onSubmitEditing={doTmdbLookup} />
          <TouchableOpacity style={C.lookupBtn} onPress={doTmdbLookup} disabled={tmdbLoading} activeOpacity={0.8}>
            {tmdbLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>🔍 Lookup</Text>}
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
          {(["movie", "series"] as const).map(t => (
            <TouchableOpacity key={t} style={[C.typeBtn, form.type === t && C.typeBtnActive]} onPress={() => setForm(p => ({ ...p, type: t }))} activeOpacity={0.8}>
              <Text style={[C.typeBtnText, form.type === t && { color: "#fff" }]}>{t === "movie" ? "🎬 Movie" : "📺 Series"}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <InputField label="Judul *" value={form.title} onChangeText={f("title")} />
        <InputField label="Embed URL *" value={form.embedUrl} onChangeText={f("embedUrl")} placeholder="https://..." />
        <InputField label="Deskripsi" value={form.description ?? ""} onChangeText={f("description")} multiline />
        <InputField label="Poster URL" value={form.posterUrl ?? ""} onChangeText={f("posterUrl")} placeholder="https://..." />
        <InputField label="Backdrop URL" value={form.backdropUrl ?? ""} onChangeText={f("backdropUrl")} placeholder="https://..." />
        <InputField label="Tahun" value={form.year?.toString() ?? ""} onChangeText={v => setForm(p => ({ ...p, year: Number(v) || undefined }))} keyboardType="numeric" />
        <InputField label="TMDB ID" value={form.tmdbId?.toString() ?? ""} onChangeText={v => setForm(p => ({ ...p, tmdbId: Number(v) || undefined }))} keyboardType="numeric" />
        <InputField label="IMDB ID" value={form.imdbId ?? ""} onChangeText={f("imdbId")} placeholder="tt0000000" />
        <InputField label="Genre (pisahkan koma)" value={(form.genres ?? []).join(", ")} onChangeText={v => setForm(p => ({ ...p, genres: v.split(",").map(s => s.trim()).filter(Boolean) }))} />
      </ModalWrap>
    </View>
  );
}

// ─── IKLAN TAB ───────────────────────────────────────────────────
interface Ad { id: string; type: "banner-top" | "banner-bottom" | "popunder"; label: string; code: string; active: boolean; }
const EMPTY_AD = { type: "banner-top" as Ad["type"], label: "", code: "", active: true };
const AD_TYPES: Ad["type"][] = ["banner-top", "banner-bottom", "popunder"];
const AD_LABELS: Record<Ad["type"], string> = { "banner-top": "Banner Atas", "banner-bottom": "Banner Bawah", "popunder": "Popunder" };

function AdsTab() {
  const [items, setItems] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Ad | null>(null);
  const [form, setForm] = useState<typeof EMPTY_AD>({ ...EMPTY_AD });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await fb.getAds() as Ad[]); }
    catch { Alert.alert("Error", "Gagal memuat iklan"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm({ ...EMPTY_AD }); setModal(true); };
  const openEdit = (a: Ad) => { setEditing(a); setForm({ type: a.type, label: a.label, code: a.code, active: a.active }); setModal(true); };

  const toggleActive = async (a: Ad) => {
    try {
      await fb.updateAd(a.id, { active: !a.active });
      setItems(prev => prev.map(x => x.id === a.id ? { ...x, active: !x.active } : x));
    } catch (e) { Alert.alert("Error", String(e)); }
  };

  const doSave = async () => {
    if (!form.label.trim()) { Alert.alert("Error", "Label wajib diisi."); return; }
    if (!form.code.trim()) { Alert.alert("Error", "Kode iklan wajib diisi."); return; }
    setSaving(true);
    try {
      if (editing) { await fb.updateAd(editing.id, form); Alert.alert("✅", "Iklan diupdate!"); }
      else { await fb.addAd(form); Alert.alert("✅", "Iklan ditambahkan!"); }
      setModal(false); load();
    } catch (e) { Alert.alert("Error", String(e)); }
    finally { setSaving(false); }
  };

  const doDelete = (a: Ad) => {
    Alert.alert("Hapus Iklan", `Hapus "${a.label}"?`, [
      { text: "Batal", style: "cancel" },
      { text: "Hapus", style: "destructive", onPress: async () => {
        try { await fb.deleteAd(a.id); load(); }
        catch (e) { Alert.alert("Error", String(e)); }
      }},
    ]);
  };

  const TYPE_COLORS: Record<Ad["type"], string> = { "banner-top": "#1a3a1a", "banner-bottom": "#1a2a3a", "popunder": "#3a1a3a" };
  const TYPE_TEXT: Record<Ad["type"], string> = { "banner-top": GREEN, "banner-bottom": "#6c8ebf", "popunder": "#c86cbf" };

  return (
    <View style={{ flex: 1 }}>
      <SectionHeader title={`Iklan (${items.length})`} onAdd={openAdd} />
      {loading ? <ActivityIndicator color={GREEN} style={{ marginTop: 40 }} />
        : items.length === 0 ? <Text style={C.emptyText}>Belum ada iklan. Tap "+ Tambah"</Text>
        : <FlatList data={items} keyExtractor={i => i.id} contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => (
              <View style={C.itemCard}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <View style={[C.typeBadge, { backgroundColor: TYPE_COLORS[item.type] }]}><Text style={[C.typeBadgeText, { color: TYPE_TEXT[item.type] }]}>{AD_LABELS[item.type]}</Text></View>
                  <Text style={C.itemTitle} numberOfLines={1}>{item.label}</Text>
                  <Switch value={item.active} onValueChange={() => toggleActive(item)} trackColor={{ false: BORDER, true: GREEN }} thumbColor="#fff" />
                </View>
                <Text style={C.itemMeta} numberOfLines={2}>{item.code.slice(0, 100)}...</Text>
                <View style={C.itemActions}>
                  <TouchableOpacity style={[C.actionBtn, { backgroundColor: "#1a3a5a" }]} onPress={() => openEdit(item)} activeOpacity={0.8}><Text style={[C.actionBtnText, { color: "#6c8ebf" }]}>✏️ Edit</Text></TouchableOpacity>
                  <TouchableOpacity style={[C.actionBtn, { backgroundColor: "#3a1a1a" }]} onPress={() => doDelete(item)} activeOpacity={0.8}><Text style={[C.actionBtnText, { color: RED }]}>🗑 Hapus</Text></TouchableOpacity>
                </View>
              </View>
            )}
          />
      }
      <ModalWrap visible={modal} title={editing ? "Edit Iklan" : "Tambah Iklan"} onClose={() => setModal(false)} onSave={doSave} saving={saving}>
        <Text style={C.inputLabel}>Tipe Iklan</Text>
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {AD_TYPES.map(t => (
            <TouchableOpacity key={t} style={[C.typeBtn, form.type === t && C.typeBtnActive]} onPress={() => setForm(p => ({ ...p, type: t }))} activeOpacity={0.8}>
              <Text style={[C.typeBtnText, form.type === t && { color: "#fff" }]}>{AD_LABELS[t]}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <InputField label="Label / Nama" value={form.label} onChangeText={v => setForm(p => ({ ...p, label: v }))} />
        <InputField label="Kode HTML Iklan *" value={form.code} onChangeText={v => setForm(p => ({ ...p, code: v }))} multiline placeholder="<script>...</script>" />
        <View style={[C.rowBetween, { marginBottom: 8 }]}>
          <Text style={C.inputLabel}>Aktif</Text>
          <Switch value={form.active} onValueChange={v => setForm(p => ({ ...p, active: v }))} trackColor={{ false: BORDER, true: GREEN }} thumbColor="#fff" />
        </View>
      </ModalWrap>
    </View>
  );
}

// ─── EMBED TAB ───────────────────────────────────────────────────
interface Embed { id: string; type: "movie" | "series"; tmdbId?: number; title: string; url: string; sub?: string; active: boolean; }
const EMPTY_EMBED = { type: "movie" as Embed["type"], tmdbId: undefined as number | undefined, title: "", url: "", sub: "", active: true };

function EmbedTab() {
  const [items, setItems] = useState<Embed[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Embed | null>(null);
  const [form, setForm] = useState<typeof EMPTY_EMBED>({ ...EMPTY_EMBED });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await fb.getEmbeds() as Embed[]); }
    catch { Alert.alert("Error", "Gagal memuat embed"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm({ ...EMPTY_EMBED }); setModal(true); };
  const openEdit = (e: Embed) => {
    setEditing(e); setForm({ type: e.type, tmdbId: e.tmdbId, title: e.title, url: e.url, sub: e.sub ?? "", active: e.active }); setModal(true);
  };

  const toggleActive = async (e: Embed) => {
    try {
      await fb.updateEmbed(e.id, { active: !e.active });
      setItems(prev => prev.map(x => x.id === e.id ? { ...x, active: !x.active } : x));
    } catch (err) { Alert.alert("Error", String(err)); }
  };

  const doSave = async () => {
    if (!form.title.trim()) { Alert.alert("Error", "Judul wajib diisi."); return; }
    if (!form.url.trim()) { Alert.alert("Error", "URL embed wajib diisi."); return; }
    setSaving(true);
    try {
      const payload = { ...form, tmdbId: form.tmdbId ? Number(form.tmdbId) : undefined };
      if (editing) { await fb.updateEmbed(editing.id, payload); Alert.alert("✅", "Embed diupdate!"); }
      else { await fb.addEmbed(payload); Alert.alert("✅", "Embed ditambahkan!"); }
      setModal(false); load();
    } catch (e) { Alert.alert("Error", String(e)); }
    finally { setSaving(false); }
  };

  const doDelete = (e: Embed) => {
    Alert.alert("Hapus Embed", `Hapus "${e.title}"?`, [
      { text: "Batal", style: "cancel" },
      { text: "Hapus", style: "destructive", onPress: async () => {
        try { await fb.deleteEmbed(e.id); load(); }
        catch (err) { Alert.alert("Error", String(err)); }
      }},
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <SectionHeader title={`Embed (${items.length})`} onAdd={openAdd} />
      {loading ? <ActivityIndicator color={GREEN} style={{ marginTop: 40 }} />
        : items.length === 0 ? <Text style={C.emptyText}>Belum ada embed. Tap "+ Tambah"</Text>
        : <FlatList data={items} keyExtractor={i => i.id} contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => (
              <View style={C.itemCard}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <View style={[C.typeBadge, { backgroundColor: item.type === "series" ? "#1a3a2a" : "#1a1a3a" }]}>
                    <Text style={[C.typeBadgeText, { color: item.type === "series" ? GREEN : "#6c8ebf" }]}>{item.type === "series" ? "Series" : "Movie"}</Text>
                  </View>
                  <Text style={C.itemTitle} numberOfLines={1}>{item.title}</Text>
                  <Switch value={item.active} onValueChange={() => toggleActive(item)} trackColor={{ false: BORDER, true: GREEN }} thumbColor="#fff" />
                </View>
                {item.tmdbId && <Text style={C.itemMeta}>TMDB: #{item.tmdbId}</Text>}
                <Text style={C.itemMeta} numberOfLines={1}>{item.url}</Text>
                {item.sub && <Text style={[C.itemMeta, { color: "#6c8ebf" }]}>Sub: {item.sub}</Text>}
                <View style={C.itemActions}>
                  <TouchableOpacity style={[C.actionBtn, { backgroundColor: "#1a3a5a" }]} onPress={() => openEdit(item)} activeOpacity={0.8}><Text style={[C.actionBtnText, { color: "#6c8ebf" }]}>✏️ Edit</Text></TouchableOpacity>
                  <TouchableOpacity style={[C.actionBtn, { backgroundColor: "#3a1a1a" }]} onPress={() => doDelete(item)} activeOpacity={0.8}><Text style={[C.actionBtnText, { color: RED }]}>🗑 Hapus</Text></TouchableOpacity>
                </View>
              </View>
            )}
          />
      }
      <ModalWrap visible={modal} title={editing ? "Edit Embed" : "Tambah Embed"} onClose={() => setModal(false)} onSave={doSave} saving={saving}>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
          {(["movie", "series"] as const).map(t => (
            <TouchableOpacity key={t} style={[C.typeBtn, form.type === t && C.typeBtnActive]} onPress={() => setForm(p => ({ ...p, type: t }))} activeOpacity={0.8}>
              <Text style={[C.typeBtnText, form.type === t && { color: "#fff" }]}>{t === "movie" ? "🎬 Movie" : "📺 Series"}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <InputField label="Judul *" value={form.title} onChangeText={v => setForm(p => ({ ...p, title: v }))} />
        <InputField label="URL Embed *" value={form.url} onChangeText={v => setForm(p => ({ ...p, url: v }))} placeholder="https://..." />
        <InputField label="Subtitle URL" value={form.sub ?? ""} onChangeText={v => setForm(p => ({ ...p, sub: v }))} placeholder="https://..." />
        <InputField label="TMDB ID" value={form.tmdbId?.toString() ?? ""} onChangeText={v => setForm(p => ({ ...p, tmdbId: Number(v) || undefined }))} keyboardType="numeric" />
        <View style={[C.rowBetween, { marginBottom: 8 }]}>
          <Text style={C.inputLabel}>Aktif</Text>
          <Switch value={form.active} onValueChange={v => setForm(p => ({ ...p, active: v }))} trackColor={{ false: BORDER, true: GREEN }} thumbColor="#fff" />
        </View>
      </ModalWrap>
    </View>
  );
}

// ─── SETTINGS TAB ────────────────────────────────────────────────
function SettingsTab() {
  const [form, setForm] = useState({ playerColor: "E50914", playerServer: "1", siteTitle: "XpoGo", autoplay: true, playerDomainAd: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fb.getSettings()
      .then(d => { if (d) setForm({ playerColor: d.playerColor ?? "E50914", playerServer: d.playerServer ?? "1", siteTitle: d.siteTitle ?? "XpoGo", autoplay: d.autoplay !== "false", playerDomainAd: d.playerDomainAd ?? "" }); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const doSave = async () => {
    setSaving(true);
    try {
      await fb.setSettings({ ...form, autoplay: form.autoplay ? "true" : "false" });
      Alert.alert("✅ Berhasil", "Pengaturan disimpan!");
    } catch (e) { Alert.alert("Error", String(e)); }
    finally { setSaving(false); }
  };

  if (loading) return <ActivityIndicator color={GREEN} style={{ marginTop: 40 }} />;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={C.sectionTitle}>Pengaturan Player</Text>
      <View style={C.settingsCard}>
        <InputField label="Warna Player (hex)" value={form.playerColor} onChangeText={v => setForm(p => ({ ...p, playerColor: v.replace("#", "") }))} placeholder="E50914" />
        <InputField label="Server Player (1 / 2)" value={form.playerServer} onChangeText={v => setForm(p => ({ ...p, playerServer: v }))} keyboardType="numeric" />
        <InputField label="Judul Situs" value={form.siteTitle} onChangeText={v => setForm(p => ({ ...p, siteTitle: v }))} />
        <InputField label="Domain Iklan Player" value={form.playerDomainAd} onChangeText={v => setForm(p => ({ ...p, playerDomainAd: v }))} placeholder="example.com" />
        <View style={[C.rowBetween, { marginBottom: 8 }]}>
          <Text style={C.inputLabel}>Autoplay Video</Text>
          <Switch value={form.autoplay} onValueChange={v => setForm(p => ({ ...p, autoplay: v }))} trackColor={{ false: BORDER, true: GREEN }} thumbColor="#fff" />
        </View>
      </View>
      <TouchableOpacity style={[C.saveBtn, saving && { opacity: 0.6 }]} onPress={doSave} disabled={saving} activeOpacity={0.85}>
        {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={C.saveBtnText}>💾  Simpan Pengaturan</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── MAIN ADMIN SCREEN ───────────────────────────────────────────
const TABS = [
  { key: "film", label: "🎬 Film" },
  { key: "iklan", label: "📢 Iklan" },
  { key: "embed", label: "🔗 Embed" },
  { key: "settings", label: "⚙️ Settings" },
] as const;

export default function AdminScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"film" | "iklan" | "embed" | "settings">("film");

  useEffect(() => {
    const h = BackHandler.addEventListener("hardwareBackPress", () => { router.back(); return true; });
    return () => h.remove();
  }, []);

  return (
    <View style={C.container}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <SafeAreaView style={{ backgroundColor: BG }}>
        <View style={C.header}>
          <TouchableOpacity onPress={() => router.back()} style={C.backBtn} activeOpacity={0.8}>
            <Text style={{ color: "#fff", fontSize: 20 }}>‹</Text>
          </TouchableOpacity>
          <Text style={C.headerTitle}>🛡️ Admin Panel</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={C.tabBar}>
          {TABS.map(t => (
            <TouchableOpacity key={t.key} style={[C.tab, activeTab === t.key && C.tabActive]} onPress={() => setActiveTab(t.key)} activeOpacity={0.8}>
              <Text style={[C.tabText, activeTab === t.key && C.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
      <View style={{ flex: 1, padding: 16 }}>
        {activeTab === "film" && <FilmTab />}
        {activeTab === "iklan" && <AdsTab />}
        {activeTab === "embed" && <EmbedTab />}
        {activeTab === "settings" && <SettingsTab />}
      </View>
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────
const C = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "900" },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: CARD, alignItems: "center", justifyContent: "center" },
  tabBar: { paddingHorizontal: 12, gap: 8, paddingBottom: 12 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: CARD },
  tabActive: { backgroundColor: GREEN },
  tabText: { color: GRAY, fontWeight: "700", fontSize: 13 },
  tabTextActive: { color: "#fff" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "800", marginBottom: 12 },
  emptyText: { color: GRAY, textAlign: "center", marginTop: 40, fontSize: 14 },
  addBtn: { backgroundColor: GREEN, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  itemCard: { backgroundColor: CARD, borderRadius: 14, padding: 14, marginBottom: 10 },
  itemPoster: { width: 50, height: 75, borderRadius: 8 },
  itemTitle: { color: "#fff", fontSize: 14, fontWeight: "700" },
  itemMeta: { color: GRAY, fontSize: 11, marginTop: 2 },
  typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: { fontSize: 11, fontWeight: "700" },
  itemActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  actionBtn: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  actionBtnText: { fontSize: 13, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "#111d2e", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "90%", paddingBottom: 12 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "900" },
  saveBtn: { backgroundColor: GREEN, borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 16, marginBottom: Platform.OS === "ios" ? 20 : 8 },
  saveBtnText: { color: "#fff", fontWeight: "900", fontSize: 15 },
  settingsCard: { backgroundColor: CARD, borderRadius: 14, padding: 16, marginBottom: 20 },
  inputLabel: { color: GRAY, fontSize: 12, fontWeight: "700", marginBottom: 6, letterSpacing: 0.5 },
  input: { backgroundColor: BG, color: "#fff", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, borderWidth: 1.5, borderColor: BORDER },
  lookupRow: { flexDirection: "row", gap: 8, marginBottom: 14, alignItems: "center" },
  lookupBtn: { backgroundColor: "#1a3a5a", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11 },
  typeBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: BORDER },
  typeBtnActive: { backgroundColor: GREEN, borderColor: GREEN },
  typeBtnText: { color: GRAY, fontWeight: "700", fontSize: 13 },
});
