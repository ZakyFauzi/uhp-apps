'use strict';
// Diurutkan berdasarkan panjang kata (Longest to Shortest) 
// untuk mencegah overlapping (misal: "pengiriman cepat" diproses sebelum "cepat")
const sortByLength = (arr) => arr.sort((a, b) => b.length - a.length);

const STRONG_POSITIVE = sortByLength(['sangat bagus','sangat puas','luar biasa','perfect','excellent','sempurna','terbaik']);
const STRONG_NEGATIVE = sortByLength(['sangat buruk','sangat kecewa','sangat lambat','sangat bermasalah','terburuk','parah']);
const POSITIVE_WORDS = sortByLength([
  'lancar','bagus','baik','ramah','cepat','tepat','senang','puas',
  'konsisten','terjaga','mudah','responsif','komunikatif','repeat order','selalu',
  'mantap','oke','cocok','suka','mau lagi','recommended','rekomendasi',
  'kualitas','sesuai','memuaskan','great','good','fast','nice',
  'pengiriman cepat','admin komunikatif','proses checkout tidak ribet','mudah dipakai',
  'pemesanan mudah','pelayanan cepat','pesanan selalu tepat','seimbang',
  'gercep','mantul','cuan','kece','top','jos','joss','gokil'
]);
const NEGATIVE_WORDS = sortByLength([
  'lambat','buruk','jelek','kecewa','kurang','telat','terlambat','bermasalah',
  'naik harga','mahal','sering kosong','stok kosong','lama','mengecewakan',
  'menurun','rugi','susah','tidak responsif','tidak ada','ribet','gagal',
  'batal','tidak sesuai','protes','banyak masalah','kualitas buruk',
  'tidak konsisten','respons lambat','keterlambatan','komplain','tidak ramah',
  'harga naik','layanan tidak membaik','kosong','proses bermasalah',
  'tidak oke','kurang memuaskan','tidak tepat','sering terlambat'
]);

// Kata-kata yang membalikkan makna (Negation)
const NEGATION_WORDS = ['tidak', 'tdk', 'kurang', 'krg', 'bukan', 'jangan', 'gak', 'ga', 'belum'];

// ─── Sentiment Engine 
function computeSentiment(text) {
  if (!text || typeof text !== 'string' || text.trim() === '') return 0;
  
  // Menghapus tanda baca berlebih, ubah ke lowercase
  let processedText = text.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, " ");
  let score = 0;
  let matchedTokens = []; // Untuk kebutuhan debugging

  // Helper untuk mencari dan mengganti kata agar tidak dihitung ganda (Masking)
  const matchAndMask = (wordList, weight, type) => {
    wordList.forEach(word => {
      // Menggunakan \b (word boundary) agar "lama" tidak match di "selama"
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      if (regex.test(processedText)) {
        // Hitung berapa kali kata tersebut muncul
        const matchCount = processedText.match(regex).length;
        score += (weight * matchCount);
        for(let i=0; i<matchCount; i++) matchedTokens.push(`${type}[${word}]`);
        
        // Ganti kata yang sudah dihitung dengan string kosong/placeholder
        processedText = processedText.replace(regex, ' [MATCHED] ');
      }
    });
  };

  // Handle Negasi sebelum mencari kata positif/negatif murni
  // Contoh: "tidak bagus", "kurang ramah"
  NEGATION_WORDS.forEach(neg => {
    POSITIVE_WORDS.forEach(pos => {
      const negRegex = new RegExp(`\\b${neg}\\s+${pos}\\b`, 'gi');
      if (negRegex.test(processedText)) {
        const count = processedText.match(negRegex).length;
        score -= (0.25 * count); // Dibalik menjadi negatif
        for(let i=0; i<count; i++) matchedTokens.push(`NEG_FLIP[${neg} ${pos}]`);
        processedText = processedText.replace(negRegex, ' [MATCHED_NEG] ');
      }
    });
  });

  // Handle Negasi untuk Kata Negatif (Negated Negative -> Positive)
  // Contoh: "tidak lambat", "ga ribet"
  NEGATION_WORDS.forEach(neg => {
    NEGATIVE_WORDS.forEach(negWord => {
      const negRegex = new RegExp(`\\b${neg}\\s+${negWord}\\b`, 'gi');
      if (negRegex.test(processedText)) {
        const count = processedText.match(negRegex).length;
        score += (0.25 * count); // Dibalik menjadi positif
        for(let i=0; i<count; i++) matchedTokens.push(`NEG_FLIP[${neg} ${negWord}]`);
        processedText = processedText.replace(negRegex, ' [MATCHED_NEG_NEG] ');
      }
    });
  });

  // Proses ekstraksi berurutan (dari yang berbobot/terpanjang ke terpendek)
  matchAndMask(STRONG_POSITIVE, 0.65, 'SP');
  matchAndMask(STRONG_NEGATIVE, -0.65, 'SN');
  matchAndMask(POSITIVE_WORDS, 0.25, 'P');
  matchAndMask(NEGATIVE_WORDS, -0.25, 'N');

  // Normalisasi skor akhir (maksimal 1.0, minimal -1.0)
  const finalScore = Math.max(-1, Math.min(1, score));
  
  // Return object
  return {
    score: Number(finalScore.toFixed(2)), // Pembulatan 2 desimal
    label: sentimentLabel(finalScore),
    matches: matchedTokens // Untuk reporting testing
  };
}

function sentimentLabel(score) {
  if (score >= 0.5) return 'Sangat Positif';
  if (score >= 0.2) return 'Positif';
  if (score > -0.2 && score < 0.2) return 'Netral';
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
