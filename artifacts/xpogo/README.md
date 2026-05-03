# XpoGo Streaming Web

Web streaming platform berbasis TMDB + Firebase.

## Tech Stack
- React + Vite + TypeScript
- TailwindCSS + shadcn/ui
- Firebase Realtime Database
- TMDB API

## Setup Lokal

```bash
# Clone repo
git clone https://github.com/pendi28/TMDB_CLONE.git
cd TMDB_CLONE

# Install dependencies
npm install

# Buat file .env
echo "VITE_TMDB_KEY=your_tmdb_api_key_here" > .env

# Jalankan web lokal
npm run dev
```

## Kalau Mau Edit Manual

1. Buka folder `artifacts/xpogo`
2. Edit file yang sesuai:
   - `src/pages/home.tsx` untuk homepage
   - `src/pages/movie.tsx` untuk detail film
   - `src/pages/tv.tsx` untuk detail series
   - `src/pages/admin.tsx` untuk admin panel
   - `src/lib/firebase.ts` untuk helper Firebase
   - `src/lib/types.ts` untuk tipe data
3. Simpan perubahan
4. Cek hasil di preview atau jalankan web lokal
5. Kalau sudah fix, deploy ulang

## Deploy ke Firebase Hosting

Jalankan dari terminal di folder project:

```bash
pnpm --filter @workspace/xpogo run deploy
```

## Yang Dilakukan Saat Deploy

- Build web produksi
- Pakai `TMDB_API_KEY` dan `FIREBASE_DB_SECRET`
- Upload hasil build ke Firebase Hosting

## Struktur Folder

```
src/
├── pages/
│   ├── home.tsx       # Halaman utama
│   ├── movie.tsx      # Detail film
│   ├── tv.tsx         # Detail series
│   ├── search.tsx     # Pencarian
│   └── admin.tsx      # Admin panel (/admin)
├── components/
│   ├── Navbar.tsx
│   ├── ContentRow.tsx
│   └── MovieCard.tsx
└── lib/
    ├── firebase.ts    # Firebase helper
    ├── tmdb.ts        # TMDB API helper
    └── types.ts       # TypeScript types
```

## Environment Variables

| Variable | Keterangan |
|---|---|
| `VITE_TMDB_KEY` | API key dari themoviedb.org |

## Firebase Config
Edit `src/lib/firebase.ts` → ganti URL database dengan milikmu.

## Admin Panel
Akses di `/admin` → login dengan password yang sudah di-set di Firebase.
