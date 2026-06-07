'use strict';

// ─── KAMUS SENTIMEN UHP v2.1 ───────────────────────────────────────────
// Pisahkan kata penguat (Amplifiers) agar lebih dinamis
const AMPLIFIER_WORDS = ['sangat', 'sekali', 'banget', 'super', 'paling', 'luarbiasa', 'terlalu', 'ekstra'];
const NEGATION_WORDS = ['tidak', 'tdk', 'kurang', 'krg', 'bukan', 'jangan', 'gak', 'ga', 'belum'];

// HAPUS kata benda netral (kualitas, pelayanan, pengiriman, admin, produk) dari sini
const POSITIVE_WORDS = [
  // Kualitas & Kondisi
  'bagus', 'baik', 'mantap', 'oke', 'keren', 'prima', 'asli', 'terbaik', 'sempurna',
  'excellent', 'perfect', 'berkualitas', 'jempolan', 'utuh', 'selamat', 'aman',
  'rapi', 'mulus', 'awet', 'kokoh', 'tepat',
  // Layanan & Perasaan
  'ramah', 'cepat', 'senang', 'puas', 'lancar', 'konsisten', 'terjaga',
  'mudah', 'responsif', 'komunikatif', 'bersahabat', 'kooperatif', 'membantu',
  'suka', 'recommended', 'rekomendasi', 'sesuai', 'memuaskan', 'kilat'
];

// Tambahkan kata-kata dari dataset negatif yang sering muncul
const NEGATIVE_WORDS = [
  // Kualitas & Kondisi
  'buruk', 'jelek', 'cacat', 'rusak', 'hancur', 'lecet', 'robek', 'basah', 'tipis',
  'parah', 'terburuk', 'asal', 'asalasalan', 'mahal',
  // Layanan & Perasaan
  'lambat', 'kecewa', 'mengecewakan', 'telat', 'terlambat', 'bermasalah',
  'kosong', 'lama', 'menurun', 'rugi', 'susah', 'ribet', 'gagal', 'batal', 'protes',
  'komplain', 'kapok', 'jutek', 'salah', 'menyesal', 'berbelit', 'membingungkan',
  'abaikan', 'diabaikan', 'kasar', 'jutek'
];

// Diurutkan berdasarkan panjang agar frase yang lebih panjang dieksekusi duluan
const sortByLength = (arr) => arr.sort((a, b) => b.length - a.length);

// ─── SENTIMENT ENGINE LOGIC ───────────────────────────────────────────
function computeSentiment(text) {
  if (!text || typeof text !== 'string' || text.trim() === '') return { score: 0, label: 'Netral', matches: [] };
  
  // Preprocessing: ubah frase tertentu menjadi 1 kata agar mudah diproses
  let processedText = text.toLowerCase()
    .replace(/luar biasa/g, 'luarbiasa')
    .replace(/asal asalan/g, 'asalasalan')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, " ");

  let score = 0;
  let matchedTokens = [];

  const posWords = sortByLength([...POSITIVE_WORDS]);
  const negWords = sortByLength([...NEGATIVE_WORDS]);
  const negations = sortByLength([...NEGATION_WORDS]);
  const amplifiers = sortByLength([...AMPLIFIER_WORDS]);

  // Helper Engine dengan tambahan dukungan akhiran bahasa indonesia (-nya)
  const applyRule = (regex, weight, labelType) => {
    if (regex.test(processedText)) {
      const count = processedText.match(regex).length;
      score += (weight * count);
      for(let i=0; i<count; i++) matchedTokens.push(`${labelType}`);
      // Ganti dengan spasi kosong agar tidak bertabrakan dengan rule lain
      processedText = processedText.replace(regex, ' [MASK] '); 
    }
  };

  // RULE 1: Negasi + Kata Sentimen (Contoh: "tidak bagus", "kurang cepat")
  negations.forEach(neg => {
    posWords.forEach(pos => {
      // (?:nya)? menangkap kata berafiks seperti "bagusnya", "cepatnya"
      applyRule(new RegExp(`\\b${neg}\\s+${pos}(?:nya)?\\b`, 'gi'), -0.45, `NEG_FLIP[${neg} ${pos}]`);
    });
    negWords.forEach(negW => {
      // "tidak buruk" -> Sedikit positif
      applyRule(new RegExp(`\\b${neg}\\s+${negW}(?:nya)?\\b`, 'gi'), 0.20, `NEG_FLIP[${neg} ${negW}]`);
    });
  });

  // RULE 2: Kata Penguat + Kata Sentimen (Contoh: "sangat bagus", "jelek sekali")
  amplifiers.forEach(amp => {
    posWords.forEach(pos => {
      applyRule(new RegExp(`\\b${amp}\\s+${pos}(?:nya)?\\b`, 'gi'), 0.65, `STRONG_POS[${amp} ${pos}]`);
      applyRule(new RegExp(`\\b${pos}(?:nya)?\\s+${amp}\\b`, 'gi'), 0.65, `STRONG_POS[${pos} ${amp}]`);
    });
    negWords.forEach(negW => {
      applyRule(new RegExp(`\\b${amp}\\s+${negW}(?:nya)?\\b`, 'gi'), -0.65, `STRONG_NEG[${amp} ${negW}]`);
      applyRule(new RegExp(`\\b${negW}(?:nya)?\\s+${amp}\\b`, 'gi'), -0.65, `STRONG_NEG[${negW} ${amp}]`);
    });
  });

  // RULE 3: Kata Sentimen Dasar (Yang belum ditangkap oleh Negasi / Penguat)
  posWords.forEach(pos => {
    applyRule(new RegExp(`\\b${pos}(?:nya)?\\b`, 'gi'), 0.25, `POS[${pos}]`);
  });
  negWords.forEach(negW => {
    applyRule(new RegExp(`\\b${negW}(?:nya)?\\b`, 'gi'), -0.25, `NEG[${negW}]`);
  });

  // RULE 4: Penalti khusus untuk kata "kurang" yang berdiri sendiri (seringkali bermakna negatif)
  applyRule(/\bkurang\b/gi, -0.20, `NEG[kurang]`);

  // Normalisasi skor akhir
  const finalScore = Math.max(-1, Math.min(1, score));
  
  return {
    score: Number(finalScore.toFixed(2)),
    label: sentimentLabel(finalScore),
    matches: matchedTokens
  };
}

function sentimentLabel(score) {
  if (score >= 0.5) return 'Sangat Positif';
  if (score >= 0.2) return 'Positif';
  if (score > -0.2 && score < 0.2) return 'Netral'; // Rentang netral diperketat
  if (score <= -0.5) return 'Sangat Negatif';
  return 'Negatif';
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
  else if (burnRate >= 1.0 || npm < 0 || (burnRate >= 0.85 && sentimentScore < 0)) {
    predictedClass = 'Struggling';
    const burnScore = burnRate >= 1.0 ? Math.min(1, (burnRate - 1.0) / 0.15) : Math.max(0, (burnRate - 0.8) / 0.2);
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
