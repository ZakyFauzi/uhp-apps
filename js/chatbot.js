/* =============================================
   UHP v2.0 — UHePi AI Chatbot
   Flow-card chat with OpenRouter LLM
   ============================================= */

'use strict';

const UHEPI_SYSTEM_PROMPT = `Kamu adalah UHePi (UMKM Health Predictor Intelligence), asisten AI ramah yang membantu pelaku UMKM Indonesia menganalisis dan meningkatkan kesehatan bisnis mereka.

Keahlianmu:
- Analisis finansial UMKM (burn rate, net profit margin, revenue)
- Sentimen pelanggan dan cara memperbaikinya
- Strategi pertumbuhan bisnis UMKM
- Tips efisiensi operasional
- Klasifikasi kesehatan bisnis (Elite, Growth, Struggling, Critical)

Aturan:
- Selalu jawab dalam Bahasa Indonesia yang ramah dan mudah dipahami
- Berikan saran yang konkret dan actionable
- Jika ditanya di luar topik bisnis UMKM, arahkan kembali ke topik bisnis dengan sopan
- Gunakan emoji secukupnya untuk membuat percakapan lebih menarik
- Jawab secara ringkas (max 3-4 paragraf) kecuali diminta lebih detail`;

let chatMessages = [];
let chatMessageCount = 0;
const DEMO_CHAT_LIMIT = 3;

// ─── Initialize Chat ─────────────────────────────────────────
function initChat(isDemoMode = false) {
  chatMessages = [{
    role: 'system',
    content: UHEPI_SYSTEM_PROMPT,
  }];
  chatMessageCount = 0;

  // Inject user's UMKM data if logged in
  if (!isDemoMode) {
    const session = getSession();
    const umkm = getMyUMKM();
    if (session && umkm) {
      const latest = umkm.history[umkm.history.length - 1];
      chatMessages[0].content += `\n\nData bisnis pengguna saat ini:
- Nama: ${session.name}
- Bisnis: ${umkm.name} (${umkm.sector})
- Lokasi: ${umkm.location}
- Durasi Usaha: ${umkm.tenure} bulan
- Status Kesehatan: ${umkm.currentClass}
- Revenue Terakhir: Rp ${(latest.revenue / 1_000_000).toFixed(1)} Jt
- Expenses Terakhir: Rp ${(latest.expenses / 1_000_000).toFixed(1)} Jt
- Burn Rate: ${(latest.expenses / latest.revenue).toFixed(3)}
- NPM: ${(((latest.revenue - latest.expenses) / latest.revenue) * 100).toFixed(1)}%
- Sentiment Score: ${latest.sentiment}
- Review Terakhir: "${umkm.recentReview}"

Gunakan data ini untuk memberikan saran yang personal dan relevan.`;
    }
  }
}

