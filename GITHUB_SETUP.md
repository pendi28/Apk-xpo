# Setup GitHub Repo untuk XpoGo

Panduan push project ini ke repo GitHub baru agar APK bisa di-build otomatis setiap ada perubahan kode.

## Langkah 1: Buat Repo Baru di GitHub

1. Buka https://github.com/new
2. Nama repo: `xpogo` (atau bebas)
3. Set ke **Private** atau Public sesuai preferensi
4. **Jangan** centang "Initialize with README"
5. Klik **Create repository**

## Langkah 2: Push Kode dari Lokal

Setelah clone/download project dari Replit, jalankan di terminal:

```bash
# Masuk ke folder project
cd /path/to/project

# Set remote ke repo baru kamu
git remote set-url origin https://github.com/USERNAME/xpogo.git
# atau jika belum ada remote:
git remote add origin https://github.com/USERNAME/xpogo.git

# Push semua kode
git push -u origin main
```

> Ganti `USERNAME` dengan username GitHub kamu.

## Langkah 3: Set GitHub Secrets

Di repo GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Tambahkan secrets berikut:

| Secret Name | Nilai |
|-------------|-------|
| `EXPO_TOKEN` | Token dari https://expo.dev/settings/access-tokens |
| `TMDB_API_KEY` | API key TMDB kamu |
| `FIREBASE_DB_SECRET` | Secret Firebase database kamu |
| `FIREBASE_SERVICE_ACCOUNT` | (Opsional) Service account JSON untuk deploy web ke Firebase |

## Langkah 4: Aktifkan GitHub Actions

Setelah push, buka tab **Actions** di repo GitHub.
Kalau diminta, klik **"I understand my workflows, enable them"**.

## Apa yang Terjadi Otomatis

| Event | Workflow | Hasil |
|-------|----------|-------|
| Push perubahan `artifacts/xpogo-mobile/` | `eas-build-apk.yml` | Build APK baru di EAS |
| Push perubahan `artifacts/xpogo-mobile/` | `eas-update.yml` | OTA update langsung ke HP |
| Push perubahan `artifacts/xpogo/` | `firebase-deploy.yml` | Deploy web ke Firebase |

## Download APK Hasil Build

Setelah build selesai (~10-15 menit):
👉 https://expo.dev/accounts/pendi55/projects/xpogo-mobile/builds

## Trigger Build Manual

Di GitHub → **Actions** → **Build Android APK (EAS)** → **Run workflow** → **Run workflow**

Atau lewat CLI (dari lokal):
```bash
cd artifacts/xpogo-mobile
eas build --platform android --profile preview --non-interactive
```

## Alur Update APK ke Depannya

```
Edit kode di Replit
    ↓
Push ke GitHub
    ↓
GitHub Actions otomatis trigger EAS build
    ↓
APK tersedia di expo.dev untuk didownload
```
