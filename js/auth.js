/* =============================================
   UHP v2.0 — Authentication System
   Client-side auth with localStorage sessions
   ============================================= */

'use strict';

const AUTH_SESSION_KEY = 'uhp_session';
const AUTH_USERS_KEY = 'uhp_registered_users';
const AUTH_UMKM_KEY = 'uhp_umkm_profiles';

// ─── Helper: Get all users (demo + registered) ────────────────
function getAllUsers() {
  const registered = JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || '[]');
  return [...UHP_USERS, ...registered];
}

// ─── Helper: Get UMKM profiles (demo + registered) ──────────
function getAllUMKMProfiles() {
  const customProfiles = JSON.parse(localStorage.getItem(AUTH_UMKM_KEY) || '{}');
  return { ...UHP_UMKM_PROFILES, ...customProfiles };
}

// ─── Helper: Create initial UMKM profile ─────────────────────
function createInitialUMKMProfile(umkmId, umkmName, sector) {
  return {
    name: umkmName,
    sector: sector,
    location: 'Indonesia',
    tenure: 0, // Baru dibuat
    currentClass: 'Growth', // Default class untuk new business
    history: [],
    recentReview: 'Akun baru. Mulai input data untuk analisis.',
  };
}

// ─── Helper: Generate unique ID ──────────────────────────────
function generateUID() {
  return 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ─── Delete Account ──────────────────────────────────────────
async function uhpDeleteAccount(password) {
  // Get current session
  const session = getSession();
  if (!session) {
    return { success: false, error: '❌ Anda harus login terlebih dahulu.' };
  }

  // Validasi password
  if (!password || password.length === 0) {
    return { success: false, error: '❌ Password tidak boleh kosong.' };
  }

  try {
    // Verify password is correct
    const allUsers = getAllUsers();
    const user = allUsers.find(u => u.id === session.userId);

    if (!user) {
      return { success: false, error: '❌ Akun tidak ditemukan.' };
    }

    // Hash password untuk verify
    const pwHash = await hashSHA256(password);
    if (user.passwordHash !== pwHash) {
      return { success: false, error: '❌ Password salah. Akun tidak bisa dihapus.' };
    }

    // Check apakah ini akun custom/registered (bukan demo)
    if (!user.isCustom) {
      return { success: false, error: '❌ Demo accounts tidak bisa dihapus. Buat akun baru untuk testing.' };
    }

    // Remove user dari registered users
    const registered = JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || '[]');
    const filteredUsers = registered.filter(u => u.id !== session.userId);
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(filteredUsers));

    // Remove UMKM profile
    const customProfiles = JSON.parse(localStorage.getItem(AUTH_UMKM_KEY) || '{}');
    delete customProfiles[session.umkmId];
    localStorage.setItem(AUTH_UMKM_KEY, JSON.stringify(customProfiles));

    // Clear session
    localStorage.removeItem(AUTH_SESSION_KEY);

    return { 
      success: true, 
      message: '✅ Akun berhasil dihapus. Anda akan dialihkan ke halaman awal.' 
    };
  } catch (error) {
    console.error('Delete account error:', error);
    return { 
      success: false, 
      error: '❌ Terjadi kesalahan saat menghapus akun. Coba lagi.' 
    };
  }
}

