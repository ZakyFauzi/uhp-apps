# 🩺 UHP — UMKM Health Predictor

<p align="center">
  <strong>Platform Cerdas untuk Prediksi Kesehatan Bisnis UMKM Indonesia</strong><br>
  Powered by AI, Sentiment Analysis & Machine Learning
</p>

---

## 📋 Deskripsi

**UHP (UMKM Health Predictor)** adalah platform berbasis web yang menggunakan model ensemble Machine Learning (Random Forest + XGBoost) untuk mengklasifikasikan kesehatan bisnis UMKM ke dalam 4 kategori:

| Kelas | Deskripsi | Indikator |
|-------|-----------|-----------|
| 🟢 **Elite** | Bisnis sangat sehat | NPM > 15%, Burn Rate < 0.8 |
| 🔵 **Growth** | Bisnis berkembang baik | NPM positif, Burn Rate < 1.0 |
| 🟡 **Struggling** | Perlu perhatian | NPM mendekati 0, Burn Rate ~ 1.0 |
| 🔴 **Critical** | Risiko tinggi | NPM negatif, Burn Rate > 1.2 |

### ✨ Fitur Utama

- **🔍 Prediksi AI Real-Time** — Analisis kesehatan bisnis dengan input data finansial sederhana
- **💬 Analisis Sentimen NLP** — Mesin NLP berbahasa Indonesia untuk menganalisis ulasan pelanggan
- **📊 Data Explorer** — Jelajahi dataset UMKM dengan filter, pencarian, dan paginasi
- **🤖 Ask UHePi** — Chatbot AI (powered by Google Gemini) untuk konsultasi strategi bisnis
- **🏪 Bisnis Saya** — Dashboard personal untuk UMKM owner yang login
- **🔐 Autentikasi** — Sistem login dengan simulasi client-side untuk demo

---

## 🏗️ Arsitektur

```
uhp-apps/
├── index.html            ← Landing Page
├── login.html            ← Halaman Login
├── demo.html             ← Demo Mode (fitur terbatas)
├── dashboard.html        ← Dashboard (full, setelah login)
├── css/
│   ├── shared.css        ← Design tokens & reset
│   ├── landing.css       ← Styles landing page
│   ├── login.css         ← Styles login page
│   ├── dashboard.css     ← Styles dashboard & demo
│   └── chatbot.css       ← Styles UHePi chatbot
├── js/
│   ├── data.js           ← Database user & profil UMKM
│   ├── auth.js           ← Sistem autentikasi (localStorage)
│   ├── engine.js         ← Prediction engine & NLP sentiment
│   ├── dashboard.js      ← UI logic dashboard
│   ├── chatbot.js        ← UHePi AI chatbot (Gemini API)
│   └── landing.js        ← Animasi landing page
├── netlify/
│   └── functions/
│       └── chat.js       ← Serverless API proxy (Gemini)
├── netlify.toml          ← Konfigurasi Netlify
└── UMKM-data/            ← Dataset UMKM
    ├── synthetic_umkm_data.csv
    └── umkm_preview.json
```

---

## 🚀 Cara Menjalankan

### Lokal (Development)

```bash
# Clone repository
git clone <repository-url>
cd uhp-apps

# Jalankan HTTP server
python -m http.server 8080

# Buka di browser
# http://localhost:8080
```

> **Catatan:** Untuk lokal development, chatbot akan langsung memanggil Gemini API dari browser (client-side fallback). Untuk deployment, gunakan Netlify Functions sebagai server-side proxy.

### Deploy ke Netlify

1. **Push ke GitHub** — Pastikan semua file sudah di-commit
2. **Hubungkan ke Netlify** — Import repository di [Netlify Dashboard](https://app.netlify.com)
3. **Set Environment Variable** di Netlify:
   - Buka `Site settings → Environment variables → Add a variable`
   - Tambahkan:

   | Key | Value |
   |-----|-------|
   | `GEMINI_API_KEY` | `AIzaSyDc9k6NfmX1H2rGt2oEoJ1ojmNTT251LSg` |

4. **Trigger Redeploy** — Setelah menambahkan environment variable, klik `Deploys → Trigger deploy → Deploy site`

> **Penting:** Environment variable di Netlify digunakan oleh serverless function (`netlify/functions/chat.js`) agar API key tidak perlu di-expose di client-side JavaScript.

---

## 🔐 Akun Demo

| Nama | Email | Password | Bisnis |
|------|-------|----------|--------|
| Andi | andi@uhp.id | andi123 | Warung Makan Pak Andi |
| Zaky Muhammad Fauzi | zaky@uhp.id | zaky123 | Tech Supplies Zaky |
| Brama Hartoyo | brama@uhp.id | brama123 | Brama Coffee House |
| Ghifary Wibisono | ghifary@uhp.id | ghifary123 | Ghifary Digital Print |
| Luthfia Maulidya Izzati | luthfia@uhp.id | luthfia123 | Luthfia Beauty Care |
| Prayata Yasinkha Adnien | prayata@uhp.id | prayata123 | Adnien Craft Studio |

---

## 🔄 Alur Pengguna

```
Landing Page ──→ Coba Demo ──→ Demo Mode (terbatas)
     │                               │
     │                               ├── Analisis AI ✅
     │                               ├── Data Explorer ✅
     │                               └── UHePi (3 pesan) ⚠️
     │                                        │
     └──→ Login ──→ Full Dashboard             │
                          │              ←─────┘ (prompt login)
                          ├── Analisis AI ✅
                          ├── Data Explorer ✅
                          ├── Bisnis Saya ✅ (baru)
                          └── UHePi (unlimited) ✅
```

---

## 🤖 UHePi — AI Assistant

UHePi (UMKM Health Predictor Intelligence) adalah chatbot AI yang menggunakan **Google Gemini API** (`gemini-2.0-flash-lite`) untuk memberikan konsultasi bisnis. Fitur:

- **Context-aware**: Jika user login, UHePi otomatis mengetahui data bisnis user (revenue, burn rate, NPM, dll.)
- **Bahasa Indonesia**: Selalu menjawab dalam Bahasa Indonesia yang mudah dipahami
- **Demo Limit**: 3 pesan gratis di mode demo, unlimited setelah login
- **Server-side Proxy**: API key dilindungi melalui Netlify Functions

### Konfigurasi API

| Item | Detail |
|------|--------|
| Provider | Google AI (Gemini) |
| Model | `gemini-2.0-flash-lite` |
| Rate Limit | 30 RPM / 1M TPM (free tier) |
| Proxy | `netlify/functions/chat.js` |

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | Vanilla HTML, CSS, JavaScript |
| Design | Glassmorphism, Dark Mode, CSS Variables |
| AI/ML Engine | Rule-based ensemble (simulated RF + XGBoost) |
| NLP | Custom Indonesian sentiment lexicon |
| Chatbot | Google Gemini API (`gemini-2.0-flash-lite`) |
| Auth | Client-side SHA-256 + localStorage |
| Hosting | Netlify (static + serverless functions) |
| Font | Inter (Google Fonts) |

---

## 📝 Catatan Penting

- **Autentikasi bersifat simulasi client-side** — cocok untuk demo akademik, bukan production
- **API key Gemini** — disimpan di Netlify environment variable untuk deployment, fallback embeds di JS untuk local dev
- **Data UMKM** — menggunakan data sintetis yang di-embed langsung di JavaScript (bukan fetch dari CSV) untuk menghindari masalah loading

---

## 👥 Tim

Dibuat untuk mata kuliah **Data Science Application Design** — Universitas Telkom

---

## 📄 Lisensi

Project ini dibuat untuk keperluan akademik.
