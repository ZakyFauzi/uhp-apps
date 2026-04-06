/* =============================================
   UHP v2.0 — Data Layer
   User Database + UMKM Sample Profiles
   ============================================= */

'use strict';

// ─── User Database ───────────────────────────────────────────
// Passwords are stored as SHA-256 hashes (computed at bottom)
const UHP_USERS = [
  {
    id: 'usr_001',
    name: 'Andi',
    email: 'andi@uhp.id',
    passwordHash: '', // filled at init
    _pw: 'andi123',
    avatar: 'A',
    umkmId: 'umkm_001',
    umkmName: 'Warung Makan Pak Andi',
    sector: 'Kuliner',
  },
  {
    id: 'usr_002',
    name: 'Zaky Muhammad Fauzi',
    email: 'zaky@uhp.id',
    passwordHash: '',
    _pw: 'zaky123',
    avatar: 'Z',
    umkmId: 'umkm_002',
    umkmName: 'Tech Supplies Zaky',
    sector: 'Teknologi',
  },
  {
    id: 'usr_003',
    name: 'Brama Hartoyo',
    email: 'brama@uhp.id',
    passwordHash: '',
    _pw: 'brama123',
    avatar: 'B',
    umkmId: 'umkm_003',
    umkmName: 'Brama Coffee House',
    sector: 'F&B / Kafe',
  },
  {
    id: 'usr_004',
    name: 'Ghifary Wibisono',
    email: 'ghifary@uhp.id',
    passwordHash: '',
    _pw: 'ghifary123',
    avatar: 'G',
    umkmId: 'umkm_004',
    umkmName: 'Ghifary Digital Print',
    sector: 'Percetakan Digital',
  },
  {
    id: 'usr_005',
    name: 'Luthfia Maulidya Izzati',
    email: 'luthfia@uhp.id',
    passwordHash: '',
    _pw: 'luthfia123',
    avatar: 'L',
    umkmId: 'umkm_005',
    umkmName: 'Luthfia Beauty Care',
    sector: 'Kecantikan',
  },
  {
    id: 'usr_006',
    name: 'Prayata Yasinkha Adnien',
    email: 'prayata@uhp.id',
    passwordHash: '',
    _pw: 'prayata123',
    avatar: 'P',
    umkmId: 'umkm_006',
    umkmName: 'Adnien Craft Studio',
    sector: 'Kerajinan Tangan',
  },
];

