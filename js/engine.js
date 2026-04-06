/* =============================================
   UHP v2.0 — Prediction Engine + NLP
   Pure logic functions (no DOM dependencies)
   ============================================= */

'use strict';

// ─── Indonesian Sentiment Lexicon ────────────────────────────
const POSITIVE_WORDS = [
  'lancar','bagus','baik','ramah','cepat','tepat','senang','puas','luar biasa',
  'konsisten','terjaga','mudah','responsif','komunikatif','repeat order','selalu',
  'terbaik','mantap','oke','cocok','suka','mau lagi','recommended','rekomendasi',
  'kualitas','sesuai','memuaskan','excellent','great','good','fast','nice',
  'pengiriman cepat','admin komunikatif','proses checkout tidak ribet','mudah dipakai',
  'pemesanan mudah','pelayanan cepat','pesanan selalu tepat','seimbang'
];

const NEGATIVE_WORDS = [
  'lambat','buruk','jelek','kecewa','kurang','telat','terlambat','bermasalah',
  'tidak puas','tidak baik','naik harga','mahal','sering kosong','stok kosong',
  'lama','mengecewakan','menurun','rugi','susah','tidak responsif','tidak ada',
  'ribet','gagal','batal','tidak sesuai','protes','banyak masalah','kualitas buruk',
  'tidak konsisten','respons lambat','keterlambatan','komplain','tidak ramah',
  'harga naik','layanan tidak membaik','kosong','proses bermasalah',
  'tidak oke','kurang memuaskan','tidak tepat','sering terlambat'
];

const STRONG_POSITIVE = ['sangat bagus','sangat puas','luar biasa','perfect','excellent','sempurna','terbaik'];
const STRONG_NEGATIVE = ['sangat buruk','sangat kecewa','sangat lambat','sangat bermasalah','terburuk','parah'];

// ─── Sentiment Engine ────────────────────────────────────────
function computeSentiment(text) {
  if (!text || text.trim() === '') return 0;
  const lower = text.toLowerCase();
  let score = 0;

  STRONG_POSITIVE.forEach(w => { if (lower.includes(w)) score += 0.65; });
  STRONG_NEGATIVE.forEach(w => { if (lower.includes(w)) score -= 0.65; });
  POSITIVE_WORDS.forEach(w => { if (lower.includes(w)) score += 0.25; });
  NEGATIVE_WORDS.forEach(w => { if (lower.includes(w)) score -= 0.25; });

  return Math.max(-1, Math.min(1, score));
}

function sentimentLabel(score) {
  if (score >= 0.5) return 'Sangat Positif';
  if (score >= 0.2) return 'Positif';
  if (score >= -0.15) return 'Netral';
  if (score >= -0.4) return 'Negatif';
  return 'Sangat Negatif';
}

// ─── Prediction Engine ───────────────────────────────────────
function predictClass(revenue, expenses, transactions, tenure, sentimentScore) {
  const netProfit = revenue - expenses;
  const npm = revenue > 0 ? ((netProfit / revenue) * 100) : 0;
  const burnRate = revenue > 0 ? (expenses / revenue) : 1.5;

  let predictedClass = '';
  let confidence = 0;

  if (burnRate < 0.8 && npm >= 15 && netProfit > 0) {
    predictedClass = 'Elite';
    const burnScore = (0.8 - burnRate) / 0.3;
    const npmScore  = Math.min(1, (npm - 15) / 25);
    const sentScore = Math.max(0, (sentimentScore + 1) / 2);
    confidence = 0.45 + (burnScore * 0.25) + (npmScore * 0.2) + (sentScore * 0.1);
  }
  else if ((burnRate >= 1.15 && npm <= -18) || (burnRate >= 1.2 && sentimentScore < -0.3)) {
    predictedClass = 'Critical';
    const burnScore = Math.min(1, (burnRate - 1.15) / 0.3);
    const lossScore = Math.min(1, Math.abs(npm + 18) / 17);
    const sentScore = Math.max(0, (-sentimentScore + 0.3) / 1.3);
    confidence = 0.45 + (burnScore * 0.25) + (lossScore * 0.2) + (sentScore * 0.1);
  }
  else if (burnRate >= 1.0 || npm < 0) {
    predictedClass = 'Struggling';
    const burnScore = Math.min(1, (burnRate - 1.0) / 0.15);
    const lossScore = Math.min(1, Math.abs(Math.min(0, npm)) / 20);
    const sentScore = Math.max(0, (-sentimentScore + 1) / 2);
    confidence = 0.40 + (burnScore * 0.2) + (lossScore * 0.2) + (sentScore * 0.1);
  }
  else {
    predictedClass = 'Growth';
    const npmScore  = Math.min(1, npm / 15);
    const burnScore = Math.min(1, (1.0 - burnRate) / 0.2);
    const sentScore = Math.max(0, (sentimentScore + 1) / 2);
    confidence = 0.38 + (npmScore * 0.25) + (burnScore * 0.2) + (sentScore * 0.1);
  }

  if (tenure > 60) confidence = Math.min(0.98, confidence + 0.03);
  if (tenure < 6) confidence = Math.max(0.30, confidence - 0.05);
  confidence = Math.max(0.30, Math.min(0.98, confidence));

  return { predictedClass, confidence, npm, burnRate, netProfit };
}

