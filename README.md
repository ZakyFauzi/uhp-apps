# 🩺 UHP — UMKM Health Predictor v3.0

<p align="center">
  <strong>Platform Cerdas Real-time untuk Prediksi Kesehatan Bisnis UMKM Indonesia</strong><br>
  Powered by AI, Supabase Realtime DB, Sentiment Analysis & Machine Learning
</p>

---

## 📋 Deskripsi

**UHP (UMKM Health Predictor)** adalah platform berbasis web untuk mengklasifikasikan kesehatan bisnis UMKM ke dalam 4 kategori (Elite, Growth, Struggling, Critical) menggunakan model machine learning (Random Forest + XGBoost) serta analisis sentimen NLP ulasan pelanggan secara real-time.

Versi 3.0 ini telah diintegrasikan dengan **Supabase** untuk autentikasi riil, penyimpanan data terdistribusi (profil UMKM, riwayat bulanan, log transaksi), dan pembaruan visual dashboard secara real-time menggunakan PostgreSQL replication channel.

| Kelas | Deskripsi | Indikator |
|-------|-----------|-----------|
| 🟢 **Elite** | Bisnis sangat sehat | NPM > 15%, Burn Rate < 0.8 |
| 🔵 **Growth** | Bisnis berkembang baik | NPM positif, Burn Rate < 1.0 |
| 🟡 **Struggling** | Perlu perhatian | NPM mendekati 0, Burn Rate ~ 1.0 |
| 🔴 **Critical** | Risiko tinggi | NPM negatif, Burn Rate > 1.2 |

### ✨ Fitur Utama

- **🔐 Autentikasi Supabase Riil** — Login & pendaftaran akun aman terhubung ke database cloud Supabase.
- **📊 Data Explorer Transaksi Real-time** — Halaman "Bisnis Saya" memiliki tabel data explorer transaksi dan form input transaksi baru.
- **🔄 Sinkronisasi Real-time** — Menambahkan transaksi baru secara otomatis menghitung skor sentimen ulasan pembeli (menggunakan modul NLP), memperbarui total bulanan, memicu model ML untuk memperbarui kelas kesehatan bisnis, dan langsung memperbarui diagram/metrik dashboard tanpa refresh halaman.
- **🤖 Ask UHePi Chatbot** — Chatbot bimbingan bisnis cerdas bertenaga Google Gemini API (`gemini-2.5-flash`), memahami konteks data finansial terkini bisnis Anda secara langsung.
- **🌐 UI Premium & Aksesibilitas** — Dukungan Tema Gelap/Terang, pengaturan Ukuran Teks (Besar/Normal), dan tata letak yang responsif.

---

## 🏗️ Struktur Proyek

```
uhp-apps/
├── index.html            ← Landing Page utama
├── login.html            ← Halaman Login Supabase
├── register.html         ← Halaman Register Supabase
├── dashboard.html        ← Dashboard utama pengguna
├── css/
│   ├── shared.css        ← Token desain, Dark mode, & Aksesibilitas
│   ├── landing.css       ← Desain Landing page
│   ├── login.css         ← Desain Login/Register
│   ├── dashboard.css     ← Desain Dashboard & Data Explorer
│   └── chatbot.css       ← Desain Chatbot UHePi
├── js/
│   ├── auth.js           ← Integrasi Supabase Auth & Session Manager
│   ├── dashboard.js      ← Sinkronisasi & visualisasi dashboard + Realtime DB
│   ├── ml_engine.js      ← ML client-side (NLP Sentiment & Tabular ONNX)
│   ├── engine.js         ← Kamus sentimen lokal & rule-based classifier fallback
│   ├── chatbot.js        ← Chatbot UI & logic (Gemini API)
│   └── accessibility.js  ← Pengatur tema (Dark/Light) & ukuran teks
├── netlify/
│   └── functions/
│     └── chat.js         ← Serverless proxy untuk menyembunyikan Gemini API Key
├── netlify.toml          ← Konfigurasi serverless Netlify
└── README.md             ← Dokumentasi Proyek
```

---

## 🚀 Instalasi & Konfigurasi Lokal

### 1. Database Supabase Setup

Buat project baru di Supabase, lalu jalankan query SQL berikut di **SQL Editor** Supabase untuk menyiapkan skema tabel:

```sql
-- 1. Tabel User Profiles (Auto-sync dari Supabase Auth via trigger)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  avatar text default 'U',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Buat trigger fungsi otomatis untuk new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, avatar)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Pengguna UHP'),
    upper(substring(coalesce(new.raw_user_meta_data->>'name', 'U') from 1 for 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Tabel Profil UMKM
create table public.umkm_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  sector text not null,
  location text default 'Indonesia',
  tenure int default 1,
  current_class text default 'Growth',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tabel Riwayat Bulanan UMKM
create table public.umkm_history (
  id uuid default gen_random_uuid() primary key,
  umkm_id uuid references public.umkm_profiles(id) on delete cascade not null,
  month text not null, -- format: "Mei 2026"
  revenue numeric(15,2) not null,
  expenses numeric(15,2) not null,
  transactions int not null,
  sentiment numeric(3,2) not null,
  class text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Tabel Transaksi Detil (Mendukung Real-time updates)
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  umkm_id uuid references public.umkm_profiles(id) on delete cascade not null,
  order_number text not null,
  date date not null,
  customer_name text,
  item_name text not null,
  quantity int default 1,
  price numeric(15,2) not null,
  amount numeric(15,2) not null,
  review_text text,
  sentiment_score numeric(3,2),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Aktifkan Realtime Replication untuk tabel transactions & umkm_profiles
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.umkm_profiles;
```

### 2. Jalankan secara Lokal

1. Duplikasi file `.env.example` (atau buat file `.env` di folder root):
   ```env
   GEMINI_API_KEY=AIzaSyDc9k6NfmX1H2rGt2oEoJ1ojmNTT251LSg
   ```
2. Jalankan server lokal menggunakan Netlify CLI (untuk menguji serverless functions) atau http server Python:
   ```bash
   # Menggunakan Python
   python -m http.server 8080
   
   # ATAU Menggunakan Netlify CLI (Merekomendasikan port 8888)
   npm install -g netlify-cli
   netlify dev
   ```

---

## 🌐 Deployment ke Netlify

1. Hubungkan repository GitHub Anda ke Netlify.
2. Tambahkan Environment Variable di dashboard Netlify (`Site settings → Environment variables`):
   - **`GEMINI_API_KEY`** = `AIzaSyDc9k6NfmX1H2rGt2oEoJ1ojmNTT251LSg` (atau Gemini API Key Anda sendiri)
3. Netlify akan otomatis mem-build file static dan mendeploy serverless function di `/netlify/functions/chat` secara otomatis.

---

## 🔐 Akun Uji Coba (Seeded di Database)

Gunakan daftar akun berikut untuk masuk ke dashboard utama:

| Nama | Email | Password |
|------|-------|----------|
| Andi | `andi@uhp.id` | `andi123` |
| Zaky Muhammad Fauzi | `zaky@uhp.id` | `zaky123` |
| Brama Hartoyo | `brama@uhp.id` | `brama123` |
| Ghifary Wibisono | `ghifary@uhp.id` | `ghifary123` |
| Luthfia Maulidya Izzati | `luthfia@uhp.id` | `luthfia123` |
| Prayata Yasinkha Adnien | `prayata@uhp.id` | `prayata123` |

---

## Tim DSAD - Universitas Telkom
Project ini dikembangkan sebagai aplikasi desain data science untuk pemberdayaan UMKM Indonesia agar mandiri dalam memantau kesehatan bisnis mereka.
