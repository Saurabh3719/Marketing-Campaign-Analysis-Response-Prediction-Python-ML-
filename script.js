/**
 * script.js – Form logic, validation, chart rendering, history management
 *
 * Depends on: utils.js, model.js, Chart.js (CDN)
 */

'use strict';

// ── Global state ──────────────────────────────────────────────────────────────
let spendingChart = null;
let tierDistChart = null;
let currentPrediction = null;

// ── DOM helpers ───────────────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

// ── Theme toggle ──────────────────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('crm_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeButton(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('crm_theme', next);
  updateThemeButton(next);
  // Rebuild charts with new palette
  if (currentPrediction) rebuildCharts(currentPrediction);
  rebuildTierDistChart();
}

function updateThemeButton(theme) {
  const btn = $('#theme-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️ Light' : '🌙 Dark';
}

// ── Tab management ────────────────────────────────────────────────────────────
function initTabs() {
  $$('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      $$('.tab-btn').forEach((b) => b.classList.remove('active'));
      $$('.tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      $(`#tab-${target}`)?.classList.add('active');
    });
  });
}

// ── Form validation ───────────────────────────────────────────────────────────
const VALIDATORS = {
  income: { min: 0, max: 250000, label: 'Income' },
  recency: { min: 0, max: 365, label: 'Recency' },
  wines: { min: 0, max: 2000, label: 'Wines spending' },
  fruits: { min: 0, max: 2000, label: 'Fruits spending' },
  meat: { min: 0, max: 2000, label: 'Meat spending' },
  fish: { min: 0, max: 2000, label: 'Fish spending' },
  sweets: { min: 0, max: 2000, label: 'Sweets spending' },
  gold: { min: 0, max: 2000, label: 'Gold spending' },
  webPurchases: { min: 0, max: 50, label: 'Web purchases' },
  catalogPurchases: { min: 0, max: 50, label: 'Catalog purchases' },
  storePurchases: { min: 0, max: 50, label: 'Store purchases' },
  dealsPurchases: { min: 0, max: 50, label: 'Deals purchases' },
};

function validateField(name, value) {
  const rule = VALIDATORS[name];
  if (!rule) return null;
  const num = parseFloat(value);
  if (value === '' || isNaN(num)) return `${rule.label} is required`;
  if (num < rule.min || num > rule.max)
    return `${rule.label} must be between ${rule.min} and ${rule.max}`;
  return null;
}

function showFieldError(fieldName, msg) {
  const ctrl = $(`[name="${fieldName}"]`);
  const errEl = $(`#err-${fieldName}`);
  if (ctrl) ctrl.classList.toggle('error', !!msg);
  if (errEl) {
    errEl.textContent = msg || '';
    errEl.classList.toggle('visible', !!msg);
  }
}

function validateForm(data) {
  let valid = true;
  for (const [name] of Object.entries(VALIDATORS)) {
    const err = validateField(name, data[name]);
    showFieldError(name, err);
    if (err) valid = false;
  }
  // Required selects
  ['education', 'marital'].forEach((name) => {
    const val = data[name];
    const err = !val ? `${name.charAt(0).toUpperCase() + name.slice(1)} is required` : null;
    showFieldError(name, err);
    if (err) valid = false;
  });
  return valid;
}

// ── Collect form data ─────────────────────────────────────────────────────────
function collectFormData() {
  const form = $('#prediction-form');
  const fd = new FormData(form);
  const raw = {};
  for (const [key, value] of fd.entries()) raw[key] = value;
  // Checkboxes that may be missing from FormData
  ['cmp1', 'cmp2', 'cmp3', 'cmp4', 'cmp5'].forEach((k) => {
    raw[k] = form.querySelector(`[name="${k}"]`)?.checked ? '1' : '0';
  });
  return raw;
}

