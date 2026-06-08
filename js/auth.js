/* =============================================
   UHP v3.0 — Supabase Authentication System
   Integrates Supabase Auth and Syncs Sessions
   ============================================= */

'use strict';

const AUTH_SESSION_KEY = 'uhp_session';

const supabaseUrl = 'https://cgcvpcqxxmhcoxshldwa.supabase.co';
const supabaseKey = 'sb_publishable_ktImoxqyVD1W1uMa9rs64A_X9GRzmLb';

// Save the SDK reference to avoid global let variable declaration conflict
const _supabaseSDK = window.supabase;
var supabase = null;

// Initialize Supabase client
if (_supabaseSDK) {
  supabase = _supabaseSDK.createClient(supabaseUrl, supabaseKey);
} else {
  console.warn('[UHP Auth] Supabase Client SDK not found. Include CDN in HTML.');
}

// Translate Supabase error messages to Indonesian
function translateAuthError(msg) {
  if (msg.includes('User already registered') || msg.includes('already exists')) {
    return 'Email sudah terdaftar. Gunakan email lain atau login.';
  }
  if (msg.includes('Invalid login credentials') || msg.includes('invalid claim')) {
    return 'Email atau password salah. Cek kembali.';
  }
  if (msg.includes('Email not confirmed') || msg.includes('email_not_confirmed') || msg.includes('not confirmed')) {
    return 'Email belum dikonfirmasi. Silakan periksa inbox email Anda.';
  }
  if (msg.includes('Password should be')) {
    return 'Password terlalu pendek. Minimal harus 6 karakter.';
  }
  if (msg.includes('over_email_send_rate_limit') || msg.includes('rate limit')) {
    return 'Terlalu banyak permintaan. Tunggu beberapa menit dan coba lagi.';
  }
  return msg;
}

// ─── Login ───────────────────────────────────────────────────
async function uhpLogin(email, password) {
  if (!email || !password) {
    return { success: false, error: '❌ Email dan password harus diisi.' };
  }
  if (!supabase) {
    return { success: false, error: '❌ Supabase SDK gagal dimuat. Coba muat ulang halaman.' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password
    });

    if (error) {
      return { success: false, error: '❌ ' + translateAuthError(error.message) };
    }

    const user = data.user;

    // Fetch profile details
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Fetch UMKM profile details
    const { data: umkm } = await supabase
      .from('umkm_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Fetch history
    let history = [];
    if (umkm) {
      const { data: hist } = await supabase
        .from('umkm_history')
        .select('*')
        .eq('umkm_id', umkm.id);
      if (hist) history = hist;
    }

    // Save session in localStorage
    const session = {
      userId: user.id,
      name: profile ? profile.name : (user.user_metadata?.name || 'User UHP'),
      email: user.email,
      avatar: profile ? profile.avatar : 'U',
      umkmId: umkm ? umkm.id : null,
      umkmName: umkm ? umkm.name : 'Bisnis Saya',
      sector: umkm ? umkm.sector : 'Lainnya',
      location: umkm ? umkm.location : 'Indonesia',
      tenure: umkm ? umkm.tenure : 1,
      currentClass: umkm ? umkm.current_class : 'Growth',
      history: history,
      loginAt: Date.now()
    };

    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    return { success: true, session };

  } catch (err) {
    console.error('[UHP Auth] Login exception:', err);
    return { success: false, error: '❌ Terjadi kesalahan jaringan saat mencoba masuk.' };
  }
}