// ─── Registration ────────────────────────────────────────────
async function uhpRegister(email, password, name, umkmName, sector) {
  // Server-side validation (double check)
  
  // Check empty fields
  if (!email || !password || !name || !umkmName || !sector) {
    return { success: false, error: '❌ Semua field harus diisi dengan benar.' };
  }

  // Validate name length
  if (name.length < 3 || name.length > 50) {
    return { success: false, error: '❌ Nama harus 3-50 karakter.' };
  }

  // Validate name - hanya huruf, angka, spasi, dan dash
  const nameRegex = /^[a-zA-Z0-9\s\-]+$/;
  if (!nameRegex.test(name)) {
    return { success: false, error: '❌ Nama tidak boleh mengandung simbol. Hanya huruf, angka, spasi, dan dash (-).' };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: '❌ Format email tidak valid.' };
  }

  // Validate email length
  if (email.length > 100) {
    return { success: false, error: '❌ Email terlalu panjang.' };
  }

  // Validate password
  if (password.length < 6) {
    return { success: false, error: '❌ Password minimal 6 karakter.' };
  }

  if (password.length > 100) {
    return { success: false, error: '❌ Password maksimal 100 karakter.' };
  }

  // Validate UMKM name length
  if (umkmName.length < 3 || umkmName.length > 100) {
    return { success: false, error: '❌ Nama UMKM harus 3-100 karakter.' };
  }

  // Validate sector
  const validSectors = ['Kuliner', 'Teknologi', 'Kecantikan', 'Kerajinan', 'Fashion', 'Pertanian', 'Elektronik', 'Jasa', 'Lainnya'];
  if (!validSectors.includes(sector)) {
    return { success: false, error: '❌ Sektor bisnis tidak valid.' };
  }

  // Check email sudah terdaftar
  const allUsers = getAllUsers();
  const existingUser = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (existingUser) {
    return { 
      success: false, 
      error: '❌ Email "<strong>' + email + '</strong>" sudah terdaftar. Gunakan email lain atau <a href="login.html">login di sini</a>.' 
    };
  }

  try {
    // Hash password
    const pwHash = await hashSHA256(password);
    const avatar = name.charAt(0).toUpperCase();

    // Buat user baru
    const newUser = {
      id: generateUID(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: pwHash,
      avatar: avatar,
      umkmId: 'umkm_' + Date.now(),
      umkmName: umkmName.trim(),
      sector: sector.trim(),
      registeredAt: Date.now(),
      isCustom: true, // Mark as registered user
    };

    // Simpan ke localStorage
    const registered = JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || '[]');
    registered.push(newUser);
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(registered));

    // Buat initial UMKM profile untuk user baru
    const umkmProfile = createInitialUMKMProfile(newUser.umkmId, umkmName.trim(), sector.trim());
    const customProfiles = JSON.parse(localStorage.getItem(AUTH_UMKM_KEY) || '{}');
    customProfiles[newUser.umkmId] = umkmProfile;
    localStorage.setItem(AUTH_UMKM_KEY, JSON.stringify(customProfiles));

    // Auto login setelah registrasi
    const session = {
      userId: newUser.id,
      name: newUser.name,
      email: newUser.email,
      avatar: newUser.avatar,
      umkmId: newUser.umkmId,
      umkmName: newUser.umkmName,
      sector: newUser.sector,
      loginAt: Date.now(),
    };

    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    return { 
      success: true, 
      session, 
      message: '✅ Akun berhasil dibuat! Selamat datang di UHP.' 
    };
  } catch (error) {
    console.error('Registration error:', error);
    return { 
      success: false, 
      error: '❌ Terjadi kesalahan saat mendaftar. Coba lagi.' 
    };
  }
}

// ─── Login ───────────────────────────────────────────────────
async function uhpLogin(email, password) {
  // Validasi input
  if (!email || !password) {
    return { success: false, error: '❌ Email dan password harus diisi.' };
  }

  if (!email.trim() || !password.trim()) {
    return { success: false, error: '❌ Email dan password tidak boleh kosong.' };
  }

  try {
    const pwHash = await hashSHA256(password);
    const allUsers = getAllUsers();
    const user = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === pwHash);

    if (!user) {
      return { success: false, error: '❌ Email atau password salah. Cek kembali.' };
    }

    // Create session
    const session = {
      userId: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      umkmId: user.umkmId,
      umkmName: user.umkmName,
      sector: user.sector,
      loginAt: Date.now(),
    };

    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    return { success: true, session };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: '❌ Terjadi kesalahan. Coba lagi.' };
  }
}

// ─── Logout ──────────────────────────────────────────────────
function uhpLogout() {
  localStorage.removeItem(AUTH_SESSION_KEY);
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

// ─── Get user's UMKM profile ─────────────────────────────────
function getMyUMKM() {
  const session = getSession();
  if (!session) return null;
  const allProfiles = getAllUMKMProfiles();
  return allProfiles[session.umkmId] || null;
}

// Force validation on back/forward navigation to prevent BF Cache back-button bypass
window.addEventListener('pageshow', function(event) {
  if (window.location.pathname.includes('dashboard.html') && !isLoggedIn()) {
    window.location.replace('login.html');
  }
});
