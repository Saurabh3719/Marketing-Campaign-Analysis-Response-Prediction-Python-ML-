/**
 * utils.js – Helper functions for data processing and formatting
 */

// ── Encoding maps ────────────────────────────────────────────────────────────

const EDUCATION_MAP = {
  Basic: 0,
  '2n Cycle': 1,
  Graduation: 2,
  Master: 3,
  PhD: 4,
};

const MARITAL_MAP = {
  Single: 0,
  Divorced: 1,
  Widow: 1,
  Together: 2,
  Married: 2,
};

// ── Feature extraction ───────────────────────────────────────────────────────

/**
 * Convert raw form values into a normalised feature vector used by the model.
 * @param {Object} raw – raw form data
 * @returns {Object} processed feature object
 */
function extractFeatures(raw) {
  const income = parseFloat(raw.income) || 0;
  const kids = parseInt(raw.kids, 10) || 0;
  const teens = parseInt(raw.teens, 10) || 0;
  const recency = parseInt(raw.recency, 10) || 0;
  const education = EDUCATION_MAP[raw.education] ?? 2;
  const marital = MARITAL_MAP[raw.marital] ?? 0;

  // Spending
  const wines = parseFloat(raw.wines) || 0;
  const fruits = parseFloat(raw.fruits) || 0;
  const meat = parseFloat(raw.meat) || 0;
  const fish = parseFloat(raw.fish) || 0;
  const sweets = parseFloat(raw.sweets) || 0;
  const gold = parseFloat(raw.gold) || 0;
  const totalSpending = wines + fruits + meat + fish + sweets + gold;

  // Purchase frequency
  const webPurchases = parseInt(raw.webPurchases, 10) || 0;
  const catalogPurchases = parseInt(raw.catalogPurchases, 10) || 0;
  const storePurchases = parseInt(raw.storePurchases, 10) || 0;
  const dealsPurchases = parseInt(raw.dealsPurchases, 10) || 0;
  const totalPurchases = webPurchases + catalogPurchases + storePurchases;

  // Campaign acceptance
  const campaignsAccepted =
    (parseInt(raw.cmp1, 10) || 0) +
    (parseInt(raw.cmp2, 10) || 0) +
    (parseInt(raw.cmp3, 10) || 0) +
    (parseInt(raw.cmp4, 10) || 0) +
    (parseInt(raw.cmp5, 10) || 0);

  const totalChildren = kids + teens;

  return {
    income,
    education,
    marital,
    kids,
    teens,
    totalChildren,
    recency,
    wines,
    fruits,
    meat,
    fish,
    sweets,
    gold,
    totalSpending,
    webPurchases,
    catalogPurchases,
    storePurchases,
    dealsPurchases,
    totalPurchases,
    campaignsAccepted,
  };
}

// ── Normalisation helpers ────────────────────────────────────────────────────

/**
 * Clamp a value between [min, max] and normalise to [0, 1].
 */
function normalise(value, min, max) {
  if (max === min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/**
 * Inverted normalisation – higher raw value yields lower score (e.g. recency).
 */
function normaliseInverted(value, min, max) {
  return 1 - normalise(value, min, max);
}

// ── Formatting helpers ───────────────────────────────────────────────────────

/**
 * Format a number as a currency string.
 * @param {number} value
 * @returns {string}
 */
function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a decimal as a percentage string.
 * @param {number} value – 0‥1
 * @returns {string}
 */
function formatPercent(value) {
  return (value * 100).toFixed(1) + '%';
}

/**
 * Return today's date as an ISO string (date portion only).
 * @returns {string}
 */
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Generate a simple unique ID for each prediction record.
 * @returns {string}
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ── localStorage helpers ─────────────────────────────────────────────────────

const STORAGE_KEY = 'crm_predictions';

/**
 * Load all stored predictions.
 * @returns {Array}
 */
function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

/**
 * Persist a prediction record to history (max 100 entries).
 * @param {Object} record
 */
function saveToHistory(record) {
  const history = loadHistory();
  history.unshift(record);
  if (history.length > 100) history.length = 100;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

/**
 * Clear all stored predictions.
 */
function clearHistory() {
  localStorage.removeItem(STORAGE_KEY);
}

// ── CSV export ───────────────────────────────────────────────────────────────

/**
 * Convert an array of prediction records to a CSV string.
 * @param {Array} records
 * @returns {string}
 */
function recordsToCSV(records) {
  if (!records.length) return '';
  const headers = [
    'ID',
    'Date',
    'Tier',
    'Confidence',
    'Income',
    'TotalSpending',
    'Recency',
    'Education',
    'MaritalStatus',
    'TotalChildren',
    'CampaignsAccepted',
  ];
  const rows = records.map((r) => [
    r.id,
    r.date,
    r.tier,
    (r.confidence * 100).toFixed(1),
    r.features.income,
    r.features.totalSpending,
    r.features.recency,
    r.rawInputs.education,
    r.rawInputs.marital,
    r.features.totalChildren,
    r.features.campaignsAccepted,
  ]);
  return [headers, ...rows].map((row) => row.join(',')).join('\n');
}

/**
 * Trigger a browser download of a text file.
 * @param {string} content
 * @param {string} filename
 * @param {string} mimeType
 */
function downloadFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
