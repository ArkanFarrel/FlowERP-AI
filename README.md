# FlowERP AI — Enterprise Intelligence ERP Suite

> **FlowERP AI** adalah sistem Enterprise Resource Planning (ERP) modern terintegrasi berstandar industri dengan arsitektur **Full-Stack (Next.js + Express.js REST API + PostgreSQL / SQLite Prisma ORM)** yang ditenagai oleh **Google Gemini AI**. Dirancang untuk mengotomatisasi operasional bisnis mulai dari inventaris, multi-gudang, kasir POS, penjualan, CRM pelanggan, pengadaan supplier, manajemen beban/keuangan, hingga analitik prediktif & asisten bisnis AI secara real-time.

---

## Arsitektur Sistem (System Architecture)

FlowERP AI dibangun dengan arsitektur decoupled/modular yang fleksibel:

```mermaid
graph TD
    Client["Web Browser / Mobile Client"] -->|UI / Server Actions| Frontend["Frontend: Next.js 16 App Router + TailwindCSS + Zustand"]
    Client -->|REST API Requests| Backend["Backend: Express.js 5 + TypeScript + Zod"]
    
    Frontend -->|Prisma ORM| DB[("PostgreSQL Database")]
    Frontend -->|AI Engine| Gemini["Google Gemini AI API"]
    
    Backend -->|Prisma Client| DevDB[("PostgreSQL / SQLite Database")]
    Backend -->|Swagger Docs| Swagger["/api-docs UI"]
    Backend -->|JWT Auth & Security| Security["Helmet + Rate Limiter + Winston Logger"]
```

---

## Modul & Fitur Utama (Core Modules)

### 1. Executive Dashboard
- **KPI Metrics Real-time**: Total Revenue/Omzet, Volume Pesanan, Jumlah Produk Aktif, dan Pelanggan Terdaftar.
- **Visualisasi Interaktif**: Grafik tren pendapatan bulanan dan mingguan dinamis (*Recharts*).
- **Multi-Currency Switcher**: Konversi mata uang langsung (*IDR, USD, EUR, SGD*).
- **Stok Kritis & Transaksi Terkini**: Widget peringatan stok menipis dan feed penjualan terbaru.
- **Dark / Light Mode**: Antarmuka adaptif tema gelap dan terang.

### 2. Product Catalog & Advanced Inventory
- **Katalog & SKU Otomatis**: Manajemen produk dengan SKU otomatis, barcode, kategori, unit (*pcs, box, kg*), harga modal & jual.
- **Stock Movement Engine**: Riwayat mutasi stok lengkap (*STOCK_IN, STOCK_OUT, ADJUSTMENT, TRANSFER*).
- **Multi-Warehouse Support**: Manajemen gudang (*Central Store, Outlet, dll.*) dan lokasi rak (*rack location*).
- **Impor & Ekspor Data**: Ekspor katalog ke CSV/Excel dan impor data massal via CSV.
- **Audit Log**: Jejak audit histori perubahan stok dengan pencatatan user dan alasan.

### 3. Point of Sale (POS) & Kasir Cepat
- **Quick POS Interface**: Antarmuka kasir cepat berbasis barcode scanner / klik katalog instan.
- **Order Cart & Discounting**: Perhitungan subtotal, pajak, diskon per item/faktur otomatis.
- **Multi-Payment Methods**: Dukungan pembayaran Tunai, Transfer Bank, QRIS, dan Kartu.
- **Cetak Struk & Nota**: Cetak struk kasir termal langsung dari browser.

### 4. Sales Orders & Invoicing
- **Sales Order (SO) Lifecycle**: Dari pesanan (*Quotation, Confirmed, Processing, Completed, Cancelled*).
- **Status Pembayaran & Pengiriman**: Pelacakan status bayar (*Paid, Pending, Overdue*) dan logistik (*Processing, Shipping, Delivered*).
- **Faktur Penjualan (Invoicing)**: Generate faktur resmi dengan penomoran unik otomatis dan cetak PDF.
- **Ekspor Excel**: Download rekapitulasi data penjualan ke format `.xlsx`.

