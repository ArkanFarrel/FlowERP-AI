# 🚀 FlowERP AI — Enterprise Intelligence ERP Suite

> **FlowERP AI** adalah sistem Manajemen Enterprise Resource Planning (ERP) generasi terbaru berstandar industri yang terintegrasi penuh dengan kecerdasan buatan (**Google Gemini AI**). Dirancang khusus untuk mempermudah operasional bisnis, pencatatan stok, manajemen transaksi penjualan, CRM pelanggan, pengadaan supplier, hingga analisis bisnis prediktif secara real-time.

---

## 🌟 Modul & Fitur Utama

### 📊 1. Executive Dashboard
- **Metrik Utama (KPI)**: Total Omzet Penjualan, Item Produk, Ketersediaan Stok, dan Pelanggan Aktif.
- **Grafik Tren Sales**: Visualisasi tren penjualan bulanan dan harian secara dinamis.
- **Multi-Currency Switcher**: Konversi mata uang langsung secara real-time (**IDR, USD, EUR, SGD**).
- **Dark/Light Mode**: Dukungan tampilan mode gelap dan terang yang nyaman di mata.

### 📦 2. Product Catalog & Inventory Management
- **Manajemen Katalog**: Pendaftaran produk baru dengan SKU otomatis, kategori, harga beli/jual, dan gudang.
- **Stock Adjustment & Movement**: Pencatatan barang Masuk (*IN*), Keluar (*OUT*), dan Penyesuaian Fisik (*SET*).
- **Target Product Selector**: Selector produk interaktif yang menampilkan stok sisa secara akurat.
- **Multi-Criteria Filter**: Filter instan berdasarkan kata kunci, kategori, gudang, dan status stok.
- **Impor & Ekspor Data**: Fitur ekspor laporan katalog ke CSV dan impor massal dari file CSV.
- **Audit Log History**: Riwayat transaksi pergudangan lengkap dengan alasan dan user pelaksana.

### 💰 3. Sales Management & Invoicing
- **Sales Order (SO)**: Pembuatan pesanan penjualan dengan nomor SO otomatis.
- **Status Pembayaran**: Lacak status transaksi (*Paid, Pending, Overdue*).
- **Cetak Invois PDF / Browser**: Cetak struk dan faktur penjualan resmi untuk pelanggan.
- **Ekspor Excel**: Ekspor rekapitulasi data penjualan langsung ke format Excel (.xlsx).

### 👥 4. Customer CRM & Relationship Management
- **CRM Pelanggan**: Pencatatan profil pelanggan, email, telepon, kota, dan grup bisnis.
- **Financial Tracking**: Pantau *Lifetime Value*, *Credit Limit*, dan *Outstanding Balance* tiap pelanggan.

### 🏭 5. Supplier Procurement & Purchase Orders (PO)
- **Database Supplier**: Pengelolaan vendor/pemasok dan skor performa pengiriman.
- **Purchase Order (PO)**: Pencatatan pesanan pembelian barang ke supplier.

### 🤖 6. FlowERP AI Insights (Powered by Google Gemini AI)
- **AI Business Assistant**: Asisten AI interaktif untuk menjawab pertanyaan seputar kinerja bisnis dan omzet.
- **Prediksi Stok Kritis**: Analisis prediktif stok barang yang diperkirakan akan habis dalam 7 hari ke depan.
- **Prakiraan Penjualan (*Sales Forecast*)**: Rekomendasi strategi bisnis berbasis data transaksi riil.

---

## 🛠️ Teknologi & Stack Utama

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [TailwindCSS](https://tailwindcss.com) + Vanilla CSS Token System
- **Database ORM**: [Prisma ORM](https://www.prisma.io/) + PostgreSQL (Server Actions)
- **Icons**: [Lucide React](https://lucide.dev)
- **AI Engine**: [Google Gemini AI API](https://ai.google.dev/)
- **Export Utility**: XLSX Excel Generator & Native CSV Engine

---

## 💻 Panduan Instalasi & Pengembangan Lokal

### 1. Prasyarat System
Pastikan komputer Anda telah terinstal:
- **Node.js**: v18.0.0 atau yang lebih baru
- **npm** / **yarn** / **pnpm**

### 2. Clone & Install Dependencies
```bash
# Masuk ke direktori frontend
cd frontend

# Install seluruh dependensi paket
npm install
```

### 3. Konfigurasi Environment Variables (`.env`)
Buat file `.env` di dalam folder `frontend` dan isi variabel berikut:

```env
# Koneksi Database PostgreSQL (Local / Cloud Supabase)
DATABASE_URL="postgres://postgres:postgres@localhost:51214/postgres?sslmode=disable"

# URL Backend Next.js
NEXT_PUBLIC_API_URL="http://localhost:3000"

# Google Gemini AI Key (Opsional untuk AI Insights)
GEMINI_API_KEY="your_google_gemini_api_key_here"
```

### 4. Setup Database Schema (Prisma)
```bash
# Generate Prisma Client & Sync Database
npx prisma db push

# (Opsional) Buka Prisma Studio untuk melihat data visual
npx prisma studio
```

### 5. Jalankan Server Development
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) pada browser Anda.

---

## ☁️ Panduan Deployment ke Production (Vercel & Supabase)

### Langkah 1: Setup Database Cloud (Supabase / Neon.tech)
1. Buat project PostgreSQL gratis di [Supabase](https://supabase.com) atau [Neon.tech](https://neon.tech).
2. Salin **Connection String** PostgreSQL yang diberikan.
3. Update variabel `DATABASE_URL` di Vercel dengan connection string tersebut.

### Langkah 2: Deploy ke Vercel
1. Upload/Push source code ke **GitHub / GitLab** (Private Repository).
2. Hubungkan akun GitHub ke [Vercel](https://vercel.com).
3. Import project `FlowERP-AI/frontend`.
4. Masukkan Environment Variables (`DATABASE_URL`, `GEMINI_API_KEY`) di panel settings Vercel.
5. Klik **Deploy**! Aplikasi Anda akan aktif 24/7 di domain Vercel / Custom Domain Perusahaan.

---

## 📜 Lisensi & Penggunaan (License & Terms)

Sistem ini dilindungi di bawah **Single-Company Enterprise License**. 
- Diberikan hak penggunaan penuh untuk 1 organisasi / perusahaan.
- Dilarang menyebarluaskan, mendistribusikan ulang, atau memperjualbelikan kembali source code ini kepada pihak ketiga tanpa izin resmi dari pengembang.

---

*© 2026 FlowERP AI. Enterprise Intelligence Suite.*