// Helper to generate 17 months of trend history data
function generateDemoHistory(umkmId, sector) {
  const history = [];
  const months = [
    'Jan 2025', 'Feb 2025', 'Mar 2025', 'Apr 2025', 'Mei 2025', 'Jun 2025',
    'Jul 2025', 'Agu 2025', 'Sep 2025', 'Okt 2025', 'Nov 2025', 'Des 2025',
    'Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'Mei 2026'
  ];
  
  let baseRev = 10000000;
  let baseExp = 6500000;
  
  if (sector === 'Kuliner') { baseRev = 15000000; baseExp = 10000000; }
  else if (sector === 'Teknologi') { baseRev = 22000000; baseExp = 14000000; }
  else if (sector === 'Kecantikan') { baseRev = 18000000; baseExp = 11500000; }
  else if (sector === 'Kerajinan Tangan') { baseRev = 8000000; baseExp = 5000000; }
  else if (sector === 'Fashion') { baseRev = 12000000; baseExp = 8000000; }

  for (let i = 0; i < months.length; i++) {
    // Generate an upward trend with a dip in the middle
    const monthTrend = 1 + (i * 0.04) + (Math.sin(i * 0.8) * 0.1) + (Math.random() * 0.08 - 0.04);
    const revenue = Math.round(baseRev * monthTrend);
    const expenses = Math.round(baseExp * (monthTrend * 0.92));
    const transactions = Math.round(80 + (i * 4) + (Math.sin(i) * 10) + (Math.random() * 10 - 5));
    const sentiment = parseFloat((0.4 + (Math.random() * 0.4) + (monthTrend * 0.05)).toFixed(2));
    
    let currentClass = 'Growth';
    const npm = (revenue - expenses) / revenue;
    if (npm > 0.35) currentClass = 'Elite';
    else if (npm < 0.15) currentClass = 'Struggling';
    
    history.push({
      umkm_id: umkmId,
      month: months[i],
      revenue,
      expenses,
      transactions,
      sentiment,
      class: currentClass
    });
  }
  return history;
}

