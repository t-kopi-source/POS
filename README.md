# POS Kasir Online (Cloudflare Free Tier)

Aplikasi POS kasir sederhana yang berjalan penuh di cloud memakai:

- **Cloudflare Workers** (backend API + hosting frontend)
- **Cloudflare D1** (database SQL online)

Dengan arsitektur ini, aplikasi bisa diakses dari HP/laptop mana pun selama ada internet.

## Fitur

- Kelola produk: tambah + lihat stok.
- Transaksi kasir: pilih produk, qty, bayar, hitung kembalian.
- Stok otomatis berkurang saat checkout sukses.
- Riwayat transaksi 50 data terbaru.
- Deploy gratis di domain `*.workers.dev`.

---

## Struktur Proyek

- `src/worker.js` → endpoint API + HTML/CSS/JS kasir.
- `schema.sql` → struktur tabel database D1.
- `wrangler.toml` → konfigurasi Worker + binding D1.
- `package.json` → script lokal untuk dev/deploy/init DB.

---

## Implementasi dari Nol (Step-by-step)

## 1) Persiapan akun dan tools

1. Buat akun Cloudflare gratis: https://dash.cloudflare.com/sign-up
2. Install Node.js LTS (disarankan versi 18+)
3. Di folder proyek, install dependency:

```bash
npm install
```

## 2) Login Wrangler ke akun Cloudflare

```bash
npx wrangler login
```

Perintah ini membuka browser untuk otorisasi.

## 3) Buat database online (D1)

```bash
npx wrangler d1 create pos_db
```

Setelah berhasil, Anda akan mendapat output seperti:

- `database_name`
- `database_id`

Salin `database_id` tersebut.

## 4) Hubungkan Worker ke D1

Buka `wrangler.toml`, lalu ganti:

```toml
database_id = "PASTE_D1_DATABASE_ID_HERE"
```

menjadi `database_id` asli dari langkah sebelumnya.

## 5) Inisialisasi tabel database

```bash
npm run db:init
```

Perintah ini mengeksekusi `schema.sql` ke D1 cloud.

## 6) Jalankan lokal

```bash
npm run dev
```

Biasanya Worker lokal tersedia di:

- `http://127.0.0.1:8787`

## 7) Deploy ke internet (gratis)

```bash
npm run deploy
```

Setelah sukses, Anda mendapat URL seperti:

- `https://pos-kasir-free.<subdomain>.workers.dev`

URL tersebut bisa langsung dipakai sebagai aplikasi kasir online.

---

## Cara Pakai Aplikasi Setelah Online

1. Masuk ke URL Worker.
2. Tambahkan beberapa produk (nama, harga, stok).
3. Di panel transaksi, pilih produk dan qty lalu klik **Tambah**.
4. Isi uang bayar, klik **Bayar**.
5. Sistem menampilkan kembalian dan menyimpan transaksi ke cloud.

---

## Opsional: Pakai Domain Sendiri (tetap bisa gratis)

Jika Anda punya domain di Cloudflare:

1. Masuk Cloudflare Dashboard → **Workers & Pages**.
2. Pilih Worker `pos-kasir-free`.
3. Tab **Triggers / Custom Domains**.
4. Tambahkan domain, misalnya `kasir.tokosaya.com`.

---

## Catatan Penting untuk Produksi

Versi ini cocok untuk MVP / POS sederhana. Untuk dipakai lebih serius, sebaiknya tambahkan:

- Login kasir (auth)
- Role admin/kasir
- Export laporan (CSV)
- Validasi input lebih ketat
- Audit log
- Proteksi CORS yang lebih aman (jangan `*` jika sudah punya domain fix)

---

## Troubleshooting

### `wrangler: not found`
Jalankan kembali:

```bash
npm install
```

lalu ulangi `npm run dev`.

### Gagal `db:init` karena binding
Pastikan:

- `database_id` di `wrangler.toml` sudah benar
- nama DB pada script `db:init` sesuai: `pos_db`

### Aplikasi bisa dibuka tapi data tidak tersimpan
Cek:

- D1 sudah dibuat?
- `schema.sql` sudah dijalankan?
- Worker sudah deploy versi terbaru?