// ── Prediction handler ────────────────────────────────────────────────────────
function handlePredict(e) {
  e.preventDefault();
  const raw = collectFormData();
  if (!validateForm(raw)) {
    showToast('Please fix the highlighted errors before predicting.', 'error');
    return;
  }

  const btn = $('#predict-btn');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span class="spinner"></span> Analysing…';
  btn.disabled = true;

  // Small delay for UX effect
  setTimeout(() => {
    try {
      const features = extractFeatures(raw);
      const result = predict(features);

      currentPrediction = { result, features, raw };

      renderResult(result, features);
      rebuildCharts(currentPrediction);
      rebuildTierDistChart();

      const record = {
        id: generateId(),
        date: todayISO(),
        tier: result.tier.name,
        confidence: result.confidence,
        score: result.score,
        features,
        rawInputs: raw,
      };
      saveToHistory(record);
      renderHistory();
      updateStats();

      showToast(`Prediction complete – ${result.tier.icon} ${result.tier.name} tier`, 'success');
    } catch (err) {
      console.error(err);
      showToast('An error occurred during prediction. Please check your inputs.', 'error');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }, 500);
}

// ── Render prediction result ──────────────────────────────────────────────────
function renderResult(result, features) {
  const { tier, confidence, featureScores, probabilities, score } = result;
  const placeholder = $('#result-placeholder');
  const content = $('#result-content');

  if (placeholder) placeholder.style.display = 'none';
  if (content) {
    content.classList.add('visible', 'animate-in');
  }

  // Tier badge
  setText('#tier-icon', tier.icon);
  setText('#tier-name', tier.name);
  setHTML('#tier-badge', `<span class="tier-badge badge-${tier.badge}">${tier.name}</span>`);
  setHTML('#tier-description', tier.description);

  // Set dynamic colour on tier name
  const nameEl = $('#tier-name');
  if (nameEl) nameEl.style.color = tier.color;

  // Confidence bar
  setText('#confidence-pct', formatPercent(confidence));
  setProgress('#confidence-fill', confidence * 100);

  // Score breakdown
  const dims = [
    { key: 'income', label: 'Income' },
    { key: 'spending', label: 'Spending' },
    { key: 'recency', label: 'Recency' },
    { key: 'purchaseFreq', label: 'Frequency' },
    { key: 'campaigns', label: 'Campaigns' },
    { key: 'education', label: 'Education' },
  ];
  const grid = $('#score-grid');
  if (grid) {
    grid.innerHTML = dims
      .map(
        ({ key, label }) => `
      <div class="score-item">
        <div class="score-label">${label}</div>
        <div class="score-bar-wrap">
          <div class="mini-bar"><div class="mini-fill" style="width:${(featureScores[key] * 100).toFixed(1)}%"></div></div>
          <span class="score-val">${formatPercent(featureScores[key])}</span>
        </div>
      </div>`
      )
      .join('');
  }

  // Tier probability list
  const probList = $('#prob-list');
  const tierColors = { Premium: '#6c63ff', Standard: '#3b82f6', Basic: '#10b981', 'Low-Value': '#f59e0b' };
  if (probList) {
    probList.innerHTML = Object.entries(probabilities)
      .sort((a, b) => b[1] - a[1])
      .map(
        ([name, prob]) => `
      <div class="prob-row">
        <span class="prob-tier-name">${name}</span>
        <div class="prob-bar"><div class="prob-fill" style="width:${(prob * 100).toFixed(1)}%; background:${tierColors[name]}"></div></div>
        <span class="prob-pct">${formatPercent(prob)}</span>
      </div>`
      )
      .join('');
  }

  // Recommendations
  const recList = $('#rec-list');
  if (recList) {
    recList.innerHTML = tier.recommendations
      .map((r) => `<li>${r}</li>`)
      .join('');
  }

  // Export button
  const exportBtn = $('#export-result-btn');
  if (exportBtn) exportBtn.classList.remove('hidden');
}

// ── Charts ────────────────────────────────────────────────────────────────────
function getChartColors() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    grid: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    text: dark ? '#94a3b8' : '#64748b',
  };
}

function rebuildCharts(predData) {
  if (!predData) return;
  buildSpendingChart(predData.features);
}

function buildSpendingChart(features) {
  const ctx = document.getElementById('spending-chart');
  if (!ctx) return;
  const { grid, text } = getChartColors();

  const labels = ['Wines', 'Fruits', 'Meat', 'Fish', 'Sweets', 'Gold'];
  const data = [
    features.wines,
    features.fruits,
    features.meat,
    features.fish,
    features.sweets,
    features.gold,
  ];

  if (spendingChart) spendingChart.destroy();
  spendingChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Spending ($)',
          data,
          backgroundColor: [
            '#6c63ff', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6',
          ],
          borderRadius: 5,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: grid }, ticks: { color: text } },
        y: { grid: { color: grid }, ticks: { color: text }, beginAtZero: true },
      },
    },
  });
}