// Helper to generate 20 recent transactions with sector-specific data
function generateDemoTransactions(umkmId, sector) {
  const txs = [];
  const names = ['Rudi Santoso', 'Siti Aminah', 'Budi Prasetyo', 'Dewi Rahayu', 'Joko Widodo',
    'Ani Puspita', 'Eko Wahyono', 'Sari Indrawati', 'Giri Haryanto', 'Yanto Susilo',
    'Rina Marlina', 'Tono Subagyo', 'Lina Kusuma', 'Hadi Purnomo', 'Maya Saputri',
    'Dian Permata', 'Bimo Satrio', 'Indah Lestari', 'Agus Wibowo', 'Soni Darmawan'];

  const sectorData = {
    'Kuliner': {
      products: ['Nasi Goreng Spesial','Ayam Bakar Madu','Es Teh Manis','Mie Ayam Jumbo','Sate 10 Tusuk','Paket Nasi + Ayam','Jus Alpukat','Gado-gado Komplit','Bakso Kuah Sapi','Pecel Lele'],
      prices: [25000,35000,8000,20000,30000,45000,15000,22000,18000,28000],
      posReviews: ['Makanan selalu enak dan porsi besar. Pelayanan cepat dan ramah, harga bersahabat.','Suka sekali dengan ayam bakar dan sambal dadaknya, porsinya juga pas kenyang.','Rasa konsisten dari dulu gak berubah. Sambalnya mantap! Pasti balik lagi.','Tempat makan favorit keluarga! Bersih dan pelayanannya sigap sekali.','Walaupun ramai, antrean teratur dan makanan disajikan hangat. Sangat direkomendasikan!'],
      negReviews: ['Porsinya agak kurang untuk harganya, tapi rasanya masih enak.','Agak lama nunggu pesanan waktu ramai, tapi worth it.','Sambal kurang pedas untuk selera saya, tapi overall masih oke.']
    },
    'Teknologi': {
      products: ['Servis Laptop','Install Software','Repair Handphone','Setup Jaringan','Konsultasi IT','Cetak Dokumen','Data Recovery','Upgrade RAM','Antivirus Setup','CCTV Instalasi'],
      prices: [150000,75000,200000,300000,100000,5000,250000,120000,50000,500000],
      posReviews: ['Pelayanan profesional dan cepat. Laptop saya langsung bisa dipakai lagi tanpa masalah.','Teknisinya ramah dan menjelaskan masalah dengan jelas. Harga juga transparan.','Sangat memuaskan! Data recovery berhasil 100%, terima kasih banyak.','Servis handphone beres dalam 2 jam. Recommended banget untuk masalah teknis.','Tim yang kompeten dan jujur. Tidak memberikan biaya tambahan yang tidak perlu.'],
      negReviews: ['Sedikit lama estimasi selesainya, tapi hasilnya bagus.','Harga agak mahal tapi sebanding dengan kualitas layanannya.','Antrian cukup panjang, sebaiknya reservasi dulu sebelum datang.']
    },
    'Kecantikan': {
      products: ['Facial Treatment','Manikur Pedikur','Creambath Rambut','Potong Rambut','Hair Coloring','Eyebrow Threading','Body Scrub','Lulur Tradisional','Make Up Natural','Perawatan Kulit'],
      prices: [120000,85000,100000,45000,200000,35000,150000,175000,250000,130000],
      posReviews: ['Perawatan wajahnya luar biasa! Kulit langsung terasa lebih lembut dan cerah.','Mbaknya sangat ahli dan ramah. Hasilnya memuaskan, pasti balik lagi!','Creambath terbaik! Rambut jadi lebih sehat dan wangi setelah perawatan di sini.','Tempatnya nyaman dan bersih. Cocok untuk relaksasi sekaligus perawatan.','Hasil make up natural tapi tetap glowing. Terima kasih sudah bikin percaya diri!'],
      negReviews: ['Antrean lumayan panjang di weekend, tapi hasilnya sepadan.','Harga sedikit lebih mahal dari tempat lain, tapi kualitas premium.','Alat-alatnya sudah bagus, tinggal tambah beberapa koleksi warna.']
    },
    'Fashion': {
      products: ['Kemeja Batik','Dress Casual','Celana Chino','Jilbab Instant','Kaos Polos','Jaket Hoodie','Rok Midi','Tas Tote Bag','Sepatu Sneakers','Aksesoris Set'],
      prices: [150000,200000,175000,85000,65000,250000,130000,120000,300000,95000],
      posReviews: ['Kualitas bahan sangat bagus dan jahitan rapi. Ukurannya pun pas di badan.','Model pakaiannya trendy dan harganya worth it. Sudah belanja berkali-kali di sini.','Batiknya cantik sekali! Motifnya unik dan tidak pasaran. Sangat puas.','Pelayanan toko ramah dan membantu memilih ukuran yang tepat. Recommended!','Pengiriman cepat dan packaging rapi. Produk sesuai foto, tidak mengecewakan.'],
      negReviews: ['Stok warna favorit saya sering habis, harap ditambah variannya.','Sizing agak kecil dari perkiraan, tapi bisa dikembalikan dengan mudah.','Pengiriman kadang agak lama, tapi produknya memang berkualitas.']
    },
    'Kerajinan': {
      products: ['Tas Anyaman','Lukisan Kanvas','Hiasan Dinding','Gelang Manik','Tembikar Hias','Bingkai Foto','Lilin Aromaterapi','Gantungan Kunci','Boneka Rajut','Kotak Perhiasan'],
      prices: [95000,350000,200000,45000,180000,75000,55000,25000,120000,160000],
      posReviews: ['Kerajinannya sangat detail dan berkualitas tinggi. Cocok dijadikan hadiah istimewa.','Tas anyamannya kuat dan unik. Banyak yang tanya beli di mana. Love it!','Lukisannya indah sekali, persis seperti yang dipesan. Pengrajinnya sangat berbakat.','Hiasan dindingnya jadi centerpiece rumah saya. Banyak tamu yang memuji.','Produk handmade yang benar-benar terasa nilai seninya. Harga sangat reasonable.'],
      negReviews: ['Proses pembuatan memang agak lama karena handmade, tapi hasilnya bagus.','Warna sedikit berbeda dari foto, tapi masih cantik dan sesuai ekspektasi.','Packaging perlu ditingkatkan agar produk lebih aman saat dikirim.']
    },
    'Jasa': {
      products: ['Konsultasi Bisnis','Desain Logo','Pembuatan Website','Foto Produk','Akuntansi Bulanan','Training SDM','Audit Laporan','Digital Marketing','Penerjemahan','Pengelolaan Media Sosial'],
      prices: [200000,500000,2000000,300000,750000,1000000,1500000,800000,150000,600000],
      posReviews: ['Konsultasinya sangat insight dan membantu bisnis saya berkembang pesat.','Desain logonya profesional dan sesuai visi brand saya. Terima kasih!','Website yang dibuat sangat rapi dan responsif. Tim bekerja dengan deadline ketat.','Foto produk hasilnya elegan banget. Sales langsung naik setelah pakai foto ini.','Laporan akuntansinya akurat dan tepat waktu. Sangat membantu untuk pengambilan keputusan.'],
      negReviews: ['Revisi desain agak memakan waktu, tapi hasilnya memang memuaskan.','Komunikasi terkadang sedikit lambat, tapi kualitas kerja tidak mengecewakan.','Harga cukup tinggi tapi sebanding dengan profesionalisme tim.']
    }
  };

  const data = sectorData[sector] || sectorData['Kuliner'];
  const now = Date.now();

  for (let i = 0; i < 20; i++) {
    const isPos = Math.random() > 0.25;
    const qty = Math.floor(Math.random() * 3) + 1;
    const prodIdx = i % data.products.length;
    const price = data.prices[prodIdx];
    const sentiment = isPos
      ? parseFloat((0.3 + Math.random() * 0.65).toFixed(2))
      : parseFloat((-0.15 - Math.random() * 0.35).toFixed(2));
    const reviewPool = isPos ? data.posReviews : data.negReviews;
    const reviewText = reviewPool[i % reviewPool.length];

    txs.push({
      umkm_id: umkmId,
      order_number: `ORD-${String(now).slice(-6)}-${String(i + 1).padStart(2, '0')}`,
      date: new Date(now - i * 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      customer_name: names[i % names.length],
      item_name: data.products[prodIdx],
      quantity: qty,
      price: price,
      amount: qty * price,
      review_text: reviewText,
      sentiment_score: sentiment
    });
  }
  return txs;
}


// ─── Registration ────────────────────────────────────────────
async function uhpRegister(email, password, name, umkmName, sector) {
  if (!email || !password || !name || !umkmName || !sector) {
    return { success: false, error: '❌ Semua data registrasi wajib diisi.' };
  }
  if (!supabase) {
    return { success: false, error: '❌ Supabase SDK gagal dimuat. Coba muat ulang.' };
  }

  if (password.length < 6) {
    return { success: false, error: '❌ Password minimal terdiri dari 6 karakter.' };
  }

  try {
    const cleanEmail = email.trim().toLowerCase();

    // ── Step 1: Sign up ────────────────────────────────────────
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password: password,
      options: { data: { name: name.trim() } }
    });

    if (signUpError) {
      return { success: false, error: '❌ ' + translateAuthError(signUpError.message) };
    }

    // data.user exists even when email confirmation is required
    const user = signUpData.user;
    if (!user || !user.id) {
      return { success: false, error: '❌ Pendaftaran gagal. Email mungkin sudah terdaftar.' };
    }

    // ── Step 2: Sign in to get an active session for DB inserts ─
    // This works even if email confirmation is OFF (default for new projects).
    // If email confirmation IS on, signIn will fail — we handle that too.
    let activeUserId = user.id;
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: password
    });

    const sessionActive = !signInError && signInData?.session;
    if (!sessionActive) {
      // Email confirmation is enabled. The user row exists in auth.users
      // with the correct ID, but we can't insert into RLS-protected tables
      // without a session. We'll store minimal session and redirect.
      console.warn('[UHP Auth] Email confirmation may be required. Session not immediately available.');
      const minimalSession = {
        userId: activeUserId,
        name: name.trim(),
        email: cleanEmail,
        avatar: name.trim().charAt(0).toUpperCase(),
        umkmId: null,
        umkmName: umkmName.trim(),
        sector: sector,
        location: 'Indonesia',
        tenure: 17,
        currentClass: 'Growth',
        history: [],
        loginAt: Date.now(),
        needsEmailConfirm: true
      };
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(minimalSession));
      return {
        success: true,
        needsEmailConfirm: true,
        session: minimalSession
      };
    }

    // ── Step 3: Wait for DB trigger to create profiles row ──────
    await new Promise(r => setTimeout(r, 800));

    // ── Step 4: Insert UMKM profile ─────────────────────────────
    const { data: umkm, error: umkmErr } = await supabase
      .from('umkm_profiles')
      .insert({
        user_id: activeUserId,
        name: umkmName.trim(),
        sector: sector,
        location: 'Indonesia',
        tenure: 17,
        current_class: 'Growth'
      })
      .select()
      .single();

    if (umkmErr) {
      console.error('UMKM Profile creation error:', umkmErr);
      // Still return success but without full data
      const partialSession = {
        userId: activeUserId,
        name: name.trim(),
        email: cleanEmail,
        avatar: name.trim().charAt(0).toUpperCase(),
        umkmId: null,
        umkmName: umkmName.trim(),
        sector: sector,
        location: 'Indonesia',
        tenure: 17,
        currentClass: 'Growth',
        history: [],
        loginAt: Date.now()
      };
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(partialSession));
      return { success: true, session: partialSession };
    }

    // ── Step 5: Seed demo history & transactions ─────────────────
    const historyData = generateDemoHistory(umkm.id, sector);
    await supabase.from('umkm_history').insert(historyData);

    const txData = generateDemoTransactions(umkm.id, sector);
    await supabase.from('transactions').insert(txData);

    // ── Step 6: Build and save full session ──────────────────────
    const session = {
      userId: activeUserId,
      name: name.trim(),
      email: cleanEmail,
      avatar: name.trim().charAt(0).toUpperCase(),
      umkmId: umkm.id,
      umkmName: umkm.name,
      sector: umkm.sector,
      location: umkm.location,
      tenure: umkm.tenure,
      currentClass: umkm.current_class,
      history: historyData,
      loginAt: Date.now()
    };

    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    return { success: true, session };

  } catch (err) {
    console.error('[UHP Auth] Registration exception:', err);
    return { success: false, error: '❌ Terjadi kesalahan jaringan saat mendaftar. Coba lagi.' };
  }
}

