/* =============================================
   UHP v2.0 — Dashboard UI Logic
   Shared between demo.html and dashboard.html
   ============================================= */

'use strict';

// ─── Global State ────────────────────────────────────────────
let allData = [];
let filteredData = [];
let currentPage = 1;
const PAGE_SIZE = 15;
let dataStats = { total: 0, Elite: 0, Growth: 0, Struggling: 0, Critical: 0 };
let uploadedReviews = [];
let currentReviewIndex = 0;

const FI_COLORS = ['#60a5fa', '#a78bfa', '#34d399', '#fb923c', '#f472b6', '#fbbf24'];

// ─── Detect page mode ────────────────────────────────────────
const isDemoPage = window.location.pathname.includes('demo');
const isDashboardPage = window.location.pathname.includes('dashboard');

// ─── UI Updaters ─────────────────────────────────────────────
async function updateSentimentPreview() {
  let texts = [];
  
  // Jika ada review dari file, gunakan semua review untuk menghitung average sentiment
  if (uploadedReviews.length > 0) {
    texts = uploadedReviews;
  } else {
    // Fallback ke textarea jika ada
    const el = document.getElementById('inputReview');
    if (el && el.value.trim() !== '') texts = [el.value];
  }
  
  if (texts.length === 0) return;

  const meter = document.getElementById('sentimentMeter');
  const preview = document.getElementById('sentimentPreview');
  if (!meter || !preview) return;

  preview.textContent = "..."; // Loading state
  
  // Mem-bypass MLEngine.predictSentimentBatch yang memiliki bug pembagian/dilusi skor
  let totalScore = 0;
  texts.forEach(text => {
    totalScore += computeSentiment(text).score;
  });
  
  const score = texts.length > 0 ? (totalScore / texts.length) : 0;

  const pos = ((score + 1) / 2) * 90 + 5;
  meter.style.width = pos + '%';
  preview.textContent = score >= 0 ? '+' + score.toFixed(2) : score.toFixed(2);
  if (score >= 0.2) preview.style.color = 'var(--elite)';
  else if (score <= -0.2) preview.style.color = 'var(--critical)';
  else preview.style.color = 'var(--text-muted)';
}

function handleReviewFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const fileName = file.name;
  const fileExt = fileName.split('.').pop().toLowerCase();
  
  if (fileExt === 'csv') {
    Papa.parse(file, {
      header: true,
      dynamicTyping: false,
      skipEmptyLines: true,
      complete: (results) => {
        processReviewFile(results.data, fileName);
      },
      error: (error) => {
        alert('Error parsing CSV: ' + error.message);
      }
    });
  } else if (fileExt === 'xlsx' || fileExt === 'xls') {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'binary' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet);
        processReviewFile(data, fileName);
      } catch (error) {
        alert('Error parsing XLSX: ' + error.message);
      }
    };
    reader.readAsBinaryString(file);
  } else {
    alert('Format file tidak didukung. Gunakan CSV atau XLSX.');
  }
}

function processReviewFile(data, fileName) {
  // Cari kolom yang berisi review/ulasan
  const reviewColumns = ['Review_Text', 'review', 'Review', 'Ulasan', 'ulasan', 'text', 'Text', 'komentar', 'Komentar', 'feedback', 'Feedback'];
  let reviewColumn = null;
  
  if (data.length > 0) {
    const firstRow = data[0];
    for (const col of reviewColumns) {
      if (col in firstRow) {
        reviewColumn = col;
        break;
      }
    }
  }

  if (!reviewColumn) {
    alert('Tidak ada kolom yang berisi review/ulasan. Gunakan nama kolom: Review_Text, review, Ulasan, text, komentar, atau feedback');
    return;
  }

  // Extract review data
  uploadedReviews = data
    .map(row => row[reviewColumn])
    .filter(review => review && review.toString().trim().length > 0)
    .map(review => review.toString());

  currentReviewIndex = 0;

  // Update UI
  const fileInput = document.getElementById('inputReviewFile');
  const filePreview = document.getElementById('filePreview');
  const fileNameEl = document.getElementById('fileName');
  const reviewCountEl = document.getElementById('reviewCount');
  const reviewPreviewEl = document.getElementById('reviewPreview');
  const fileInputLabel = document.querySelector('.file-input-label span');

  if (fileNameEl) fileNameEl.textContent = fileName;
  if (reviewCountEl) reviewCountEl.textContent = uploadedReviews.length;
  if (reviewPreviewEl) {
    const preview = uploadedReviews[0].substring(0, 100) + (uploadedReviews[0].length > 100 ? '...' : '');
    reviewPreviewEl.textContent = '"' + preview + '"';
  }
  if (filePreview) filePreview.style.display = 'block';
  if (fileInputLabel) fileInputLabel.textContent = '✓ ' + fileName + ' (' + uploadedReviews.length + ' ulasan)';

  updateSentimentPreview();
}

function updateSlider(type) {
  if (type === 'transaction') {
    const el = document.getElementById('transactionVal');
    const slider = document.getElementById('inputTransactions');
    if (el && slider) {
      if (el.tagName === 'INPUT') el.value = slider.value;
      else el.textContent = slider.value;
    }
  } else if (type === 'tenure') {
    const el = document.getElementById('tenureVal');
    const slider = document.getElementById('inputTenure');
    if (el && slider) {
      if (el.tagName === 'INPUT') el.value = slider.value;
      else el.textContent = slider.value;
    }
  } else if (type === 'repeatorder') {
    const el = document.getElementById('repeatOrderVal');
    const slider = document.getElementById('inputRepeatOrderRate');
    if (el && slider) {
      if (el.tagName === 'INPUT') el.value = slider.value;
      else el.textContent = slider.value;
    }
  }
}

function updateSliderFromInput(type, forceClamp) {
  let el, slider, min, max;
  if (type === 'transaction') {
    el = document.getElementById('transactionVal');
    slider = document.getElementById('inputTransactions');
    min = 10;
    max = 300;
  } else if (type === 'tenure') {
    el = document.getElementById('tenureVal');
    slider = document.getElementById('inputTenure');
    min = 1;
    max = 200;
  } else if (type === 'repeatorder') {
    el = document.getElementById('repeatOrderVal');
    slider = document.getElementById('inputRepeatOrderRate');
    min = 0;
    max = 100;
  }

  if (el && slider) {
    let val = parseInt(el.value);
    if (isNaN(val)) {
      if (forceClamp) {
        el.value = slider.value;
      }
      return;
    }

    if (forceClamp) {
      const clampedVal = Math.max(min, Math.min(max, val));
      el.value = clampedVal;
      slider.value = clampedVal;
    } else {
      if (val >= min && val <= max) {
        slider.value = val;
      }
    }
  }
}