function rebuildTierDistChart() {
  const ctx = document.getElementById('tier-dist-chart');
  if (!ctx) return;
  const history = loadHistory();
  const { grid, text } = getChartColors();

  const counts = { Premium: 0, Standard: 0, Basic: 0, 'Low-Value': 0 };
  history.forEach((r) => { if (counts[r.tier] !== undefined) counts[r.tier]++; });

  const labels = Object.keys(counts);
  const data = Object.values(counts);
  const colors = ['#6c63ff', '#3b82f6', '#10b981', '#f59e0b'];

  if (tierDistChart) tierDistChart.destroy();
  tierDistChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: 'transparent' }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: text, font: { size: 12 }, padding: 12, boxWidth: 12 },
        },
      },
      cutout: '65%',
    },
  });
}

// ── History ───────────────────────────────────────────────────────────────────
function renderHistory() {
  const tbody = $('#history-tbody');
  if (!tbody) return;
  const history = loadHistory();
  if (!history.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No predictions yet. Fill in the form and click Predict.</td></tr>`;
    return;
  }
  const tierColors = { Premium: '#6c63ff', Standard: '#3b82f6', Basic: '#10b981', 'Low-Value': '#f59e0b' };
  tbody.innerHTML = history
    .slice(0, 30)
    .map(
      (r) => `
    <tr>
      <td>${r.date}</td>
      <td><span style="color:${tierColors[r.tier] || '#888'};font-weight:700">${r.tier}</span></td>
      <td>${formatPercent(r.confidence)}</td>
      <td>${formatCurrency(r.features.income)}</td>
      <td>${formatCurrency(r.features.totalSpending)}</td>
      <td>${r.features.recency}d</td>
      <td>${r.features.campaignsAccepted}</td>
    </tr>`
    )
    .join('');
}

// ── Stats dashboard ───────────────────────────────────────────────────────────
function updateStats() {
  const history = loadHistory();
  setText('#stat-total', history.length);

  if (!history.length) return;

  const premium = history.filter((r) => r.tier === 'Premium').length;
  const standard = history.filter((r) => r.tier === 'Standard').length;
  const avgConf = history.reduce((s, r) => s + r.confidence, 0) / history.length;
  const topTier =
    Object.entries(
      history.reduce((acc, r) => {
        acc[r.tier] = (acc[r.tier] || 0) + 1;
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1])[0]?.[0] || '–';

  setText('#stat-premium', premium);
  setText('#stat-avg-conf', formatPercent(avgConf));
  setText('#stat-top-tier', topTier);
}

// ── CSV upload (batch prediction) ─────────────────────────────────────────────
function initUpload() {
  const area = $('#upload-area');
  const input = $('#csv-input');
  if (!area || !input) return;

  area.addEventListener('click', () => input.click());
  area.addEventListener('dragover', (e) => {
    e.preventDefault();
    area.classList.add('drag-over');
  });
  area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
  area.addEventListener('drop', (e) => {
    e.preventDefault();
    area.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) processCSV(file);
  });
  input.addEventListener('change', () => {
    if (input.files[0]) processCSV(input.files[0]);
  });
}

function processCSV(file) {
  if (!file.name.endsWith('.csv')) {
    showToast('Please upload a .csv file', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const lines = e.target.result.split('\n').filter((l) => l.trim());
      const headers = lines[0].split('\t').map((h) => h.trim());
      const results = [];

      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split('\t');
        const row = {};
        headers.forEach((h, idx) => (row[h] = vals[idx]?.trim() || '0'));

        // Map CSV columns to form fields
        const raw = {
          income: row['Income'] || '0',
          kids: row['Kidhome'] || '0',
          teens: row['Teenhome'] || '0',
          recency: row['Recency'] || '0',
          education: row['Education'] || 'Graduation',
          marital: row['Marital_Status'] || 'Single',
          wines: row['MntWines'] || '0',
          fruits: row['MntFruits'] || '0',
          meat: row['MntMeatProducts'] || '0',
          fish: row['MntFishProducts'] || '0',
          sweets: row['MntSweetProducts'] || '0',
          gold: row['MntGoldProds'] || '0',
          webPurchases: row['NumWebPurchases'] || '0',
          catalogPurchases: row['NumCatalogPurchases'] || '0',
          storePurchases: row['NumStorePurchases'] || '0',
          dealsPurchases: row['NumDealsPurchases'] || '0',
          cmp1: row['AcceptedCmp1'] || '0',
          cmp2: row['AcceptedCmp2'] || '0',
          cmp3: row['AcceptedCmp3'] || '0',
          cmp4: row['AcceptedCmp4'] || '0',
          cmp5: row['AcceptedCmp5'] || '0',
        };

        const features = extractFeatures(raw);
        const result = predict(features);

        const record = {
          id: generateId(),
          date: todayISO(),
          tier: result.tier.name,
          confidence: result.confidence,
          score: result.score,
          features,
          rawInputs: raw,
        };
        saveToHistory(record);
        results.push(record);
      }

      renderHistory();
      rebuildTierDistChart();
      updateStats();
      showToast(`Batch complete – ${results.length} predictions added`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to parse CSV. Ensure it uses the standard marketing_campaign format.', 'error');
    }
  };
  reader.readAsText(file);
}

// ── Export ────────────────────────────────────────────────────────────────────
function exportHistory() {
  const history = loadHistory();
  if (!history.length) {
    showToast('No history to export', 'error');
    return;
  }
  const csv = recordsToCSV(history);
  downloadFile(csv, `crm_predictions_${todayISO()}.csv`, 'text/csv');
  showToast('Exported prediction history as CSV', 'success');
}

function exportCurrentResult() {
  if (!currentPrediction) return;
  const { result, features, raw } = currentPrediction;
  const record = {
    id: generateId(),
    date: todayISO(),
    tier: result.tier.name,
    confidence: result.confidence,
    score: result.score,
    features,
    rawInputs: raw,
  };
  const csv = recordsToCSV([record]);
  downloadFile(csv, `prediction_${todayISO()}.csv`, 'text/csv');
  showToast('Exported current prediction as CSV', 'success');
}

function exportResultJSON() {
  if (!currentPrediction) return;
  const { result, features } = currentPrediction;
  const payload = {
    tier: result.tier.name,
    score: result.score,
    confidence: result.confidence,
    probabilities: result.probabilities,
    featureScores: result.featureScores,
    features,
    generatedAt: new Date().toISOString(),
  };
  downloadFile(JSON.stringify(payload, null, 2), `prediction_${todayISO()}.json`, 'application/json');
  showToast('Exported prediction as JSON', 'success');
}

// ── Toast system ──────────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const container = $('#toast-container');
  if (!container) return;

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3500);
}

// ── Utility DOM helpers ───────────────────────────────────────────────────────
function setText(sel, text) {
  const el = $(sel);
  if (el) el.textContent = text;
}
function setHTML(sel, html) {
  const el = $(sel);
  if (el) el.innerHTML = html;
}
function setProgress(sel, pct) {
  const el = $(sel);
  if (el) el.style.width = Math.min(100, Math.max(0, pct)) + '%';
}

// ── Real-time validation feedback ────────────────────────────────────────────
function initLiveValidation() {
  Object.keys(VALIDATORS).forEach((name) => {
    const el = $(`[name="${name}"]`);
    if (el) {
      el.addEventListener('blur', () => {
        const err = validateField(name, el.value);
        showFieldError(name, err);
      });
      el.addEventListener('input', () => {
        // Clear error on input
        if (el.classList.contains('error')) showFieldError(name, null);
      });
    }
  });
}

// ── Reset form ────────────────────────────────────────────────────────────────
function resetForm() {
  const form = $('#prediction-form');
  if (form) form.reset();
  $$('.form-control.error').forEach((el) => el.classList.remove('error'));
  $$('.field-error.visible').forEach((el) => el.classList.remove('visible'));

  const content = $('#result-content');
  const placeholder = $('#result-placeholder');
  if (content) content.classList.remove('visible');
  if (placeholder) placeholder.style.display = '';

  const exportBtn = $('#export-result-btn');
  if (exportBtn) exportBtn.classList.add('hidden');

  currentPrediction = null;
  showToast('Form reset', 'info');
}

// ── Clear history ─────────────────────────────────────────────────────────────
function handleClearHistory() {
  if (!confirm('Clear all prediction history? This cannot be undone.')) return;
  clearHistory();
  renderHistory();
  rebuildTierDistChart();
  updateStats();
  showToast('History cleared', 'info');
}

// ── Init ──────────────────────────────────────────────────────────────────────
function init() {
  initTheme();
  initTabs();
  initLiveValidation();
  initUpload();

  // Load persisted data
  renderHistory();
  rebuildTierDistChart();
  updateStats();

  // Wire up buttons
  $('#theme-toggle')?.addEventListener('click', toggleTheme);
  $('#prediction-form')?.addEventListener('submit', handlePredict);
  $('#reset-btn')?.addEventListener('click', resetForm);
  $('#export-history-btn')?.addEventListener('click', exportHistory);
  $('#clear-history-btn')?.addEventListener('click', handleClearHistory);
  $('#export-result-btn')?.addEventListener('click', exportCurrentResult);
  $('#export-json-btn')?.addEventListener('click', exportResultJSON);
}

document.addEventListener('DOMContentLoaded', init);