// ─── Feature Importance ──────────────────────────────────────
function getFeatureImportance(predictedClass, sentimentScore, burnRate) {
  const base = [
    { name: 'Burn Rate Ratio',   value: 0.28 },
    { name: 'Net Profit Margin', value: 0.24 },
    { name: 'Sentiment Score',   value: 0.18 },
    { name: 'Monthly Revenue',   value: 0.13 },
    { name: 'Transaction Count', value: 0.09 },
    { name: 'Business Tenure',   value: 0.08 },
  ];

  if (predictedClass === 'Critical' || predictedClass === 'Struggling') {
    base[0].value = 0.31;
    base[2].value = 0.20;
  } else if (predictedClass === 'Elite') {
    base[3].value = 0.16;
    base[2].value = 0.15;
  }
  if (Math.abs(sentimentScore) > 0.4) {
    base[2].value += 0.03;
  }

  const total = base.reduce((s, f) => s + f.value, 0);
  return base
    .map(f => ({ ...f, pct: Math.round((f.value / total) * 100) }))
    .sort((a, b) => b.value - a.value);
}

// ─── Insight Recommendations ─────────────────────────────────
const INSIGHTS = {
  Elite: {
    icon: '🚀',
    text: 'Bisnis sangat sehat! Arus kas positif dan sentimen pelanggan mendukung pertumbuhan berkelanjutan.',
    actions: [
      { tag: 'Ekspansi', color: 'var(--elite)', text: 'Fokus pada ekspansi pasar dan akuisisi segmen baru' },
      { tag: 'Loyalitas', color: 'var(--elite)', text: 'Tingkatkan program retensi dan loyalitas pelanggan' },
      { tag: 'Scaling', color: 'var(--elite)', text: 'Pertimbangkan diversifikasi produk atau buka gerai baru' },
    ],
  },
  Growth: {
    icon: '📈',
    text: 'Bisnis berkembang dengan baik. Profitabilitas positif namun efisiensi biaya masih bisa dioptimalkan.',
    actions: [
      { tag: 'Efisiensi', color: 'var(--growth)', text: 'Review biaya operasional dan negosiasi supplier' },
      { tag: 'Digital', color: 'var(--growth)', text: 'Tingkatkan adopsi digital untuk pertumbuhan transaksi' },
      { tag: 'Monitor', color: 'var(--growth)', text: 'Pantau burn rate agar tidak mendekati 1.0' },
    ],
  },
  Struggling: {
    icon: '⚠️',
    text: 'Kondisi kritis pada arus kas. Pengeluaran melebihi atau mendekati pendapatan — perlu tindakan segera.',
    actions: [
      { tag: 'Harga', color: 'var(--struggling)', text: 'Tinjau ulang strategi penetapan harga' },
      { tag: 'Burn Rate', color: 'var(--struggling)', text: 'Identifikasi dan kurangi pengeluaran tanpa ROI' },
      { tag: 'Sentimen', color: 'var(--struggling)', text: 'Fokus perbaikan layanan pelanggan' },
    ],
  },
  Critical: {
    icon: '🚨',
    text: 'Risiko tinggi! Bisnis mengalami kerugian signifikan. Diperlukan restrukturisasi segera.',
    actions: [
      { tag: 'Darurat', color: 'var(--critical)', text: 'Audit menyeluruh semua pos pengeluaran' },
      { tag: 'Revenue', color: 'var(--critical)', text: 'Promo agresif, bundling, atau pivot model bisnis' },
      { tag: 'Konsultasi', color: 'var(--critical)', text: 'Akses program bantuan UMKM atau konsultan' },
    ],
  },
};

// ─── Presets ─────────────────────────────────────────────────
const PRESETS = {
  elite:     { rev: 20000000, exp: 13000000, trx: 160, tenure: 90,  review: 'Pelayanan cepat dan ramah, pesanan selalu tepat. Aplikasi pemesanan mudah dipakai dan responsif. Kualitas produk konsisten.' },
  growth:    { rev: 8000000,  exp: 6500000,  trx: 120, tenure: 36,  review: 'Harga dan kualitas seimbang, pengalaman biasa saja. Pelayanan standar, masih bisa ditingkatkan.' },
  struggling:{ rev: 5000000,  exp: 5400000,  trx: 80,  tenure: 18,  review: 'Kadang stok kosong saat jam ramai. Secara umum oke, hanya respon chat kadang lambat.' },
  critical:  { rev: 2000000,  exp: 3000000,  trx: 25,  tenure: 4,   review: 'Respons admin lambat dan informasi kurang jelas. Harga naik tapi layanan tidak membaik. Pesanan sering terlambat.' },
};

// ─── Utilities ───────────────────────────────────────────────
function formatIDR(num) {
  if (Math.abs(num) >= 1_000_000) return 'Rp ' + (num / 1_000_000).toFixed(1) + ' Jt';
  if (Math.abs(num) >= 1_000) return 'Rp ' + (num / 1_000).toFixed(0) + ' Rb';
  return 'Rp ' + Math.round(num);
}

const CLASS_COLORS = {
  Elite: 'var(--elite)',
  Growth: 'var(--growth)',
  Struggling: 'var(--struggling)',
  Critical: 'var(--critical)',
};

const CLASS_GLOW = {
  Elite: 'var(--elite-glow)',
  Growth: 'var(--growth-glow)',
  Struggling: 'var(--struggling-glow)',
  Critical: 'var(--critical-glow)',
};
