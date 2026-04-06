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

const FI_COLORS = ['#60a5fa', '#a78bfa', '#34d399', '#fb923c', '#f472b6', '#fbbf24'];

// ─── Detect page mode ────────────────────────────────────────
const isDemoPage = window.location.pathname.includes('demo');
const isDashboardPage = window.location.pathname.includes('dashboard');

// ─── UI Updaters ─────────────────────────────────────────────
function updateSentimentPreview() {
  const el = document.getElementById('inputReview');
  if (!el) return;
  const text = el.value;
  const score = computeSentiment(text);
  const meter = document.getElementById('sentimentMeter');
  const preview = document.getElementById('sentimentPreview');
  if (!meter || !preview) return;

  const pos = ((score + 1) / 2) * 90 + 5;
  meter.style.width = pos + '%';
  preview.textContent = score >= 0 ? '+' + score.toFixed(2) : score.toFixed(2);
  if (score >= 0.2) preview.style.color = 'var(--elite)';
  else if (score <= -0.2) preview.style.color = 'var(--critical)';
  else preview.style.color = 'var(--text-muted)';
}

function updateSlider(type) {
  if (type === 'transaction') {
    const el = document.getElementById('transactionVal');
    if (el) el.textContent = document.getElementById('inputTransactions').value;
  } else {
    const el = document.getElementById('tenureVal');
    if (el) el.textContent = document.getElementById('inputTenure').value;
  }
}

function renderFeatureImportance(features) {
  const container = document.getElementById('featureChart');
  if (!container) return;
  container.innerHTML = '';
  const maxPct = features[0].pct;

  features.forEach((f, i) => {
    const row = document.createElement('div');
    row.className = 'fi-row';
    row.innerHTML = `
      <span class="fi-label">${f.name}</span>
      <div class="fi-bar-track">
        <div class="fi-bar-fill" style="width:0%; background:${FI_COLORS[i]};" data-width="${(f.pct / maxPct * 100).toFixed(1)}"></div>
      </div>
      <span class="fi-pct">${f.pct}%</span>`;
    container.appendChild(row);
  });

  requestAnimationFrame(() => {
    container.querySelectorAll('.fi-bar-fill').forEach(bar => {
      setTimeout(() => { bar.style.width = bar.dataset.width + '%'; }, 100);
    });
  });
}

function renderInsights(cls) {
  const data = INSIGHTS[cls];
  const iconEl = document.getElementById('insightIconBig');
  const textEl = document.getElementById('insightText');
  if (iconEl) iconEl.textContent = data.icon;
  if (textEl) textEl.textContent = data.text;

  const actEl = document.getElementById('insightActions');
  if (actEl) {
    actEl.innerHTML = data.actions.map(a => `
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
function analyzeUMKM() {
  const btn = document.getElementById('analyzeBtn');
  if (btn) btn.classList.add('loading');

  setTimeout(() => {
    const revenue = parseFloat(document.getElementById('inputRevenue').value) || 0;
    const expenses = parseFloat(document.getElementById('inputExpenses').value) || 0;
    const transactions = parseInt(document.getElementById('inputTransactions').value) || 100;
    const tenure = parseInt(document.getElementById('inputTenure').value) || 12;
    const review = document.getElementById('inputReview').value;

    const sentimentScore = computeSentiment(review);
    const { predictedClass, confidence, npm, burnRate, netProfit } = predictClass(
      revenue, expenses, transactions, tenure, sentimentScore
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
    const brColor = burnRate < 0.8 ? 'var(--elite)' : burnRate < 1.0 ? 'var(--growth)' : burnRate < 1.2 ? 'var(--struggling)' : 'var(--critical)';
    if (brEl) { brEl.textContent = burnRate.toFixed(3); brEl.style.color = brColor; }
    const brLabel = document.getElementById('metricBurnLabel');
    if (brLabel) brLabel.textContent = burnRate < 0.8 ? 'Sangat Efisien' : burnRate < 1.0 ? 'Efisien' : burnRate < 1.2 ? 'Risiko Sedang' : 'Risiko Tinggi';
    const brBar = document.getElementById('burnRateBar');
    if (brBar) { brBar.style.background = brColor; setTimeout(() => { brBar.style.width = Math.min(100, (burnRate / 1.5) * 100) + '%'; }, 50); }

    // Health Badge
    const badgeText = document.getElementById('badgeText');
    if (badgeText) { badgeText.textContent = predictedClass.toUpperCase(); badgeText.style.color = color; }
    const badgeCard = document.getElementById('healthBadge');
    if (badgeCard) badgeCard.style.setProperty('--badge-color', color);
    const hCard = document.querySelector('.health-badge-card');
    if (hCard) { hCard.style.setProperty('--badge-color', color); hCard.style.setProperty('--badge-glow', glow); hCard.className = 'health-badge-card animated'; }
    const badgeDesc = document.getElementById('badgeDesc');
    if (badgeDesc) badgeDesc.textContent = INSIGHTS[predictedClass].icon + ' ' + INSIGHTS[predictedClass].text;

    setConfidenceRing(confidence, predictedClass);
    renderFeatureImportance(features);
    renderInsights(predictedClass);

    // Metric card accents
    document.querySelectorAll('.metric-card').forEach((c, i) => {
      c.style.setProperty('--metric-accent', [color, color, brColor][i] || color);
      c.classList.remove('updated');
      setTimeout(() => c.classList.add('updated'), 50);
    });

    if (btn) btn.classList.remove('loading');
  }, 600);
}

// ─── Quick Fill Presets ──────────────────────────────────────
function quickFill(type) {
  const p = PRESETS[type];
  const el = (id) => document.getElementById(id);
  if (el('inputRevenue')) el('inputRevenue').value = p.rev;
  if (el('inputExpenses')) el('inputExpenses').value = p.exp;
  if (el('inputTransactions')) el('inputTransactions').value = p.trx;
  if (el('inputTenure')) el('inputTenure').value = p.tenure;
  if (el('inputReview')) el('inputReview').value = p.review;
  updateSlider('transaction');
  updateSlider('tenure');
  updateSentimentPreview();
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
  // Sentiment preview
  const reviewEl = document.getElementById('inputReview');
  if (reviewEl) {
    reviewEl.addEventListener('input', updateSentimentPreview);
    updateSentimentPreview();
  }
  updateSlider('transaction');
  updateSlider('tenure');

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
