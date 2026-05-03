# XpoGo OTA Update Guide (EAS Update)

## Cara Kerja
EAS Update mengirim bundle JS baru langsung ke HP pengguna tanpa perlu build APK baru.
- Perubahan UI, logika, warna, teks → bisa OTA
- Perubahan native (plugin baru, permissions, icon) → harus build APK baru

---

## LANGKAH PERTAMA — Setup (cukup sekali setelah build APK baru)

### 1. Build APK dengan channel "preview"
```bash
eas build --platform android --profile preview --non-interactive
```
APK ini sudah terhubung ke channel `preview` dan siap terima OTA update.

### 2. Pasang APK ke HP

---

## KIRIM UPDATE (kapanpun ada perubahan)

Dari Shell Replit atau Termux, paste:
```bash
cd /home/runner/workspace/artifacts/xpogo-mobile
EXPO_TOKEN=$EXPO_TOKEN eas update --channel preview --message "Deskripsi update"
```

Contoh:
```bash
EXPO_TOKEN=$EXPO_TOKEN eas update --channel preview --message "Fix tampilan home + tambah genre filter"
```

HP akan menerima update **otomatis** saat app dibuka atau direstart.

---

## Cara kerja di HP pengguna
1. Buka app → cek update di background
2. Kalau ada update → download otomatis
3. Restart app → versi baru aktif

Tidak perlu uninstall, tidak perlu download APK baru!

---

## Catatan
- `runtimeVersion: appVersion` artinya OTA hanya kompatibel dengan APK versi yang sama
- Kalau naikkan `version` di app.json → harus build APK baru
- Channel `preview` untuk testing, `production` untuk live