// ─── UMKM Business Profiles ─────────────────────────────────
// Each user's UMKM with 6-month historical data
const UHP_UMKM_PROFILES = {
  umkm_001: {
    name: 'Warung Makan Pak Andi',
    sector: 'Kuliner',
    location: 'Bandung, Jawa Barat',
    tenure: 84,
    currentClass: 'Elite',
    history: [
      { month: 'Nov 2025', revenue: 18500000, expenses: 11800000, transactions: 145, sentiment: 0.72, class: 'Elite' },
      { month: 'Des 2025', revenue: 21000000, expenses: 13200000, transactions: 168, sentiment: 0.68, class: 'Elite' },
      { month: 'Jan 2026', revenue: 19200000, expenses: 12500000, transactions: 152, sentiment: 0.75, class: 'Elite' },
      { month: 'Feb 2026', revenue: 20500000, expenses: 13000000, transactions: 160, sentiment: 0.70, class: 'Elite' },
      { month: 'Mar 2026', revenue: 22000000, expenses: 13800000, transactions: 175, sentiment: 0.78, class: 'Elite' },
      { month: 'Apr 2026', revenue: 21500000, expenses: 13500000, transactions: 170, sentiment: 0.74, class: 'Elite' },
    ],
    recentReview: 'Makanan selalu enak dan porsi besar. Pelayanan cepat dan ramah, harga bersahabat.',
  },
  umkm_002: {
    name: 'Tech Supplies Zaky',
    sector: 'Teknologi',
    location: 'Jakarta Selatan',
    tenure: 48,
    currentClass: 'Growth',
    history: [
      { month: 'Nov 2025', revenue: 9500000, expenses: 7200000, transactions: 95, sentiment: 0.35, class: 'Growth' },
      { month: 'Des 2025', revenue: 11000000, expenses: 8500000, transactions: 110, sentiment: 0.30, class: 'Growth' },
      { month: 'Jan 2026', revenue: 8800000, expenses: 7000000, transactions: 88, sentiment: 0.28, class: 'Growth' },
      { month: 'Feb 2026', revenue: 10200000, expenses: 7800000, transactions: 102, sentiment: 0.40, class: 'Growth' },
      { month: 'Mar 2026', revenue: 12500000, expenses: 9200000, transactions: 125, sentiment: 0.45, class: 'Growth' },
      { month: 'Apr 2026', revenue: 11800000, expenses: 8800000, transactions: 118, sentiment: 0.38, class: 'Growth' },
    ],
    recentReview: 'Harga kompetitif dan produk original. Pengiriman kadang sedikit lambat tapi overall oke.',
  },
  umkm_003: {
    name: 'Brama Coffee House',
    sector: 'F&B / Kafe',
    location: 'Yogyakarta',
    tenure: 30,
    currentClass: 'Growth',
    history: [
      { month: 'Nov 2025', revenue: 7200000, expenses: 5800000, transactions: 72, sentiment: 0.25, class: 'Struggling' },
      { month: 'Des 2025', revenue: 8500000, expenses: 6200000, transactions: 85, sentiment: 0.32, class: 'Growth' },
      { month: 'Jan 2026', revenue: 7800000, expenses: 6000000, transactions: 78, sentiment: 0.30, class: 'Growth' },
      { month: 'Feb 2026', revenue: 9000000, expenses: 6500000, transactions: 90, sentiment: 0.42, class: 'Growth' },
      { month: 'Mar 2026', revenue: 9500000, expenses: 6800000, transactions: 95, sentiment: 0.48, class: 'Growth' },
      { month: 'Apr 2026', revenue: 10200000, expenses: 7200000, transactions: 102, sentiment: 0.45, class: 'Growth' },
    ],
    recentReview: 'Kopi enak dan tempat nyaman untuk bekerja. Menu makanan ringannya juga oke. Semoga makin berkembang!',
  },
  umkm_004: {
    name: 'Ghifary Digital Print',
    sector: 'Percetakan Digital',
    location: 'Surabaya',
    tenure: 18,
    currentClass: 'Struggling',
    history: [
      { month: 'Nov 2025', revenue: 5200000, expenses: 5500000, transactions: 52, sentiment: -0.10, class: 'Struggling' },
      { month: 'Des 2025', revenue: 6800000, expenses: 6200000, transactions: 68, sentiment: 0.05, class: 'Growth' },
      { month: 'Jan 2026', revenue: 4500000, expenses: 5000000, transactions: 45, sentiment: -0.15, class: 'Struggling' },
      { month: 'Feb 2026', revenue: 5000000, expenses: 5200000, transactions: 50, sentiment: -0.08, class: 'Struggling' },
      { month: 'Mar 2026', revenue: 5500000, expenses: 5400000, transactions: 55, sentiment: 0.02, class: 'Struggling' },
      { month: 'Apr 2026', revenue: 5800000, expenses: 5600000, transactions: 58, sentiment: 0.10, class: 'Struggling' },
    ],
    recentReview: 'Kualitas cetak lumayan tapi kadang stok bahan habis. Respon chat agak lambat.',
  },
  umkm_005: {
    name: 'Luthfia Beauty Care',
    sector: 'Kecantikan',
    location: 'Malang, Jawa Timur',
    tenure: 36,
    currentClass: 'Elite',
    history: [
      { month: 'Nov 2025', revenue: 15000000, expenses: 9500000, transactions: 120, sentiment: 0.65, class: 'Elite' },
      { month: 'Des 2025', revenue: 18000000, expenses: 11000000, transactions: 144, sentiment: 0.70, class: 'Elite' },
      { month: 'Jan 2026', revenue: 14200000, expenses: 9200000, transactions: 114, sentiment: 0.62, class: 'Elite' },
      { month: 'Feb 2026', revenue: 16500000, expenses: 10200000, transactions: 132, sentiment: 0.72, class: 'Elite' },
      { month: 'Mar 2026', revenue: 17800000, expenses: 10800000, transactions: 142, sentiment: 0.75, class: 'Elite' },
      { month: 'Apr 2026', revenue: 19000000, expenses: 11500000, transactions: 152, sentiment: 0.78, class: 'Elite' },
    ],
    recentReview: 'Produk kecantikan berkualitas dan pelayanan sangat ramah. Konsultasi gratis sangat membantu!',
  },
  umkm_006: {
    name: 'Adnien Craft Studio',
    sector: 'Kerajinan Tangan',
    location: 'Solo, Jawa Tengah',
    tenure: 8,
    currentClass: 'Critical',
    history: [
      { month: 'Nov 2025', revenue: 2200000, expenses: 3000000, transactions: 22, sentiment: -0.30, class: 'Critical' },
      { month: 'Des 2025', revenue: 3500000, expenses: 3200000, transactions: 35, sentiment: -0.15, class: 'Struggling' },
      { month: 'Jan 2026', revenue: 1800000, expenses: 2800000, transactions: 18, sentiment: -0.40, class: 'Critical' },
      { month: 'Feb 2026', revenue: 2000000, expenses: 2900000, transactions: 20, sentiment: -0.35, class: 'Critical' },
      { month: 'Mar 2026', revenue: 2500000, expenses: 3100000, transactions: 25, sentiment: -0.25, class: 'Critical' },
      { month: 'Apr 2026', revenue: 2800000, expenses: 3200000, transactions: 28, sentiment: -0.20, class: 'Critical' },
    ],
    recentReview: 'Produk unik tapi pengiriman lambat. Harga agak mahal dibanding kualitas. Butuh perbaikan layanan.',
  },
};