// ─── Logout ──────────────────────────────────────────────────
async function uhpLogout() {
  localStorage.removeItem(AUTH_SESSION_KEY);
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  }
  window.location.replace('login.html');
}

// ─── Get Current Session ─────────────────────────────────────
function getSession() {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    
    // Session expires after 24 hours
    if (Date.now() - session.loginAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

// ─── Check if logged in ──────────────────────────────────────
function isLoggedIn() {
  return getSession() !== null;
}

// ─── Route Guards ────────────────────────────────────────────
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.replace('login.html');
    return false;
  }
  return true;
}

function redirectIfLoggedIn(target = 'dashboard.html') {
  if (isLoggedIn()) {
    window.location.replace(target);
    return true;
  }
  return false;
}

// ─── Synchronously Get UMKM Profile from Session Cache ───────
function getMyUMKM() {
  const session = getSession();
  if (!session || !session.umkmId) return null;
  return {
    id: session.umkmId,
    name: session.umkmName,
    sector: session.sector,
    location: session.location || 'Indonesia',
    tenure: session.tenure || 1,
    currentClass: session.currentClass || 'Growth',
    history: session.history || []
  };
}

// Force check on back/forward to prevent page cache bypass
window.addEventListener('pageshow', function(event) {
  if (window.location.pathname.includes('dashboard.html') && !isLoggedIn()) {
    window.location.replace('login.html');
  }
});
