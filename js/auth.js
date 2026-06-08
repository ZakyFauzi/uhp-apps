/* =============================================
   UHP v3.0 — Supabase Authentication System
   Integrates Supabase Auth and Syncs Sessions
   ============================================= */

'use strict';

const AUTH_SESSION_KEY = 'uhp_session';

const supabaseUrl = 'https://cgcvpcqxxmhcoxshldwa.supabase.co';
const supabaseKey = 'sb_publishable_ktImoxqyVD1W1uMa9rs64A_X9GRzmLb';
let supabase = null;

// Initialize Supabase client
if (window.supabase) {
  supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
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
  if (msg.includes('Password should be')) {
    return 'Password terlalu pendek. Minimal harus 6 karakter.';
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

// ─── Registration ────────────────────────────────────────────
async function uhpRegister(email, password, name, umkmName, sector) {
  if (!email || !password || !name || !umkmName || !sector) {
    return { success: false, error: '❌ Semua data registrasi wajib diisi.' };
  }
  if (!supabase) {
    return { success: false, error: '❌ Supabase SDK gagal dimuat. Coba muat ulang.' };
  }

  // Basic validation
  if (password.length < 6) {
    return { success: false, error: '❌ Password minimal terdiri dari 6 karakter.' };
  }

  try {
    // 1. Sign up user
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password,
      options: {
        data: { name: name.trim() }
      }
    });

    if (error) {
      return { success: false, error: '❌ ' + translateAuthError(error.message) };
    }

    const user = data.user;
    if (!user) {
      return { success: false, error: '❌ Terjadi kegagalan saat mendaftarkan akun baru.' };
    }

    // Wait briefly for the DB trigger to populate the profiles table
    await new Promise(r => setTimeout(r, 600));

    // 2. Insert UMKM profile
    const { data: umkm, error: umkmErr } = await supabase
      .from('umkm_profiles')
      .insert({
        user_id: user.id,
        name: umkmName.trim(),
        sector: sector,
        location: 'Indonesia',
        tenure: 1,
        current_class: 'Growth'
      })
      .select()
      .single();

    if (umkmErr) {
      console.error('UMKM Profile creation error:', umkmErr);
      return { success: false, error: '❌ Akun terdaftar, namun gagal membuat profil UMKM Anda: ' + umkmErr.message };
    }

    // 3. Insert default history month (e.g. current month)
    const { error: histErr } = await supabase
      .from('umkm_history')
      .insert({
        umkm_id: umkm.id,
        month: 'Mei 2026',
        revenue: 5000000,
        expenses: 4000000,
        transactions: 10,
        sentiment: 0.0,
        class: 'Growth'
      });

    if (histErr) {
      console.warn('Initial history seeding failed:', histErr);
    }

    // 4. Create and save session
    const session = {
      userId: user.id,
      name: name.trim(),
      email: user.email,
      avatar: name.trim().charAt(0).toUpperCase(),
      umkmId: umkm.id,
      umkmName: umkm.name,
      sector: umkm.sector,
      location: umkm.location,
      tenure: umkm.tenure,
      currentClass: umkm.current_class,
      history: [{
        month: 'Mei 2026',
        revenue: 5000000,
        expenses: 4000000,
        transactions: 10,
        sentiment: 0.0,
        class: 'Growth'
      }],
      loginAt: Date.now()
    };

    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    return { success: true, session };

  } catch (err) {
    console.error('[UHP Auth] Registration exception:', err);
    return { success: false, error: '❌ Terjadi kesalahan saat mendaftarkan akun Anda.' };
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