// ─── Sample Dataset for Data Explorer (15 businesses) ────────
const UHP_SAMPLE_DATA = [
  { ID: 1,  Monthly_Revenue: 21500000, 'Net_Profit_Margin (%)': 37.2,  Burn_Rate_Ratio: 0.628, Transaction_Count: 170, Avg_Historical_Rating: 4.8, Sentiment_Score: 0.74, Class: 'Elite',      Review_Text: 'Pelayanan cepat dan ramah, pesanan selalu tepat.' },
  { ID: 2,  Monthly_Revenue: 11800000, 'Net_Profit_Margin (%)': 25.4,  Burn_Rate_Ratio: 0.746, Transaction_Count: 118, Avg_Historical_Rating: 4.2, Sentiment_Score: 0.38, Class: 'Growth',     Review_Text: 'Harga kompetitif, pengiriman kadang lambat tapi overall oke.' },
  { ID: 3,  Monthly_Revenue: 10200000, 'Net_Profit_Margin (%)': 29.4,  Burn_Rate_Ratio: 0.706, Transaction_Count: 102, Avg_Historical_Rating: 4.3, Sentiment_Score: 0.45, Class: 'Growth',     Review_Text: 'Kopi enak, tempat nyaman untuk bekerja.' },
  { ID: 4,  Monthly_Revenue: 5800000,  'Net_Profit_Margin (%)': 3.4,   Burn_Rate_Ratio: 0.966, Transaction_Count: 58,  Avg_Historical_Rating: 3.5, Sentiment_Score: 0.10, Class: 'Struggling', Review_Text: 'Kualitas lumayan tapi stok kadang habis.' },
  { ID: 5,  Monthly_Revenue: 19000000, 'Net_Profit_Margin (%)': 39.5,  Burn_Rate_Ratio: 0.605, Transaction_Count: 152, Avg_Historical_Rating: 4.9, Sentiment_Score: 0.78, Class: 'Elite',      Review_Text: 'Produk berkualitas, pelayanan sangat ramah dan cepat.' },
  { ID: 6,  Monthly_Revenue: 2800000,  'Net_Profit_Margin (%)': -14.3, Burn_Rate_Ratio: 1.143, Transaction_Count: 28,  Avg_Historical_Rating: 2.8, Sentiment_Score: -0.20, Class: 'Critical',  Review_Text: 'Produk unik tapi pengiriman lambat. Harga mahal.' },
  { ID: 7,  Monthly_Revenue: 15200000, 'Net_Profit_Margin (%)': 31.6,  Burn_Rate_Ratio: 0.684, Transaction_Count: 130, Avg_Historical_Rating: 4.5, Sentiment_Score: 0.60, Class: 'Elite',      Review_Text: 'Selalu puas belanja di sini, kualitas konsisten.' },
  { ID: 8,  Monthly_Revenue: 6500000,  'Net_Profit_Margin (%)': 7.7,   Burn_Rate_Ratio: 0.923, Transaction_Count: 65,  Avg_Historical_Rating: 3.8, Sentiment_Score: 0.15, Class: 'Growth',     Review_Text: 'Pelayanan standar, harga masih reasonable.' },
  { ID: 9,  Monthly_Revenue: 3200000,  'Net_Profit_Margin (%)': -18.8, Burn_Rate_Ratio: 1.188, Transaction_Count: 32,  Avg_Historical_Rating: 2.5, Sentiment_Score: -0.45, Class: 'Critical',  Review_Text: 'Admin lambat, banyak keluhan tidak ditanggapi.' },
  { ID: 10, Monthly_Revenue: 4800000,  'Net_Profit_Margin (%)': -4.2,  Burn_Rate_Ratio: 1.042, Transaction_Count: 48,  Avg_Historical_Rating: 3.2, Sentiment_Score: -0.10, Class: 'Struggling', Review_Text: 'Harga naik tapi kualitas tidak berubah.' },
  { ID: 11, Monthly_Revenue: 25000000, 'Net_Profit_Margin (%)': 42.0,  Burn_Rate_Ratio: 0.580, Transaction_Count: 200, Avg_Historical_Rating: 4.9, Sentiment_Score: 0.85, Class: 'Elite',      Review_Text: 'Luar biasa! Produk premium dengan layanan terbaik.' },
  { ID: 12, Monthly_Revenue: 8200000,  'Net_Profit_Margin (%)': 15.9,  Burn_Rate_Ratio: 0.841, Transaction_Count: 82,  Avg_Historical_Rating: 4.0, Sentiment_Score: 0.28, Class: 'Growth',     Review_Text: 'Bagus, tapi masih bisa ditingkatkan lagi.' },
  { ID: 13, Monthly_Revenue: 4200000,  'Net_Profit_Margin (%)': -7.1,  Burn_Rate_Ratio: 1.071, Transaction_Count: 42,  Avg_Historical_Rating: 3.0, Sentiment_Score: -0.18, Class: 'Struggling', Review_Text: 'Pesanan sering telat, kualitas tidak konsisten.' },
  { ID: 14, Monthly_Revenue: 1500000,  'Net_Profit_Margin (%)': -33.3, Burn_Rate_Ratio: 1.333, Transaction_Count: 15,  Avg_Historical_Rating: 2.1, Sentiment_Score: -0.60, Class: 'Critical',  Review_Text: 'Sangat mengecewakan. Produk rusak dan tidak ada refund.' },
  { ID: 15, Monthly_Revenue: 13500000, 'Net_Profit_Margin (%)': 28.1,  Burn_Rate_Ratio: 0.719, Transaction_Count: 108, Avg_Historical_Rating: 4.4, Sentiment_Score: 0.55, Class: 'Growth',     Review_Text: 'Produk berkualitas dengan harga competitive.' },
];

// Pre-computed stats for 15 sample businesses
const UHP_DATA_STATS = {
  total: 15,
  Elite: 4,
  Growth: 5,
  Struggling: 3,
  Critical: 3,
};

// ─── Hash passwords on load ─────────────────────────────────
async function hashSHA256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function initUserHashes() {
  for (const u of UHP_USERS) {
    u.passwordHash = await hashSHA256(u._pw);
  }
}

// Run on load
initUserHashes();