### 5. Customer Relationship Management (CRM)
- **Profil Pelanggan Komprehensif**: Kontak, alamat, kota, sales representative, dan tipe pelanggan (*Retail, Wholesale*).
- **Financial & Credit Control**: Monitoring *Lifetime Value (LTV)*, limit kredit (*Credit Limit*), dan sisa hutang (*Outstanding Balance*).
- **Customer Health & Segmentation**: Penilaian skor kesehatan (*Health Score*) dan segmentasi (*Standard, Regular, VIP*).

### 6. Supplier Procurement & Purchase Orders (PO)
- **Database Vendor / Supplier**: Pengelolaan mitra pemasok dengan skor performa pengiriman dan kontak PIC.
- **Purchase Order (PO) Management**: Pembuatan pesanan pembelian barang ke supplier dengan nomor PO otomatis.
- **Status Penerimaan & Biaya**: Pelacakan barang diterima (*Ordered, Processing, Shipping, Delivered*) dan perhitungan HPP (*Cost Price*).

### 7. Finance & Expense Management
- **Pencatatan Beban (Expenses)**: Monitoring biaya operasional, gaji karyawan, sewa, utilitas, dan logistik.
- **Kategori Pengeluaran**: Pengelompokan biaya untuk analisis pos anggaran perusahaan.
- **Profit & Loss Overview**: Komparasi pendapatan (*Revenue*) vs modal (*COGS*) vs biaya operasional (*Expenses*).

### 8. FlowERP AI Insights (Powered by Google Gemini)
- **AI Business Assistant**: Asisten interaktif berbasis Gemini AI untuk tanya-jawab data omzet, profitabilitas, dan saran bisnis.
- **Replenishment Advisor**: Algoritma cerdas yang menghitung *Sales Velocity Rate* 30 hari untuk memprediksi sisa hari stok sebelum habis (*Burn Rate*) dan rekomendasi jumlah restock otomatis.
- **Dead Stock & Critical Alert**: Deteksi otomatis barang yang tidak bergerak (*Dead Stock*) untuk rekomendasi promo/cuci gudang.
- **Business Health Breakdown**: Skor kesehatan otomatis untuk 5 pilar (Sales, Inventory, Purchasing, Customers, Finance).

### 9. Team & User Access Control (RBAC)
- **Multi-Role User**: Pengaturan peran pengguna (*OWNER, ADMIN/MANAGER, WAREHOUSE, SALES, FINANCE, STAFF*).
- **Autentikasi & Sesi**: Sistem login terproteksi dengan password hashing (*bcrypt*) dan cookie/token session.

---

## Tech Stack & Ekosistem

