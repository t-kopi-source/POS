const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response(renderApp(), {
        headers: { "content-type": "text/html; charset=UTF-8" }
      });
    }

    if (url.pathname === "/api/products" && request.method === "GET") {
      const rows = await env.DB.prepare(
        "SELECT id, name, price, stock FROM products ORDER BY id DESC"
      ).all();

      return json({ products: rows.results ?? [] });
    }

    if (url.pathname === "/api/products" && request.method === "POST") {
      const body = await request.json();
      const name = String(body.name || "").trim();
      const price = Number(body.price);
      const stock = Number(body.stock);

      if (!name || Number.isNaN(price) || Number.isNaN(stock)) {
        return json({ error: "Data produk tidak valid." }, 400);
      }

      await env.DB.prepare(
        "INSERT INTO products(name, price, stock) VALUES(?, ?, ?)"
      )
        .bind(name, price, stock)
        .run();

      return json({ success: true }, 201);
    }

    if (url.pathname === "/api/transactions" && request.method === "GET") {
      const rows = await env.DB.prepare(
        "SELECT id, total, payment, change_amount, created_at FROM transactions ORDER BY id DESC LIMIT 50"
      ).all();

      return json({ transactions: rows.results ?? [] });
    }

    if (url.pathname === "/api/transactions" && request.method === "POST") {
      const body = await request.json();
      const payment = Number(body.payment);
      const items = Array.isArray(body.items) ? body.items : [];

      if (items.length === 0 || Number.isNaN(payment)) {
        return json({ error: "Transaksi tidak valid." }, 400);
      }

      let total = 0;
      for (const item of items) {
        const qty = Number(item.qty);
        const productId = Number(item.productId);
        if (Number.isNaN(qty) || Number.isNaN(productId) || qty <= 0) {
          return json({ error: "Item transaksi tidak valid." }, 400);
        }

        const product = await env.DB.prepare(
          "SELECT id, name, price, stock FROM products WHERE id = ?"
        )
          .bind(productId)
          .first();

        if (!product) {
          return json({ error: `Produk ID ${productId} tidak ditemukan.` }, 404);
        }

        if (product.stock < qty) {
          return json({ error: `Stok produk ${product.name} tidak cukup.` }, 400);
        }

        total += product.price * qty;
      }

      if (payment < total) {
        return json({ error: "Pembayaran kurang dari total belanja." }, 400);
      }

      const tx = await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO transactions(total, payment, change_amount) VALUES(?, ?, ?)"
        ).bind(total, payment, payment - total)
      ]);

      const transactionMeta = tx[0];
      const transactionId = transactionMeta.meta.last_row_id;

      for (const item of items) {
        const qty = Number(item.qty);
        const productId = Number(item.productId);

        const product = await env.DB.prepare(
          "SELECT id, price, stock FROM products WHERE id = ?"
        )
          .bind(productId)
          .first();

        await env.DB.batch([
          env.DB.prepare(
            "INSERT INTO transaction_items(transaction_id, product_id, qty, unit_price, subtotal) VALUES(?, ?, ?, ?, ?)"
          ).bind(transactionId, productId, qty, product.price, product.price * qty),
          env.DB.prepare("UPDATE products SET stock = ? WHERE id = ?").bind(
            product.stock - qty,
            productId
          )
        ]);
      }

      return json({
        success: true,
        transactionId,
        total,
        payment,
        change: payment - total
      });
    }

    return new Response("Not Found", { status: 404 });
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS }
  });
}

