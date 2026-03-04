# POS Kasir Online (Cloudflare Free Tier)

Aplikasi POS kasir sederhana yang langsung jalan di Cloudflare Worker + Cloudflare D1 (free tier), jadi bisa online dari mana saja.

## Fitur

- Kelola produk (nama, harga, stok).
- Buat transaksi kasir.
- Hitung total dan kembalian otomatis.
- Riwayat transaksi 50 data terbaru.
- Semua data tersimpan online di Cloudflare D1.

## Stack Gratis

- **Cloudflare Workers** untuk backend + hosting frontend.
- **Cloudflare D1** untuk database SQL online.
- **Wrangler CLI** untuk deploy.

## Cara Pakai

### 1) Install dependency

```bash
npm install
```

### 2) Login Cloudflare

```bash
npx wrangler login
```

### 3) Buat database D1

```bash
npx wrangler d1 create pos_db
```

Simpan `database_id` lalu ganti di `wrangler.toml` pada bagian:

```toml
database_id = "PASTE_D1_DATABASE_ID_HERE"
```

### 4) Inisialisasi tabel

```bash
npm run db:init
```

### 5) Jalankan lokal

```bash
npm run dev
```

### 6) Deploy online gratis

```bash
npm run deploy
```

Setelah deploy selesai, Anda akan mendapatkan URL `workers.dev` yang bisa dipakai langsung.

## Catatan Cloudflare Free

- Sudah cukup untuk POS kecil/menengah yang baru mulai.
- Jika trafik dan data semakin besar, bisa upgrade paket kapan saja.