// ─── Render Chat UI ──────────────────────────────────────────
function renderChatContainer(containerId, isDemoMode = false) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="chat-wrapper">
      <div class="chat-header">
        <div class="chat-avatar uhepi-avatar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.27A7 7 0 0 1 8 18H7a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 5-6.71V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
            <circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/>
            <path d="M10 17a2 2 0 0 0 4 0"/>
          </svg>
        </div>
        <div class="chat-header-info">
          <span class="chat-header-name">UHePi</span>
          <span class="chat-header-sub">UMKM Health Predictor Intelligence</span>
        </div>
        ${isDemoMode ? '<span class="chat-demo-badge">Demo</span>' : ''}
      </div>

      <div class="chat-messages" id="chatMessages">
        <div class="chat-card uhepi-card animate-in">
          <div class="chat-card-avatar uhepi-avatar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.27A7 7 0 0 1 8 18H7a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 5-6.71V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
              <circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/>
              <path d="M10 17a2 2 0 0 0 4 0"/>
            </svg>
          </div>
          <div class="chat-card-body">
            <div class="chat-card-name">UHePi</div>
            <div class="chat-card-text">Halo! 👋 Saya <strong>UHePi</strong>, asisten AI untuk kesehatan bisnis UMKM Anda. Tanyakan apa saja tentang analisis finansial, sentimen pelanggan, atau strategi pertumbuhan bisnis!</div>
          </div>
        </div>
      </div>

      <div class="chat-suggestions" id="chatSuggestions">
        <button class="chat-suggest-btn" onclick="sendSuggestion('Bagaimana cara menurunkan burn rate?')">💡 Menurunkan burn rate</button>
        <button class="chat-suggest-btn" onclick="sendSuggestion('Jelaskan klasifikasi kesehatan UMKM')">📊 Klasifikasi kesehatan</button>
        <button class="chat-suggest-btn" onclick="sendSuggestion('Tips meningkatkan sentimen pelanggan')">😊 Tingkatkan sentimen</button>
      </div>

      <div class="chat-input-area">
        <input type="text" class="chat-input" id="chatInput" placeholder="Tanya UHePi..." onkeydown="if(event.key==='Enter')sendChat()" />
        <button class="chat-send-btn" id="chatSendBtn" onclick="sendChat()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
  `;

  initChat(isDemoMode);
}

// ─── Send Message ────────────────────────────────────────────
async function sendChat() {
  const input = document.getElementById('chatInput');
  const msg = (input.value || '').trim();
  if (!msg) return;

  const isDemoMode = !isLoggedIn();

  // Check demo limit
  if (isDemoMode && chatMessageCount >= DEMO_CHAT_LIMIT) {
    showDemoLimitCard();
    return;
  }

  input.value = '';
  chatMessageCount++;

  // Add user message card
  const session = getSession();
  const userName = session ? session.name : 'Anda';
  const userAvatar = session ? session.avatar : '👤';
  addMessageCard(msg, userName, userAvatar, 'user');

  // Hide suggestions after first message
  const sugEl = document.getElementById('chatSuggestions');
  if (sugEl) sugEl.style.display = 'none';

  // Add typing indicator
  const typingId = addTypingIndicator();

  // Send to API
  chatMessages.push({ role: 'user', content: msg });

  try {
    const reply = await callUHePiAPI(chatMessages);
    chatMessages.push({ role: 'assistant', content: reply });

    removeTypingIndicator(typingId);
    addMessageCard(reply, 'UHePi', null, 'uhepi');

    // Check if demo limit reached after this message
    if (isDemoMode && chatMessageCount >= DEMO_CHAT_LIMIT) {
      setTimeout(showDemoLimitCard, 500);
    }
  } catch (err) {
    removeTypingIndicator(typingId);
    addMessageCard('Maaf, saya sedang mengalami kendala teknis. Silakan coba lagi nanti. 🙏', 'UHePi', null, 'uhepi');
    console.error('[UHePi] API error:', err);
  }
}

function sendSuggestion(text) {
  document.getElementById('chatInput').value = text;
  sendChat();
}

// ─── API Call ────────────────────────────────────────────────
async function callUHePiAPI(messages) {
  // Try Netlify Function first, fall back to direct API
  const endpoints = [
    '/.netlify/functions/chat',
    '/api/chat',
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });

      if (res.ok) {
        const data = await res.json();
        return data.reply || 'Maaf, saya tidak bisa merespons saat ini.';
      }
    } catch {
      continue;
    }
  }

  // Fallback: direct API call (key exposed but works for demo)
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer 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',
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'UHP - UMKM Health Predictor',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        messages: messages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'Maaf, saya tidak bisa merespons saat ini.';
  } catch (err) {
    throw err;
  }
}

// ─── UI Helpers ──────────────────────────────────────────────
function addMessageCard(text, name, avatar, type) {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  const card = document.createElement('div');
  card.className = `chat-card ${type}-card animate-in`;

  const avatarHTML = type === 'uhepi'
    ? `<div class="chat-card-avatar uhepi-avatar">
         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
           <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.27A7 7 0 0 1 8 18H7a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 5-6.71V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
           <circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/>
           <path d="M10 17a2 2 0 0 0 4 0"/>
         </svg>
       </div>`
    : `<div class="chat-card-avatar user-avatar">${avatar || '👤'}</div>`;

  // Format text — convert markdown-like to HTML
  const formattedText = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');

  card.innerHTML = `
    ${avatarHTML}
    <div class="chat-card-body">
      <div class="chat-card-name">${name}</div>
      <div class="chat-card-text">${formattedText}</div>
    </div>
  `;

  container.appendChild(card);
  container.scrollTop = container.scrollHeight;
}

function addTypingIndicator() {
  const container = document.getElementById('chatMessages');
  const id = 'typing-' + Date.now();
  const el = document.createElement('div');
  el.id = id;
  el.className = 'chat-card uhepi-card typing-card';
  el.innerHTML = `
    <div class="chat-card-avatar uhepi-avatar">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.27A7 7 0 0 1 8 18H7a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 5-6.71V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
        <circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/>
      </svg>
    </div>
    <div class="chat-card-body">
      <div class="chat-card-name">UHePi</div>
      <div class="typing-dots"><span></span><span></span><span></span></div>
    </div>
  `;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function showDemoLimitCard() {
  const container = document.getElementById('chatMessages');
  const card = document.createElement('div');
  card.className = 'chat-limit-card animate-in';
  card.innerHTML = `
    <div class="limit-icon">🔒</div>
    <div class="limit-title">Batas Demo Tercapai</div>
    <div class="limit-text">Anda telah menggunakan ${DEMO_CHAT_LIMIT} pesan gratis. Login untuk chat tanpa batas dengan UHePi!</div>
    <a href="login.html" class="btn-primary" style="margin-top:12px;text-decoration:none;">
      <span>Login untuk Akses Penuh</span>
    </a>
  `;
  container.appendChild(card);
  container.scrollTop = container.scrollHeight;

  // Disable input
  const input = document.getElementById('chatInput');
  const btn = document.getElementById('chatSendBtn');
  if (input) { input.disabled = true; input.placeholder = 'Login untuk melanjutkan...'; }
  if (btn) btn.disabled = true;
}
