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

## Step-by-step lengkap (tanpa lompat)

## 0) Siapkan dulu

1. Buat akun Cloudflare gratis: <https://dash.cloudflare.com/sign-up>
2. Install Node.js LTS (disarankan 18+)
3. Buka terminal di folder project ini (`/workspace/POS`)

---

## 1) Install dependency

Jalankan:

```bash
npm install
```

Kalau sukses, folder `node_modules` akan terbuat dan command `wrangler` bisa dipakai via `npx` atau script npm.

---

## 2) Login Cloudflare dari CLI

Jalankan:

```bash
npx wrangler login
```

Yang terjadi:

- Browser akan terbuka
- Anda login Cloudflare
- Beri izin ke Wrangler
- Balik ke terminal, status login akan sukses

Cek login sudah aktif:

```bash
npx wrangler whoami
```

---

## 3) Buat database D1

Jalankan:

```bash
npx wrangler d1 create pos_db
```

Simpan output penting ini:

- `database_name`
- `database_id`  ✅ **wajib disalin**

---

## 4) Pasang `database_id` ke konfigurasi Worker

Buka file `wrangler.toml`, ubah bagian ini:

```toml
database_id = "PASTE_D1_DATABASE_ID_HERE"
```

jadi `database_id` asli dari langkah 3.

Contoh:

```toml
database_id = "4f2f0a4a-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

---

## 5) Buat tabel di D1 (init schema)

Jalankan:

```bash
npm run db:init
```

Perintah ini mengeksekusi `schema.sql` ke database D1 cloud.

Cek tabel sudah masuk:

```bash
npx wrangler d1 execute pos_db --command "SELECT name FROM sqlite_master WHERE type='table';"
```

Harus muncul minimal tabel:

- `products`
- `transactions`
- `transaction_items`

---

## 6) Jalankan lokal (untuk cek awal)

Jalankan:

```bash
npm run dev
```

Biasanya Worker lokal berjalan di:

- <http://127.0.0.1:8787>

### Di mana cek dan akses lokalnya?

1. Buka browser ke `http://127.0.0.1:8787`
2. Kalau halaman kasir muncul, artinya frontend+API jalan
3. Coba tambah produk dan transaksi kecil

Cek API lokal via terminal:

```bash
curl http://127.0.0.1:8787/api/products
```

Jika berjalan normal, akan keluar JSON seperti:

```json
{"products":[]}
```

---

## 7) Deploy ke internet (gratis)

Jalankan:

```bash
npm run deploy
```

Di akhir proses deploy, Wrangler menampilkan URL production.

Contoh:

- `https://pos-kasir-free.<subdomain>.workers.dev`

### Di mana cek dan akses URL online-nya?

Ada 2 cara:

1. **Dari terminal deploy**
   - selesai `npm run deploy`, copy URL yang muncul.
2. **Dari Cloudflare Dashboard**
   - buka Cloudflare Dashboard
   - masuk menu **Workers & Pages**
   - pilih worker `pos-kasir-free`
   - lihat bagian **Domains / worker URL**

Lalu buka URL tersebut di browser HP/laptop untuk mulai pakai POS online.

---

## 8) Verifikasi online setelah deploy (wajib)

1. Buka URL `workers.dev` Anda
2. Tambah 1 produk
3. Lakukan 1 transaksi
4. Refresh halaman
5. Pastikan:
   - produk tetap ada
   - stok berkurang
   - riwayat transaksi muncul

Cek API online via terminal:

```bash
curl https://NAMA-URL-WORKERS-ANDA/api/transactions
```

Kalau sukses, Anda akan dapat respons JSON data transaksi.

---

## 9) (Opsional) Pakai domain sendiri

Jika domain Anda dikelola di Cloudflare:

1. Dashboard → **Workers & Pages**
2. Pilih `pos-kasir-free`
3. Tab **Triggers / Custom Domains**
4. Tambahkan domain, misalnya `kasir.tokosaya.com`

Setelah aktif, akses aplikasi lewat domain tersebut.

---

## Troubleshooting

### `wrangler: not found`

Jalankan ulang:

```bash
npm install
```

Lalu ulangi `npm run dev`.

### `db:init` gagal

Cek ini satu per satu:

1. `database_id` di `wrangler.toml` sudah benar
2. nama DB di script tetap `pos_db`
3. sudah login Cloudflare (`npx wrangler whoami`)

### URL online tidak muncul saat deploy

- pastikan login Wrangler benar
- ulangi `npm run deploy`
- cek URL di Dashboard **Workers & Pages**

### Halaman bisa dibuka tapi data tidak tersimpan

Cek:

1. D1 sudah dibuat?
2. `schema.sql` sudah dijalankan (`npm run db:init`)?
3. Worker terbaru sudah ter-deploy?
4. binding `DB` di `wrangler.toml` sudah benar?

---

## Catatan untuk produksi serius

Versi ini cocok untuk MVP / usaha kecil yang baru mulai.

Untuk skala lebih besar, sebaiknya tambah:

- Login kasir (auth)
- Role admin/kasir
- Export laporan (CSV)
- Audit log
- Pembatasan CORS (jangan `*` kalau domain sudah tetap)