| Layer | Teknologi & Library |
| :--- | :--- |
| **Frontend Framework** | [Next.js 16 (App Router)](https://nextjs.org) + [React 19](https://react.dev) |
| **Styling & UI** | [TailwindCSS v4](https://tailwindcss.com), [Lucide React](https://lucide.dev), [Sonner](https://sonner.emilkowal.ski), Shadcn/UI |
| **State & Data Fetching** | [Zustand](https://zustand-demo.pmnd.rs), [TanStack React Query v5](https://tanstack.com/query) |
| **Backend REST API** | [Express.js 5](https://expressjs.com) + [TypeScript](https://www.typescriptlang.org) |
| **Validation & Security** | [Zod](https://zod.dev), [Helmet](https://helmetjs.github.io), [CORS](https://expressjs.com/en/resources/middleware/cors.html), [express-rate-limit](https://express-rate-limit.mintlify.app) |
| **Database & ORM** | [Prisma ORM](https://www.prisma.io) + [PostgreSQL](https://www.postgresql.org) / SQLite (Better-SQLite3) |
| **API Documentation** | [Swagger UI](https://swagger.io/tools/swagger-ui/) + OpenAPI 3.0 (`/api-docs`) |
| **AI Integration** | [Google Gemini AI API](https://ai.google.dev) (`gemini-1.5-flash`) |
| **Logging** | [Winston](https://github.com/winstonjs/winston) + [Morgan](https://github.com/expressjs/morgan) |

---

## Struktur Direktori Proyek

```text
FlowERP-AI/
├── frontend/                     # Next.js 16 Fullstack Application
│   ├── app/                      # Next.js App Router (Pages & Layouts)
│   │   ├── AI-Insights/          # AI Analytics & Replenishment Advisor
│   │   ├── Customers/            # Customer CRM Module
│   │   ├── Dashboard/            # Executive KPI Dashboard
│   │   ├── Finance/              # Expenses & Cash Flow
│   │   ├── POS/                  # Point of Sale (Kasir Cepat)
│   │   ├── Products/             # Product Master Data
│   │   ├── ProductInventory/     # Stock Movements & Adjustments
│   │   ├── Purchases/            # Supplier Purchase Orders (PO)
│   │   ├── ReportsPage/          # Business Reports & Analytics
│   │   ├── Sales/                # Sales Orders & Invoices
│   │   ├── Settings/             # Company Profile & Currency Settings
│   │   ├── Suppliers/            # Supplier Management
│   │   ├── actions/              # Next.js Server Actions (DB Queries)
│   │   ├── layout.tsx            # Root Layout
│   │   └── page.tsx              # Index / Landing Router
│   ├── prisma/                   # Frontend Prisma Schema & Migrations
│   │   └── schema.prisma
│   └── package.json
│
├── backend/                      # Standalone Express REST API Service
│   ├── src/
│   │   ├── common/               # Middlewares (Auth, Error, Rate Limiter, DTO Validator)
│   │   ├── config/               # DB, Env (Zod), Logger (Winston), Swagger Config
│   │   ├── modules/              # Modular Controller-Service-Route Architecture
│   │   │   ├── ai/               # Gemini AI & Analytics Endpoints
│   │   │   ├── auth/             # Login, Register, Refresh Token
│   │   │   ├── category/         # Category CRUD
│   │   │   ├── customer/         # Customer CRM Endpoints
│   │   │   ├── dashboard/        # Dashboard Aggregate Stats
│   │   │   ├── finance/          # Expenses & Financial Ledger
│   │   │   ├── inventory/        # Stock Adjustment & Movements
│   │   │   ├── product/          # Products Management & Filtering
│   │   │   ├── purchase/         # PO & Purchase Items
│   │   │   ├── report/           # Sales & Stock PDF/Excel Reports
│   │   │   ├── sales/            # Sales Orders & Invoicing
│   │   │   ├── supplier/         # Supplier Endpoints
│   │   │   └── user/             # User Management & RBAC
│   │   ├── app.ts                # Express App Initialization
│   │   └── server.ts             # HTTP Server Bootstrap
│   ├── prisma/                   # Backend Prisma Schema
│   │   └── schema.prisma
│   └── package.json
│
└── README.md
```

---

## Panduan Instalasi & Menjalankan Aplikasi

### 1. Prasyarat Sistem
- **Node.js**: `v18.0.0` atau yang lebih baru
- **Database**: PostgreSQL (Local / Cloud Supabase / Neon.tech) atau SQLite untuk local backend testing
- **API Key**: [Google Gemini AI API Key](https://aistudio.google.com/)

---

### 2. Setup Frontend (`frontend/`)

```bash
# 1. Masuk ke direktori frontend
cd frontend

# 2. Install dependensi
npm install

# 3. Konfigurasi file .env
cp .env.example .env # atau buat file .env baru
```

**Isi file `frontend/.env`:**
```env
# Koneksi Database PostgreSQL
DATABASE_URL="postgresql://postgres:password@localhost:5432/flowerp_db?sslmode=disable"

# URL Backend Next.js
NEXT_PUBLIC_API_URL="http://localhost:3000"

# Google Gemini AI API Key
GEMINI_API_KEY="your_google_gemini_api_key"
```

```bash
# 4. Sinkronisasi Database Prisma
npx prisma db push

# 5. Jalankan Frontend Development Server
npm run dev
```
Buka browser di **`http://localhost:3000`**.

---

### 3. Setup Backend REST API (`backend/`) *(Opsional / Microservice)*

```bash
# 1. Masuk ke direktori backend
cd backend

# 2. Install dependensi
npm install

# 3. Konfigurasi file .env
```

**Isi file `backend/.env`:**
```env
NODE_ENV="development"
PORT=5000
API_PREFIX="/api/v1"
CORS_ORIGIN="http://localhost:3000"
DATABASE_URL="file:./dev.db" # atau PostgreSQL URL

JWT_ACCESS_SECRET="your_super_secret_jwt_access_key"
JWT_ACCESS_EXPIRES_IN="1d"
JWT_REFRESH_SECRET="your_super_secret_jwt_refresh_key"
JWT_REFRESH_EXPIRES_IN="7d"
LOG_LEVEL="debug"
```

```bash
# 4. Generate Prisma Client & Migrate
npm run prisma:generate

# 5. Jalankan Backend Server
npm run dev
```
- Server REST API berjalan di: **`http://localhost:5000/api/v1`**
- Dokumentasi Interaktif Swagger UI: **`http://localhost:5000/api-docs`**
- Health Check: **`http://localhost:5000/health`**

---

## Daftar Endpoint REST API Backend Utama

| Modul | Method | Endpoint | Deskripsi |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/v1/auth/login` | Login user & dapatkan JWT Access + Refresh Token |
| **Auth** | `POST` | `/api/v1/auth/register` | Pendaftaran user & perusahaan baru |
| **Dashboard** | `GET` | `/api/v1/dashboard/stats` | Statistik omzet, pesanan, dan grafik mingguan |
| **Products** | `GET` / `POST` | `/api/v1/products` | Ambil katalog produk & tambah produk baru |
| **Inventory** | `POST` | `/api/v1/inventory/adjust` | Input stok masuk/keluar/penyesuaian fisik |
| **Sales** | `GET` / `POST` | `/api/v1/sales` | Buat transaksi penjualan baru / cetak faktur |
| **Purchases**| `GET` / `POST` | `/api/v1/purchases` | Buat pesanan pembelian (PO) ke supplier |
| **Customers**| `GET` / `POST` | `/api/v1/customers` | Manajemen data pelanggan & credit limit |
| **Suppliers**| `GET` / `POST` | `/api/v1/suppliers` | Manajemen vendor & supplier |
| **Finance**  | `GET` / `POST` | `/api/v1/finance/expenses` | Manajemen pencatatan biaya & pengeluaran |
| **AI**       | `POST` | `/api/v1/ai/ask` | Chatbot analisis bisnis terintegrasi Gemini AI |
| **AI**       | `GET`  | `/api/v1/ai/replenishment` | Rekomendasi restock & velocity rate stok |

---

## Panduan Deployment ke Production

### Frontend ke Vercel:
1. Push repository ke **GitHub / GitLab**.
2. Hubungkan repository ke **[Vercel](https://vercel.com)** dengan memilih root direktori `frontend`.
3. Tambahkan environment variables di Vercel: `DATABASE_URL` (dari Supabase/Neon) dan `GEMINI_API_KEY`.
4. Klik **Deploy**.

### Backend ke Railway / Render / VPS:
1. Siapkan server Node.js atau Docker container yang mengarah ke direktori `backend`.
2. Pasang environment variables sesuai file `.env`.
3. Jalankan `npm run build && npm start`.

---

## Lisensi (License)

Sistem ini dilindungi di bawah **Single-Company Enterprise License**.  
Diberikan hak penggunaan penuh untuk 1 organisasi / perusahaan. Dilarang mendistribusikan ulang atau memperjualbelikan source code tanpa izin resmi.

---

*© 2026 FlowERP AI. Enterprise Intelligence Suite.*
