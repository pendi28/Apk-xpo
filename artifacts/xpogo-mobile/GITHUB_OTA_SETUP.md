# Setup GitHub Repo + OTA Otomatis

## Cara Kerja
Push kode ke GitHub → GitHub Actions otomatis jalankan EAS Update → HP pengguna dapat update

---

## LANGKAH SETUP (sekali saja)

### 1. Buat repo di GitHub
- Buka https://github.com/new
- Nama repo: `xpogo-mobile` (atau terserah)
- Set ke Private atau Public

### 2. Upload kode ke repo
Di Shell Replit, paste ini:
```bash
cd /home/runner/workspace
git remote add github https://github.com/USERNAME/xpogo-mobile.git
git push github main
```
Ganti `USERNAME` dengan username GitHub kamu.

### 3. Tambah EXPO_TOKEN ke GitHub Secrets
- Buka repo GitHub kamu
- Klik **Settings** → **Secrets and variables** → **Actions**
- Klik **New repository secret**
- Name: `EXPO_TOKEN`
- Value: token dari https://expo.dev/settings/access-tokens
- Klik **Add secret**

### 4. Build APK pertama kali (wajib)
APK harus dibangun dengan channel `preview` agar bisa terima OTA:
```bash
cd artifacts/xpogo-mobile
eas build --platform android --profile preview --non-interactive
```

---

## ALUR KERJA SETELAH SETUP

```
Edit kode di Replit
      ↓
git add . && git push github main
      ↓
GitHub Actions otomatis jalan (~2-3 menit)
      ↓
HP pengguna dapat update saat buka app
```

**Tidak perlu build APK baru, tidak perlu download ulang!**

---

## Cara Push Update dari Shell Replit

```bash
cd /home/runner/workspace
git add .
git commit -m "Deskripsi perubahan kamu"
git push github main
```

GitHub Actions akan otomatis jalankan EAS Update setelah push berhasil.
Cek status di: https://github.com/USERNAME/xpogo-mobile/actions

---

## Catatan
- Hanya file di `artifacts/xpogo-mobile/**` dan `lib/**` yang memicu OTA
- Perubahan native (plugin baru, dll) tetap harus build APK baru
- Token Expo bisa dibuat di: https://expo.dev/settings/access-tokens