function renderApp() {
  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>POS Kasir Cloudflare Gratis</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; background: #f5f7fb; }
    .container { max-width: 1100px; margin: auto; padding: 16px; }
    h1 { margin-top: 0; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .card { background: white; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
    input, select, button { padding: 8px; margin: 4px 0; width: 100%; }
    button { cursor: pointer; border: 0; border-radius: 8px; background: #2563eb; color: white; font-weight: 600; }
    button.secondary { background: #475569; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border-bottom: 1px solid #e2e8f0; text-align: left; padding: 8px; font-size: 14px; }
    .row { display: flex; gap: 8px; }
    .row > * { flex: 1; }
    .muted { color: #64748b; font-size: 13px; }
    .ok { color: #166534; }
    .err { color: #991b1b; }
    @media (max-width: 860px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="container">
    <h1>POS Kasir Online (Cloudflare Free)</h1>
    <p class="muted">Semua data tersimpan di Cloudflare D1, jadi bisa akses dari mana saja selama internet tersedia.</p>

    <div class="grid">
      <section class="card">
        <h2>Tambah Produk</h2>
        <div class="row">
          <input id="product-name" placeholder="Nama produk" />
          <input id="product-price" type="number" placeholder="Harga" />
          <input id="product-stock" type="number" placeholder="Stok" />
        </div>
        <button onclick="addProduct()">Simpan Produk</button>
        <p id="product-msg" class="muted"></p>

        <h3>Daftar Produk</h3>
        <table>
          <thead><tr><th>ID</th><th>Nama</th><th>Harga</th><th>Stok</th></tr></thead>
          <tbody id="products-body"></tbody>
        </table>
      </section>

      <section class="card">
        <h2>Transaksi</h2>
        <div class="row">
          <select id="trx-product"></select>
          <input id="trx-qty" type="number" min="1" value="1" />
          <button class="secondary" onclick="addItem()">Tambah</button>
        </div>

        <table>
          <thead><tr><th>Produk</th><th>Qty</th><th>Subtotal</th></tr></thead>
          <tbody id="cart-body"></tbody>
        </table>

        <p>Total: <strong id="total">Rp0</strong></p>
        <input id="payment" type="number" placeholder="Uang bayar" />
        <button onclick="checkout()">Bayar</button>
        <p id="trx-msg" class="muted"></p>

        <h3>Riwayat (50 terbaru)</h3>
        <table>
          <thead><tr><th>ID</th><th>Total</th><th>Bayar</th><th>Kembalian</th><th>Waktu</th></tr></thead>
          <tbody id="trx-history"></tbody>
        </table>
      </section>
    </div>
  </div>

  <script>
    let products = [];
    let cart = [];

    const rupiah = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

    async function loadProducts() {
      const res = await fetch('/api/products');
      const data = await res.json();
      products = data.products || [];

      document.getElementById('products-body').innerHTML = products
        .map(p => '<tr><td>' + p.id + '</td><td>' + p.name + '</td><td>' + rupiah(p.price) + '</td><td>' + p.stock + '</td></tr>')
        .join('');

      document.getElementById('trx-product').innerHTML = products
        .map(p => '<option value="' + p.id + '">' + p.name + ' (stok ' + p.stock + ')</option>')
        .join('');
    }

    async function loadTransactions() {
      const res = await fetch('/api/transactions');
      const data = await res.json();
      const rows = data.transactions || [];
      document.getElementById('trx-history').innerHTML = rows
        .map(t => '<tr><td>' + t.id + '</td><td>' + rupiah(t.total) + '</td><td>' + rupiah(t.payment) + '</td><td>' + rupiah(t.change_amount) + '</td><td>' + t.created_at + '</td></tr>')
        .join('');
    }

    async function addProduct() {
      const name = document.getElementById('product-name').value;
      const price = Number(document.getElementById('product-price').value);
      const stock = Number(document.getElementById('product-stock').value);

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, price, stock })
      });
      const data = await res.json();

      const msg = document.getElementById('product-msg');
      if (!res.ok) {
        msg.textContent = data.error || 'Gagal simpan produk';
        msg.className = 'muted err';
        return;
      }

      msg.textContent = 'Produk berhasil disimpan.';
      msg.className = 'muted ok';
      document.getElementById('product-name').value = '';
      document.getElementById('product-price').value = '';
      document.getElementById('product-stock').value = '';
      await loadProducts();
    }

    function addItem() {
      const productId = Number(document.getElementById('trx-product').value);
      const qty = Number(document.getElementById('trx-qty').value);
      const product = products.find(p => p.id === productId);
      if (!product || qty <= 0) return;

      const existing = cart.find(i => i.productId === productId);
      if (existing) existing.qty += qty;
      else cart.push({ productId, name: product.name, price: product.price, qty });
      renderCart();
    }

    function renderCart() {
      const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
      document.getElementById('cart-body').innerHTML = cart
        .map(i => '<tr><td>' + i.name + '</td><td>' + i.qty + '</td><td>' + rupiah(i.price * i.qty) + '</td></tr>')
        .join('');
      document.getElementById('total').textContent = rupiah(total);
    }

    async function checkout() {
      const payment = Number(document.getElementById('payment').value);
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment, items: cart })
      });
      const data = await res.json();
      const msg = document.getElementById('trx-msg');

      if (!res.ok) {
        msg.textContent = data.error || 'Transaksi gagal';
        msg.className = 'muted err';
        return;
      }

      msg.textContent = 'Transaksi sukses. Kembalian: ' + rupiah(data.change);
      msg.className = 'muted ok';
      cart = [];
      document.getElementById('payment').value = '';
      renderCart();
      await loadProducts();
      await loadTransactions();
    }

    loadProducts();
    loadTransactions();
  </script>
</body>
</html>`;
}