function renderFeatureImportance(features, burnRate, npm, sentimentScore, repeatOrder, revenue, transactions, tenure) {
  const container = document.getElementById('featureChart');
  if (!container) return;
  container.innerHTML = '';

  features.forEach(f => {
    let title = '';
    let val = '';
    let color = '';
    let text = '';
    
    // Map feature name to its details and explanation
    if (f.name === 'Burn Rate Ratio') {
      title = '🔥 Rasio Burn Rate (Efisiensi Kas)';
      val = burnRate.toFixed(2);
      const brPercent = Math.round(burnRate * 100);
      
      if (burnRate < 0.70) {
        color = 'var(--elite)';
        text = `Faktor ini berpengaruh besar (<strong>${f.pct}%</strong>) karena kas adalah darah utama UMKM. Pengeluaran operasional Anda sangat efisien karena hanya menyerap <strong>${brPercent}%</strong> dari pemasukan (Burn Rate: <strong>${val}</strong>). Struktur biaya yang prima memberikan cadangan kas melimpah untuk antisipasi risiko atau modal ekspansi.`;
      } else if (burnRate < 0.85) {
        color = 'var(--growth)';
        text = `Faktor ini berpengaruh besar (<strong>${f.pct}%</strong>) karena kas adalah darah utama UMKM. Pengeluaran operasional Anda menyerap <strong>${brPercent}%</strong> dari pemasukan (Burn Rate: <strong>${val}</strong>). Struktur pengeluaran Anda cukup stabil dan aman, namun tetap kendalikan pengeluaran agar margin bisa ditingkatkan.`;
      } else if (burnRate < 1.00) {
        color = 'var(--struggling)';
        text = `Faktor ini berpengaruh besar (<strong>${f.pct}%</strong>) karena kas adalah darah utama UMKM. Biaya operasional menyerap <strong>${brPercent}%</strong> dari pemasukan (Burn Rate: <strong>${val}</strong>). Arus kas Anda dalam <strong>risiko sedang</strong> karena sisa dana darurat bulanan Anda sangat tipis. Anda rentan mengalami kesulitan likuiditas jika terjadi penurunan omzet mendadak.`;
      } else {
        color = 'var(--critical)';
        text = `Faktor ini berpengaruh besar (<strong>${f.pct}%</strong>) karena kas adalah darah utama UMKM. Biaya operasional Anda menyerap <strong>${brPercent}%</strong> dari pemasukan (Burn Rate: <strong>${val}</strong>). Pengeluaran melebihi pendapatan, menyebabkan <strong>kebocoran kas bulanan</strong>. Anda struggling di sini karena setiap bulan modal kerja Anda terkikis untuk menutup biaya operasional.`;
      }
    } 
    else if (f.name === 'Net Profit Margin') {
      title = '💰 Margin Keuntungan Bersih (NPM)';
      val = npm.toFixed(1) + '%';
      
      if (npm >= 15) {
        color = 'var(--elite)';
        text = `Faktor ini berpengaruh <strong>${f.pct}%</strong> terhadap kesehatan bisnis Anda. Margin keuntungan bersih Anda sangat sehat di angka <strong>${val}</strong>. Hal ini membuktikan bahwa strategi penetapan harga produk Anda sangat kuat, HPP terkontrol dengan baik, dan bisnis Anda menghasilkan profitabilitas di atas rata-rata industri.`;
      } else if (npm > 0) {
        color = 'var(--growth)';
        text = `Faktor ini berpengaruh <strong>${f.pct}%</strong> terhadap kesehatan bisnis Anda. Margin keuntungan bersih Anda berada di tingkat sedang sebesar <strong>${val}</strong>. Bisnis Anda stabil dan menghasilkan profit bersih, namun masih ada ruang optimasi HPP atau efisiensi biaya tetap untuk mempertebal keuntungan.`;
      } else if (npm === 0) {
        color = 'var(--struggling)';
        text = `Faktor ini berpengaruh <strong>${f.pct}%</strong> terhadap kesehatan bisnis Anda. Margin keuntungan bersih Anda berada di titik impas (break-even) sebesar <strong>${val}</strong>. Bisnis Anda tidak mengalami kerugian, tetapi belum mencetak keuntungan bersih. Anda perlu melakukan optimasi biaya operasional atau meninjau strategi harga produk untuk mulai mencetak laba.`;
      } else {
        color = 'var(--critical)';
        text = `Faktor ini berpengaruh <strong>${f.pct}%</strong> terhadap kesehatan bisnis Anda. Margin keuntungan bersih Anda <strong>negatif (${val})</strong>. Anda struggling di sini karena bisnis kehilangan uang pada setiap aktivitas penjualan. Hal ini biasanya disebabkan oleh harga jual produk yang terlalu mepet, biaya produksi (HPP) terlalu tinggi, atau pemborosan operasional.`;
      }
    } 
    else if (f.name === 'Sentiment Score') {
      title = '💬 Sentimen Kepuasan Pelanggan';
      val = (sentimentScore >= 0 ? '+' : '') + sentimentScore.toFixed(2);
      
      if (sentimentScore >= 0.20) {
        color = 'var(--elite)';
        text = `Sentimen ulasan pelanggan berkontribusi sebesar <strong>${f.pct}%</strong> pada diagnosis model. Skor sentimen pelanggan Anda sangat positif (<strong>${val}</strong>). Pelanggan Anda merasa sangat puas, menciptakan ulasan positif organik yang menjadi magnet kuat untuk mendatangkan pelanggan baru secara gratis.`;
      } else if (sentimentScore >= -0.15) {
        color = 'var(--growth)';
        text = `Sentimen ulasan pelanggan berkontribusi sebesar <strong>${f.pct}%</strong> pada diagnosis model. Skor sentimen pelanggan Anda dinilai netral/stabil (<strong>${val}</strong>). Layanan Anda dinilai standar dan belum ada keluhan besar, namun Anda harus berinovasi pada pelayanan agar pelanggan tidak mudah terpikat oleh kompetitor.`;
      } else {
        color = 'var(--critical)';
        text = `Sentimen ulasan pelanggan berkontribusi sebesar <strong>${f.pct}%</strong> pada diagnosis model. Skor sentimen Anda <strong>negatif (${val})</strong>. Anda struggling di sini karena didominasi ulasan buruk. Hal ini menjadi lampu merah karena pelayanan buruk atau produk cacat akan merusak reputasi usaha Anda dan menghentikan pembelian ulang.`;
      }
    } 
    else if (f.name === 'Monthly Revenue') {
      title = '📈 Pendapatan Bulanan (Revenue)';
      val = formatIDR(revenue);
      
      if (revenue >= 15000000) {
        color = 'var(--elite)';
        text = `Pendapatan bulanan memegang pengaruh <strong>${f.pct}%</strong>. Omzet bulanan Anda mencapai <strong>${val}</strong>, tergolong sangat prima untuk skala UMKM. Skala usaha yang besar ini memberikan kapasitas yang kuat untuk menutupi beban biaya tetap dan memberikan daya ungkit pertumbuhan.`;
      } else if (revenue >= 5000000) {
        color = 'var(--growth)';
        text = `Pendapatan bulanan memegang pengaruh <strong>${f.pct}%</strong>. Omzet bulanan Anda berada di tingkat menengah sebesar <strong>${val}</strong>. Penjualan Anda stabil untuk menutupi kebutuhan dasar usaha, namun perlu strategi promosi kreatif untuk mendorong omzet ke tingkat yang lebih tinggi.`;
      } else {
        color = 'var(--critical)';
        text = `Pendapatan bulanan memegang pengaruh <strong>${f.pct}%</strong>. Omzet Anda saat ini sebesar <strong>${val}</strong>. Anda struggling di sini karena skala penjualan kotor yang terlalu kecil menyulitkan bisnis Anda untuk menutup beban operasional tetap yang paling minimal sekalipun.`;
      }
    } 
    else if (f.name === 'Transaction Count') {
      title = '🛒 Volume Transaksi Bulanan';
      val = transactions + ' trx';
      
      if (transactions >= 120) {
        color = 'var(--elite)';
        text = `Volume transaksi bulanan berkontribusi <strong>${f.pct}%</strong> pada diagnosis. Saat ini aktivitas transaksi Anda sangat tinggi mencapai <strong>${transactions} transaksi</strong> per bulan. Produk Anda terbukti diminati pasar luas dan memiliki perputaran persediaan (turnover) yang sangat cepat.`;
      } else if (transactions >= 50) {
        color = 'var(--growth)';
        text = `Volume transaksi bulanan berkontribusi <strong>${f.pct}%</strong> pada diagnosis. Jumlah transaksi Anda berada di tingkat menengah yaitu <strong>${transactions} transaksi</strong> per bulan. Pasar Anda cukup aktif, namun Anda perlu melakukan promosi bundling atau program loyalitas untuk mendorong frekuensi belanja pelanggan.`;
      } else {
        color = 'var(--critical)';
        text = `Volume transaksi bulanan berkontribusi <strong>${f.pct}%</strong> pada diagnosis. Jumlah transaksi Anda sangat rendah yaitu hanya <strong>${transactions} transaksi</strong> per bulan. Anda struggling di aspek ini karena kurangnya daya tarik produk atau kurangnya aktivitas promosi untuk menjaring konsumen baru.`;
      }
    } 
    else if (f.name === 'Business Tenure') {
      title = '⏳ Lama Beroperasi (Tenure)';
      val = tenure + ' bln';
      
      const years = (tenure / 12).toFixed(1);
      if (tenure >= 36) {
        color = 'var(--elite)';
        text = `Lama beroperasi memberikan bobot analisis <strong>${f.pct}%</strong>. Usaha Anda telah matang dengan usia <strong>${tenure} bulan</strong> (~<strong>${years} tahun</strong>). Pengalaman operasional yang panjang dan basis loyalitas pelanggan yang telah lama terbentuk menjadi pondasi kokoh dalam persaingan.`;
      } else if (tenure >= 12) {
        color = 'var(--growth)';
        text = `Lama beroperasi memberikan bobot analisis <strong>${f.pct}%</strong>. Usaha Anda telah berjalan <strong>${tenure} bulan</strong>. Anda sudah melewati fase kritis awal tahun pertama dan mulai stabil, namun pastikan untuk terus menjaga kualitas pelayanan agar bisnis terus berkelanjutan.`;
      } else {
        color = 'var(--critical)';
        text = `Lama beroperasi memberikan bobot analisis <strong>${f.pct}%</strong>. Usaha Anda masih tergolong baru berjalan <strong>${tenure} bulan</strong>. Bisnis berumur di bawah satu tahun berada pada fase paling rentan. Anda struggling karena sistem bisnis, branding, dan basis pelanggan setia masih dalam tahap pembentukan awal.`;
      }
    }

    const item = document.createElement('div');
    item.style.marginBottom = '16px';
    item.style.padding = '14px 16px';
    item.style.background = 'rgba(255,255,255,0.02)';
    item.style.border = '1px solid rgba(255,255,255,0.04)';
    item.style.borderRadius = 'var(--radius-md)';
    item.style.transition = 'var(--transition)';

    item.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 12px; font-weight: 700; color: var(--text-secondary);">${title}</span>
        <span style="font-size: 11px; font-weight: 800; color: ${color}; padding: 1.5px 7px; background: ${color}15; border-radius: 4px;">${val}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
        <div class="fi-bar-track" style="flex: 1; height: 6px; background: var(--bg-elevated); border-radius: 3px; overflow: hidden;">
          <div class="fi-bar-fill" style="width: 0%; background: ${color}; height: 100%; border-radius: 3px;" data-width="${f.pct}"></div>
        </div>
        <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); width: 28px; text-align: right;">${f.pct}%</span>
      </div>
      <p style="font-size: 11.5px; color: var(--text-secondary); line-height: 1.5; margin: 0;">${text}</p>
    `;
    container.appendChild(item);
  });
}

function renderInsights(cls, sentimentScore = 0, burnRate = 0, npm = 0, revenue = 0, transactions = 0, tenure = 0, repeatOrder = 0) {
  const iconEl = document.getElementById('insightIconBig');
  const textEl = document.getElementById('insightText');
  
  // 1. Determine general icon
  let icon = '🚀';
  if (cls === 'Critical') icon = '🚨';
  else if (cls === 'Struggling') icon = '⚠️';
  else if (cls === 'Growth') icon = '📈';
  if (iconEl) iconEl.textContent = icon;

  // 2. Build the dynamic narrative insight (WITHOUT NUMBERS)
  let narrative = '';
  
  // Base status description
  if (cls === 'Elite') {
    narrative = `Bisnis Anda berada dalam performa puncak dengan struktur keuangan yang sangat kokoh dan efisien. Seluruh pos pengeluaran terkendali dengan sempurna, menciptakan tingkat profitabilitas yang melimpah.`;
  } else if (cls === 'Growth') {
    narrative = `Bisnis Anda menunjukkan perkembangan yang sehat dan telah berhasil mencatatkan keuntungan bersih yang stabil. Meskipun berada di jalur pertumbuhan yang benar, masih ada beberapa area operasional yang perlu dioptimalkan agar keuntungan dapat dimaksimalkan.`;
  } else if (cls === 'Struggling') {
    narrative = `Kondisi keuangan bisnis Anda saat ini berada di zona rawan dan membutuhkan perhatian serius. Meskipun aktivitas pasar tetap berjalan, tingginya biaya operasional bulanan telah menekan margin laba usaha Anda hingga ke titik kritis.`;
  } else { // Critical
    narrative = `Bisnis Anda berada dalam kondisi darurat keuangan yang sangat serius. Kebocoran kas operasional yang parah digabungkan dengan menurunnya profitabilitas menempatkan usaha Anda dalam risiko tinggi kelangsungan hidup jangka panjang.`;
  }

  // Cash flow / burn rate synthesis
  if (burnRate >= 1.00) {
    narrative += ` Masalah utama yang paling mendesak adalah terjadinya kebocoran kas bulanan, di mana seluruh pengeluaran operasional Anda telah melampaui total pendapatan kotor yang diperoleh bisnis.`;
  } else if (burnRate >= 0.85) {
    narrative += ` Pengeluaran operasional bulanan Anda menyerap hampir seluruh pemasukan, meninggalkan sisa cadangan kas yang sangat tipis dan membuat bisnis Anda rentan terhadap fluktuasi omzet.`;
  } else {
    narrative += ` Pengelolaan kas operasional berjalan sangat efisien, memberikan sisa dana yang aman untuk memperkuat permodalan usaha Anda.`;
  }

  // Margin synthesis
  if (npm < 0) {
    narrative += ` Ditambah lagi, Anda menanggung kerugian pada setiap aktivitas penjualan yang disebabkan oleh margin laba bersih yang bernilai negatif.`;
  } else if (npm < 15) {
    narrative += ` Margin keuntungan bersih yang Anda miliki saat ini masih relatif tipis, sehingga fluktuasi harga bahan baku sedikit saja dapat langsung mengancam kelangsungan profit bisnis.`;
  } else {
    narrative += ` Tingkat profitabilitas margin kotor dan bersih Anda sangat kuat, menunjukkan keunggulan bersaing harga serta kontrol biaya produksi yang berjalan optimal.`;
  }

  // Sentiment / reputation synthesis
  if (sentimentScore < -0.15) {
    narrative += ` Keadaan ini diperparah oleh ulasan pelanggan yang buruk. Sentimen ulasan negatif yang dominan menjadi lampu merah yang menunjukkan adanya kekecewaan mendalam terhadap kualitas produk atau pelayanan.`;
  } else if (sentimentScore < 0.20) {
    narrative += ` Dari sisi reputasi, kepuasan pelanggan terpantau stabil namun biasa saja, menunjukkan pelayanan Anda dinilai standar dan kurang memiliki daya tarik unik untuk membangun loyalitas pelanggan setia.`;
  } else {
    narrative += ` Kekuatan utama bisnis Anda terletak pada kepuasan pelanggan yang luar biasa positif. Pembeli sangat mengapresiasi produk dan pelayanan Anda, yang menjadi aset promosi organik berharga.`;
  }

  // Demand / transaction count synthesis
  if (transactions < 50) {
    narrative += ` Skala penjualan Anda juga terhambat oleh volume transaksi bulanan yang masih sangat rendah, mengindikasikan sempitnya jangkauan pasar atau kurangnya keaktifan promosi.`;
  } else if (transactions < 120) {
    narrative += ` Frekuensi transaksi bulanan berada di tingkat moderat, menunjukkan adanya minat pasar yang stabil namun masih memiliki ruang besar untuk dieksplorasi lebih jauh.`;
  } else {
    narrative += ` Daya serap pasar terhadap produk Anda sangat tinggi, dibuktikan oleh volume transaksi bulanan yang sangat aktif dan cepat berputar.`;
  }

  // Business tenure synthesis
  if (tenure < 12) {
    narrative += ` Sebagai usaha yang relatif masih muda dan baru berjalan beberapa bulan, kerentanan finansial ini wajar terjadi karena sistem operasional dan pasar Anda masih berada dalam tahap perintisan awal.`;
  } else if (tenure < 36) {
    narrative += ` Sebagai usaha yang telah melewati fase awal pendirian, Anda memiliki modal pengalaman operasional yang cukup untuk melakukan stabilisasi usaha.`;
  } else {
    narrative += ` Pengalaman beroperasi yang panjang merupakan fondasi pertahanan dan ketahanan yang matang dalam menghadapi persaingan kompetitor.`;
  }

  // Repeat order synthesis
  if (repeatOrder < 20) {
    narrative += ` Selain itu, tingkat pembelian kembali oleh pelanggan setia terpantau sangat rendah, mengindikasikan kurangnya ikatan emosional pelanggan terhadap brand atau loyalitas produk Anda.`;
  } else if (repeatOrder < 40) {
    narrative += ` Loyalitas pelanggan berada di tingkat rata-rata, yang berarti Anda perlu menyusun program retensi agar mereka terus berbelanja secara berkala.`;
  } else {
    narrative += ` Basis pelanggan Anda menunjukkan tingkat loyalitas yang luar biasa tinggi dengan pembelian berulang yang sangat solid, mengamankan aliran pendapatan pasif yang stabil.`;
  }

  if (textEl) {
    textEl.innerHTML = narrative;
  }

  // 3. Build recommendations (solutions tailored to the problems found in the health factors)
  const actions = [];

  // Problem: Cash bleeding
  if (burnRate >= 1.00) {
    actions.push({
      tag: 'Efisiensi Kas',
      color: 'var(--critical)',
      text: 'Lakukan <strong>audit kas darurat</strong>: Pangkas biaya operasional non-esensial dan tunda pengeluaran modal non-mendesak demi menghentikan kebocoran arus kas bulanan.'
    });
  } else if (burnRate >= 0.85) {
    actions.push({
      tag: 'Kontrol Biaya',
      color: 'var(--struggling)',
      text: 'Perketat anggaran operasional: Review pengeluaran bulanan dan alokasikan kas hanya untuk pos belanja yang berkontribusi langsung pada kelangsungan usaha.'
    });
  }

  // Problem: Negative Margin
  if (npm < 0) {
    actions.push({
      tag: 'Optimasi Laba',
      color: 'var(--critical)',
      text: 'Tinjau kembali <strong>strategi harga & HPP</strong>: Lakukan penyesuaian harga jual secara bertahap atau negosiasikan ulang dengan supplier untuk memotong biaya bahan baku.'
    });
  } else if (npm < 15) {
    actions.push({
      tag: 'Margin Booster',
      color: 'var(--struggling)',
      text: 'Tingkatkan margin laba dengan meminimalisir sisa bahan produksi (waste) atau fokus mempromosikan menu/produk yang memiliki margin keuntungan tertinggi.'
    });
  }

  // Problem: Low satisfaction
  if (sentimentScore < -0.15) {
    actions.push({
      tag: 'Audit Layanan',
      color: 'var(--critical)',
      text: 'Lakukan <strong>respon cepat ulasan buruk</strong>: Hubungi pelanggan kecewa, berikan kompensasi (diskon/produk gratis), dan audit segera titik keluhan utama pelanggan.'
    });
  } else if (sentimentScore < 0.20 && (cls === 'Struggling' || cls === 'Critical')) {
    actions.push({
      tag: 'Servis Premium',
      color: 'var(--struggling)',
      text: 'Berikan standar pelayanan yang lebih responsif dan tawarkan survei kepuasan singkat untuk mengidentifikasi ekspektasi pelanggan Anda.'
    });
  }

  // Problem: Low market activity / transaction count
  if (transactions < 50) {
    actions.push({
      tag: 'Aktivasi Pasar',
      color: 'var(--struggling)',
      text: 'Jalankan <strong>promosi taktis & bundling</strong>: Buat paket hemat produk lambat dengan produk terlaris, atau tawarkan program diskon khusus pada jam-jam sepi pembeli.'
    });
  }

  // Problem: Young business
  if (tenure < 12) {
    actions.push({
      tag: 'SOP & Sistem',
      color: 'var(--struggling)',
      text: 'Fokus pada <strong>standarisasi sederhana</strong>: Buat SOP kerja dasar dan disiplin memisahkan pencatatan keuangan pribadi dengan kas operasional bisnis.'
    });
  }

  // Problem: Low customer loyalty (repeat order)
  if (repeatOrder < 20) {
    actions.push({
      tag: 'Program Loyalitas',
      color: 'var(--struggling)',
      text: 'Buat <strong>kupon belanja berulang</strong> atau program stempel keanggotaan sederhana untuk merangsang pembeli agar mau bertransaksi kembali dalam waktu dekat.'
    });
  }

  // Fallbacks / Growth opportunities if there are few/no critical problems
  if (actions.length < 3) {
    if (cls === 'Elite') {
      actions.push({
        tag: 'Ekspansi Pasar',
        color: 'var(--elite)',
        text: 'Manfaatkan surplus kas untuk memperluas jangkauan pasar, membuka cabang baru, atau meluncurkan lini produk premium.'
      });
      actions.push({
        tag: 'Retensi Pelanggan',
        color: 'var(--elite)',
        text: 'Buat program loyalitas keanggotaan (membership) dengan penawaran eksklusif untuk mendorong frekuensi belanja pelanggan setia.'
      });
      actions.push({
        tag: 'Otomatisasi',
        color: 'var(--elite)',
        text: 'Lakukan investasi pada teknologi kasir (POS), software manajemen inventori, atau otomatisasi digital marketing untuk meningkatkan efisiensi operasional.'
      });
    } else { // Growth / Stable
      actions.push({
        tag: 'Skala Penjualan',
        color: 'var(--growth)',
        text: 'Gunakan pemasaran digital terarah (seperti iklan lokal media sosial) untuk menjangkau pangsa pasar baru di sekitar wilayah usaha Anda.'
      });
      actions.push({
        tag: 'Negosiasi Suplai',
        color: 'var(--growth)',
        text: 'Amankan margin dengan menjalin kontrak pembelian volume besar atau jangka panjang dengan supplier utama demi mendapat harga tetap.'
      });
    }
  }

  // Limit to at most 3 highly relevant actions to keep UI premium and clean
  const limitedActions = actions.slice(0, 3);

  const actEl = document.getElementById('insightActions');
  if (actEl) {
    actEl.innerHTML = limitedActions.map(a => `
      <div class="insight-action-item">
        <span class="tag" style="background:${a.color}20;color:${a.color};">${a.tag}</span>
        <span>${a.text}</span>
      </div>`).join('');
  }

  const card = document.getElementById('insightsCard');
  if (card) {
    card.style.borderColor = `rgba(${cls === 'Elite' ? '0,230,118' : cls === 'Growth' ? '96,165,250' : cls === 'Struggling' ? '251,191,36' : '248,113,113'},0.3)`;
  }
}

function setConfidenceRing(pct, cls) {
  const ring = document.getElementById('confidenceRing');
  const pctEl = document.getElementById('confidencePct');
  if (!ring || !pctEl) return;
  const circumference = 2 * Math.PI * 50;
  ring.style.stroke = CLASS_COLORS[cls];
  pctEl.style.color = CLASS_COLORS[cls];
  const offset = circumference * (1 - pct);
  ring.style.strokeDashoffset = offset;
  pctEl.textContent = Math.round(pct * 100) + '%';
}

// ─── Main Analysis Function ──────────────────────────────────
async function analyzeUMKM() {
  const btn = document.getElementById('analyzeBtn');
  if (btn) btn.classList.add('loading');

  // Memberi waktu UI untuk update loading state
  await new Promise(resolve => setTimeout(resolve, 100));

  const revenue = parseFloat(document.getElementById('inputRevenue').value) || 0;
  const expenses = parseFloat(document.getElementById('inputExpenses').value) || 0;
  const transactions = parseInt(document.getElementById('inputTransactions').value) || 100;
  const tenure = parseInt(document.getElementById('inputTenure').value) || 12;
  const repeatOrderRate = parseInt(document.getElementById('inputRepeatOrderRate').value) || 25;
  
  // Ambil review dari file jika ada, atau dari textarea fallback
  let texts = [];
  if (uploadedReviews.length > 0) {
    texts = uploadedReviews;
  } else {
    const reviewEl = document.getElementById('inputReview');
    if (reviewEl && reviewEl.value.trim() !== '') texts = [reviewEl.value];
  }

  try {
    // 1. Ekstraksi Sentimen menggunakan IndoBERT (via ML Engine)
    let totalScore = 0;
    texts.forEach(text => {
      totalScore += computeSentiment(text).score;
    });
    // Jika tidak ada teks, default 0. Jika ada, hitung rata-rata
    const sentimentScore = texts.length > 0 ? (totalScore / texts.length) : 0;
     
    // 2. Klasifikasi Menggunakan Tabular Model (via ML Engine)
    const { predictedClass, confidence, npm, burnRate, netProfit } = await MLEngine.predictUMKMClass(
      revenue, expenses, transactions, tenure, sentimentScore, repeatOrderRate
    );
    const features = getFeatureImportance(predictedClass, sentimentScore, burnRate);
    const color = CLASS_COLORS[predictedClass];
    const glow = CLASS_GLOW[predictedClass];

    // Show results
    const ws = document.getElementById('welcomeState');
    if (ws) ws.style.display = 'none';
    const resultsEl = document.getElementById('resultsPanel');
    if (resultsEl) {
      resultsEl.style.display = 'flex';
      resultsEl.style.animation = 'none';
      void resultsEl.offsetWidth;
      resultsEl.style.animation = '';
    }

    // Metric Cards
    const npEl = document.getElementById('metricNetProfit');
    if (npEl) { npEl.textContent = formatIDR(netProfit); npEl.style.color = netProfit >= 0 ? 'var(--elite)' : 'var(--critical)'; }
    const npmEl = document.getElementById('metricNPM');
    if (npmEl) npmEl.textContent = `Margin: ${npm.toFixed(2)}%`;
    const trendNP = document.getElementById('trendNetProfit');
    if (trendNP) { trendNP.textContent = netProfit >= 0 ? '+' : '−'; trendNP.style.background = netProfit >= 0 ? 'var(--elite-dim)' : 'var(--critical-dim)'; trendNP.style.color = netProfit >= 0 ? 'var(--elite)' : 'var(--critical)'; }

    const sentEl = document.getElementById('metricSentiment');
    if (sentEl) { sentEl.textContent = (sentimentScore >= 0 ? '+' : '') + sentimentScore.toFixed(3); sentEl.style.color = sentimentScore >= 0.2 ? 'var(--elite)' : sentimentScore <= -0.2 ? 'var(--critical)' : 'var(--text-primary)'; }
    const sLabel = document.getElementById('metricSentimentLabel');
    if (sLabel) sLabel.textContent = sentimentLabel(sentimentScore);

    const gauge = document.getElementById('sentimentGauge');
    if (gauge) {
      gauge.innerHTML = '<div style="height:100%;border-radius:2px;transition:width 0.6s ease,background 0.3s"></div>';
      const gfill = gauge.firstChild;
      const gpos = ((sentimentScore + 1) / 2) * 100;
      const gcol = sentimentScore >= 0.2 ? 'var(--elite)' : sentimentScore <= -0.2 ? 'var(--critical)' : 'var(--struggling)';
      setTimeout(() => { gfill.style.width = gpos + '%'; gfill.style.background = gcol; }, 50);
    }

    const brEl = document.getElementById('metricBurnRate');
    const brColor = burnRate < 0.7 ? 'var(--elite)' : burnRate < 0.85 ? 'var(--growth)' : burnRate < 1.0 ? 'var(--struggling)' : 'var(--critical)';
    if (brEl) { brEl.textContent = burnRate.toFixed(3); brEl.style.color = brColor; }
    const brLabel = document.getElementById('metricBurnLabel');
    if (brLabel) brLabel.textContent = burnRate < 0.7 ? 'Sangat Efisien' : burnRate < 0.85 ? 'Efisien' : burnRate < 1.0 ? 'Risiko Sedang' : 'Risiko Tinggi';
    const brBar = document.getElementById('burnRateBar');
    if (brBar) { brBar.style.background = brColor; setTimeout(() => { brBar.style.width = Math.min(100, (burnRate / 1.5) * 100) + '%'; }, 50); }

    // Health Badge
    const badgeText = document.getElementById('badgeText');
    if (badgeText) { badgeText.textContent = predictedClass.toUpperCase(); badgeText.style.color = color; }
    const badgeCard = document.getElementById('healthBadge');
    if (badgeCard) badgeCard.style.setProperty('--badge-color', color);
    const hCard = document.querySelector('.health-badge-card');
    if (hCard) { hCard.style.setProperty('--badge-color', color); hCard.style.setProperty('--badge-glow', glow); hCard.className = 'health-badge-card animated'; }
    
    // Generate a concise, high-level summary of the health status category
    const badgeDesc = document.getElementById('badgeDesc');
    if (badgeDesc) {
      let narrativeDesc = '';
      
      if (predictedClass === 'Elite') {
        narrativeDesc = `🏆 <strong>Hasil Diagnosis Bisnis (Kategori ELITE):</strong> Bisnis Anda berada dalam kondisi keuangan dan operasional yang sangat prima. Struktur biaya berjalan sangat efisien dengan tingkat profitabilitas yang tinggi dan sentimen kepuasan pelanggan yang luar biasa positif. Seluruh indikator berada di zona hijau.`;
      } else if (predictedClass === 'Growth') {
        narrativeDesc = `📈 <strong>Hasil Diagnosis Bisnis (Kategori GROWTH):</strong> Bisnis Anda berkembang secara sehat dan mencatatkan tren keuntungan operasional yang stabil. Meskipun performa sudah baik, Anda masih memiliki ruang optimasi pada efisiensi biaya tetap serta peningkatan frekuensi belanja pelanggan untuk mencapai level kinerja puncak.`;
      } else if (predictedClass === 'Struggling') {
        narrativeDesc = `⚠️ <strong>Hasil Diagnosis Bisnis (Kategori STRUGGLING):</strong> Aliran kas bisnis Anda saat ini berada di zona rawan dan membutuhkan tindakan penyehatan segera. Pengeluaran operasional bulanan yang terlalu tinggi mulai menekan margin keuntungan bersih dan membatasi cadangan kas usaha Anda.`;
      } else { // Critical
        narrativeDesc = `🚨 <strong>Hasil Diagnosis Bisnis (Kategori CRITICAL):</strong> Perhatian! Bisnis Anda sedang berada dalam krisis keuangan yang sangat serius dan berisiko tinggi. Dibutuhkan restrukturisasi total dan pemotongan beban operasional non-esensial secara darurat untuk menghentikan kebocoran kas bulanan.`;
      }
      badgeDesc.innerHTML = narrativeDesc;
    }

    setConfidenceRing(confidence, predictedClass);
    renderFeatureImportance(features, burnRate, npm, sentimentScore, repeatOrderRate, revenue, transactions, tenure);
    renderInsights(predictedClass, sentimentScore, burnRate, npm, revenue, transactions, tenure, repeatOrderRate);

    // Metric card accents
    document.querySelectorAll('.metric-card').forEach((c, i) => {
      c.style.setProperty('--metric-accent', [color, color, brColor][i] || color);
      c.classList.remove('updated');
      setTimeout(() => c.classList.add('updated'), 50);
    });

  } catch (error) {
    console.error("Error during analysis:", error);
    alert("Terjadi kesalahan saat memproses data ML: " + error.message);
  } finally {
    if (btn) btn.classList.remove('loading');
  }
}

// ─── Currency Helpers ────────────────────────────────────────
function updateCurrencyHelpers() {
  const revInput = document.getElementById('inputRevenue');
  const expInput = document.getElementById('inputExpenses');
  const revHelper = document.getElementById('revenueHelper');
  const expHelper = document.getElementById('expensesHelper');
  
  if (revInput && revHelper) {
    const val = parseFloat(revInput.value) || 0;
    revHelper.textContent = 'Tampilan: ' + formatIDR(val);
  }
  if (expInput && expHelper) {
    const val = parseFloat(expInput.value) || 0;
    expHelper.textContent = 'Tampilan: ' + formatIDR(val);
  }
}

// ─── Quick Fill Presets ──────────────────────────────────────
function quickFill(type) {
  const p = PRESETS[type];
  const el = (id) => document.getElementById(id);
  if (el('inputRevenue')) el('inputRevenue').value = p.rev;
  if (el('inputExpenses')) el('inputExpenses').value = p.exp;
  if (el('inputTransactions')) el('inputTransactions').value = p.trx;
  if (el('inputTenure')) el('inputTenure').value = p.tenure;
  if (el('inputRepeatOrderRate')) el('inputRepeatOrderRate').value = p.repeatorder;
  
  // Set review sebagai uploaded review untuk konsistensi dengan file input
  uploadedReviews = [p.review];
  currentReviewIndex = 0;
  
  // Update file preview UI
  const filePreview = document.getElementById('filePreview');
  const fileInputLabel = document.querySelector('.file-input-label span');
  if (filePreview) filePreview.style.display = 'none';
  if (fileInputLabel) fileInputLabel.textContent = 'Pilih file CSV atau XLSX (atau drag & drop)';
  
  updateSlider('transaction');
  updateSlider('tenure');
  updateSlider('repeatorder');
  updateSentimentPreview();
  updateCurrencyHelpers();
}

// ─── Tab Switching ───────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const fac = document.getElementById('floatingAction');

  if (tab === 'predict') {
    document.getElementById('tabPredict').classList.add('active');
    document.getElementById('navPredict').classList.add('active');
    if (fac) fac.classList.remove('hidden');
  } else if (tab === 'data') {
    document.getElementById('tabData').classList.add('active');
    document.getElementById('navData').classList.add('active');
    if (fac) fac.classList.add('hidden');
    if (allData.length > 0) renderTable();
  } else if (tab === 'mybiz') {
    const el = document.getElementById('tabMyBiz');
    if (el) { el.classList.add('active'); }
    const navEl = document.getElementById('navMyBiz');
    if (navEl) navEl.classList.add('active');
    if (fac) fac.classList.add('hidden');
    renderMyBusiness();
  } else if (tab === 'chat') {
    document.getElementById('tabChat').classList.add('active');
    const navEl = document.getElementById('navChat');
    if (navEl) navEl.classList.add('active');
    if (fac) fac.classList.add('hidden');
    // Initialize chatbot if not already done
    const container = document.getElementById('chatContainer');
    if (container && !container.hasChildNodes()) {
      renderChatContainer('chatContainer', isDemoPage);
    }
  }
}

// ─── Data Explorer (uses embedded data) ──────────────────────
function loadData() {
  allData = [...UHP_SAMPLE_DATA];
  filteredData = [...allData];
  dataStats = { ...UHP_DATA_STATS };

  updateDataStats();
  renderTable();
}

function updateDataStats() {
  const t = dataStats.total || 1;

  // Explorer stats
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('expElite', dataStats.Elite);
  setEl('expGrowth', dataStats.Growth);
  setEl('expStruggling', dataStats.Struggling);
  setEl('expCritical', dataStats.Critical);

  // Welcome stats
  setEl('wsTotal', dataStats.total);
  setEl('wsElite', dataStats.Elite);
  setEl('wsGrowth', dataStats.Growth);
  setEl('wsStruggling', dataStats.Struggling);
  setEl('wsCritical', dataStats.Critical);

  // Bars
  const setBar = (id, cls) => {
    const el = document.getElementById(id);
    if (el) el.style.width = ((dataStats[cls] / t) * 100).toFixed(1) + '%';
  };
  setBar('expEliteBar', 'Elite');
  setBar('expGrowthBar', 'Growth');
  setBar('expStrugglingBar', 'Struggling');
  setBar('expCriticalBar', 'Critical');
}

function filterData() {
  const query = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const classFilter = document.getElementById('classFilter')?.value || '';

  filteredData = allData.filter(row => {
    const matchClass = !classFilter || row.Class === classFilter;
    const matchText = !query || (
      (row.Review_Text || '').toLowerCase().includes(query) ||
      (row.Class || '').toLowerCase().includes(query) ||
      String(row.ID || '').includes(query)
    );
    return matchClass && matchText;
  });

  currentPage = 1;
  const fc = document.getElementById('filterCount');
  if (fc) fc.textContent = `${filteredData.length} hasil`;
  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('tableBody');
  if (!tbody) return;
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageData = filteredData.slice(start, start + PAGE_SIZE);
  const total = filteredData.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (pageData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="table-loading">Tidak ada data ditemukan.</td></tr>';
  } else {
    tbody.innerHTML = pageData.map(row => `
      <tr>
        <td style="color:var(--text-muted)">${row.ID}</td>
        <td>${formatIDR(row.Monthly_Revenue)}</td>
        <td style="color:${(row['Net_Profit_Margin (%)'] || 0) >= 0 ? 'var(--elite)' : 'var(--critical)'}">
          ${Number(row['Net_Profit_Margin (%)']).toFixed(1)}%
        </td>
        <td style="color:${(row.Burn_Rate_Ratio || 1) < 1 ? 'var(--growth)' : 'var(--critical)'}">
          ${Number(row.Burn_Rate_Ratio).toFixed(3)}
        </td>
        <td>${row.Transaction_Count}</td>
        <td>${Number(row.Avg_Historical_Rating).toFixed(2)}</td>
        <td style="color:${(row.Sentiment_Score || 0) >= 0 ? 'var(--elite)' : 'var(--critical)'}">
          ${(row.Sentiment_Score >= 0 ? '+' : '') + Number(row.Sentiment_Score).toFixed(2)}
        </td>
        <td><span class="class-badge class-${row.Class.toLowerCase()}">${row.Class}</span></td>
        <td class="review-cell" title="${(row.Review_Text || '').replace(/"/g,'&quot;')}">${row.Review_Text || '—'}</td>
      </tr>`).join('');
  }

  const pi = document.getElementById('pageInfo');
  if (pi) pi.textContent = `Hal. ${currentPage} / ${totalPages || 1} (${total} data)`;
  const prev = document.getElementById('prevBtn');
  const next = document.getElementById('nextBtn');
  if (prev) prev.disabled = currentPage <= 1;
  if (next) next.disabled = currentPage >= totalPages;
}

function changePage(dir) {
  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);
  currentPage = Math.max(1, Math.min(totalPages, currentPage + dir));
  renderTable();
  const tw = document.querySelector('.table-wrapper');
  if (tw) tw.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── "Bisnis Saya" Tab ──────────────────────────────────────
function renderMyBusiness() {
  const container = document.getElementById('myBizContainer');
  if (!container) return;

  const session = getSession();
  if (!session) {
    container.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-muted);">Login untuk melihat data bisnis Anda.</div>';
    return;
  }

  const umkm = UHP_UMKM_PROFILES[session.umkmId];
  if (!umkm) {
    container.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-muted);">Data bisnis tidak ditemukan.</div>';
    return;
  }

  const latest = umkm.history[umkm.history.length - 1];
  const netProfit = latest.revenue - latest.expenses;
  const npm = ((netProfit / latest.revenue) * 100).toFixed(1);
  const burnRate = (latest.expenses / latest.revenue).toFixed(3);
  const classColor = CLASS_COLORS[umkm.currentClass] || 'var(--accent-brand)';

  // Revenue chart bars (normalized)
  const maxRev = Math.max(...umkm.history.map(h => h.revenue));
  const historyBars = umkm.history.map(h => {
    const height = (h.revenue / maxRev * 120) + 8;
    const barColor = CLASS_COLORS[h.class] || 'var(--accent-brand)';
    return `
      <div class="history-bar-group">
        <div class="history-bar-value">${formatIDR(h.revenue)}</div>
        <div class="history-bar" style="height:${height}px;background:${barColor};"></div>
        <div class="history-bar-label">${h.month.split(' ')[0]}</div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="mybiz-profile" style="--badge-color:${classColor}">
      <div class="mybiz-header">
        <div class="mybiz-avatar">${session.avatar}</div>
        <div class="mybiz-info">
          <h2>${umkm.name}</h2>
          <div class="mybiz-meta">
            <span>📍 ${umkm.location}</span>
            <span>🏷️ ${umkm.sector}</span>
            <span>📅 ${umkm.tenure} bulan</span>
          </div>
        </div>
      </div>

      <div class="mybiz-status-row">
        <div class="mybiz-stat">
          <div class="mybiz-stat-label">Status Terkini</div>
          <div class="mybiz-stat-value" style="color:${classColor}">${umkm.currentClass.toUpperCase()}</div>
        </div>
        <div class="mybiz-stat">
          <div class="mybiz-stat-label">Revenue Terakhir</div>
          <div class="mybiz-stat-value">${formatIDR(latest.revenue)}</div>
        </div>
        <div class="mybiz-stat">
          <div class="mybiz-stat-label">Net Profit Margin</div>
          <div class="mybiz-stat-value" style="color:${parseFloat(npm) >= 0 ? 'var(--elite)' : 'var(--critical)'}">${npm}%</div>
        </div>
        <div class="mybiz-stat">
          <div class="mybiz-stat-label">Burn Rate</div>
          <div class="mybiz-stat-value" style="color:${parseFloat(burnRate) < 1 ? 'var(--growth)' : 'var(--critical)'}">${burnRate}</div>
        </div>
      </div>
    </div>

    <div class="mybiz-history">
      <h3>📈 Tren Revenue Bulanan</h3>
      <div class="history-chart">${historyBars}</div>
    </div>

    <div class="mybiz-review">
      <h3>💬 Ulasan Terakhir</h3>
      <div class="mybiz-review-text">"${umkm.recentReview}"</div>
    </div>
  `;
}

// ─── Init on Page Load ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // File input initialization
  const fileWrapper = document.querySelector('.file-input-wrapper');
  const fileInput = document.getElementById('inputReviewFile');
  
  if (fileWrapper && fileInput) {
    // Click to upload
    fileWrapper.addEventListener('click', () => fileInput.click());
    
    // Drag and drop
    fileWrapper.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileWrapper.classList.add('dragover');
    });
    
    fileWrapper.addEventListener('dragleave', () => {
      fileWrapper.classList.remove('dragover');
    });
    
    fileWrapper.addEventListener('drop', (e) => {
      e.preventDefault();
      fileWrapper.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        fileInput.files = files;
        handleReviewFileUpload({ target: { files: files } });
      }
    });
  }
  
  updateSlider('transaction');
  updateSlider('tenure');
  updateSlider('repeatorder');

  // Input event listeners for currency inputs to update formatted labels in real-time
  const revInput = document.getElementById('inputRevenue');
  const expInput = document.getElementById('inputExpenses');
  if (revInput) {
    revInput.addEventListener('input', updateCurrencyHelpers);
  }
  if (expInput) {
    expInput.addEventListener('input', updateCurrencyHelpers);
  }
  updateCurrencyHelpers();

  // Load embedded data
  loadData();

  // Set user info in header (dashboard only)
  if (isDashboardPage) {
    const session = getSession();
    if (session) {
      const avatarEl = document.getElementById('headerAvatar');
      const nameEl = document.getElementById('headerUsername');
      if (avatarEl) avatarEl.textContent = session.avatar;
      if (nameEl) nameEl.textContent = session.name;
    }
  }
});
