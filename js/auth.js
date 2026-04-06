/* =============================================
   UHP v2.0 — Authentication System
   Client-side auth with localStorage sessions
   ============================================= */

'use strict';

const AUTH_SESSION_KEY = 'uhp_session';

// ─── Login ───────────────────────────────────────────────────
async function uhpLogin(email, password) {
  const pwHash = await hashSHA256(password);
  const user = UHP_USERS.find(u => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === pwHash);

  if (!user) {
    return { success: false, error: 'Email atau password salah.' };
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
}

// ─── Logout ──────────────────────────────────────────────────
function uhpLogout() {
  localStorage.removeItem(AUTH_SESSION_KEY);
  window.location.href = 'index.html';
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
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

function redirectIfLoggedIn(target = 'dashboard.html') {
  if (isLoggedIn()) {
    window.location.href = target;
    return true;
  }
  return false;
}

// ─── Get user's UMKM profile ─────────────────────────────────
function getMyUMKM() {
  const session = getSession();
  if (!session) return null;
  return UHP_UMKM_PROFILES[session.umkmId] || null;
}
