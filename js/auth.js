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

// Helper to generate 20 recent transactions
function generateDemoTransactions(umkmId) {
  const txs = [];
  const names = ['Rudi', 'Siti', 'Budi', 'Dewi', 'Joko', 'Ani', 'Eko', 'Sari', 'Giri', 'Yanto', 'Rina', 'Tono', 'Lina', 'Hadi', 'Maya', 'Dian', 'Bimo', 'Indah', 'Agus', 'Soni'];
  const products = ['Paket Makan Siang', 'Kopi Susu Gula Aren', 'Printer Digital', 'Perawatan Wajah', 'Kerajinan Tas', 'Nasi Goreng Spesial', 'Es Teh Manis', 'Servis Laptop', 'Potong Rambut', 'Masker Organik'];
  const reviews = [
    'Sangat puas dengan layanannya, cepat dan ramah!',
    'Produknya bagus, sesuai dengan deskripsi.',
    'Pengiriman agak lambat tapi barang sampai dengan selamat.',
    'Harga bersahabat dan rasanya enak sekali.',
    'Tempatnya bersih dan nyaman untuk nongkrong.',
    'Pelayanan ramah tapi antrean agak panjang.',
    'Kualitas mantap, sudah langganan di sini.',
    'Suka sekali dengan variasi menunya.',
    'Rekomendasi untuk yang cari kualitas terbaik.',
    'Karyawannya sangat membantu dan komunikatif.'
  ];

  for (let i = 0; i < 20; i++) {
    const qty = Math.floor(Math.random() * 3) + 1;
    const price = (Math.floor(Math.random() * 5) + 1) * 15000;
    const sentiment = Math.random() > 0.2 ? parseFloat((0.5 + Math.random() * 0.5).toFixed(2)) : parseFloat((-0.5 + Math.random() * 0.5).toFixed(2));
    const reviewText = sentiment > 0 ? reviews[Math.floor(Math.random() * 5)] : reviews[Math.floor(Math.random() * 5) + 5];

    txs.push({
      umkm_id: umkmId,
      invoice_no: `INV-${Date.now()}-${i}`,
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      customer_name: names[i % names.length],
      product_name: products[i % products.length],
      quantity: qty,
      price: price,
      total_price: qty * price,
      review: reviewText,
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

    const txData = generateDemoTransactions(umkm.id);
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
