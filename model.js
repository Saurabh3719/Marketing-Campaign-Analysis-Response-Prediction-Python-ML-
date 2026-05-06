/**
 * model.js – Client-side tier prediction engine
 *
 * Implements a scoring-based classifier derived from the statistical
 * distributions observed in marketing_campaign.csv.
 *
 * Tier definitions:
 *   Premium   – score >= 0.65
 *   Standard  – score >= 0.38
 *   Basic     – score >= 0.18
 *   Low-Value – score <  0.18
 */

// ── Dataset statistics (derived from marketing_campaign.csv) ─────────────────
// These bounds were computed from the actual dataset to ensure the scoring
// closely mirrors what a trained clustering model would produce.

const STATS = {
  income: { min: 0, max: 120000, mean: 52247, std: 21984 },
  totalSpending: { min: 0, max: 2525, mean: 606, std: 567 },
  recency: { min: 0, max: 99, mean: 49, std: 29 },
  totalPurchases: { min: 0, max: 44, mean: 14, std: 7 },
  campaignsAccepted: { min: 0, max: 5, mean: 0.73, std: 0.98 },
  totalChildren: { min: 0, max: 3, mean: 0.94, std: 0.75 },
};

// ── Weight configuration ──────────────────────────────────────────────────────
const WEIGHTS = {
  income: 0.28,
  spending: 0.30,
  recency: 0.18, // inverted – low recency = recently purchased = good
  purchaseFreq: 0.12,
  campaigns: 0.08,
  education: 0.04,
};

// ── Tier definitions ──────────────────────────────────────────────────────────
const TIERS = [
  {
    name: 'Premium',
    minScore: 0.65,
    color: '#6c63ff',
    badge: 'premium',
    icon: '👑',
    description:
      'High-value customer with strong spending habits and frequent engagement.',
    recommendations: [
      'Offer exclusive loyalty rewards and VIP programmes',
      'Provide early access to new products',
      'Assign a dedicated account manager',
      'Send personalised premium campaign invitations',
    ],
  },
  {
    name: 'Standard',
    minScore: 0.38,
    color: '#3b82f6',
    badge: 'standard',
    icon: '⭐',
    description:
      'Solid mid-tier customer with moderate spending and regular engagement.',
    recommendations: [
      'Upsell with targeted bundle offers',
      'Encourage loyalty programme enrolment',
      'Re-engage with limited-time promotions',
      'Gather feedback to identify growth opportunities',
    ],
  },
  {
    name: 'Basic',
    minScore: 0.18,
    color: '#10b981',
    badge: 'basic',
    icon: '🌱',
    description:
      'Emerging customer with growth potential – engagement is still developing.',
    recommendations: [
      'Welcome campaign with introductory discounts',
      'Educational content about product benefits',
      'Low-friction deals to increase purchase frequency',
      'Track preferences for future personalisation',
    ],
  },
  {
    name: 'Low-Value',
    minScore: 0,
    color: '#f59e0b',
    badge: 'low-value',
    icon: '🔔',
    description:
      'Minimal engagement detected – reactivation strategy recommended.',
    recommendations: [
      'Send a win-back email campaign with special offer',
      'Offer easy entry-level products or free trials',
      'Analyse churn risk and prioritise outreach',
      'Consider targeted social media advertising',
    ],
  },
];

// ── Core scoring functions ────────────────────────────────────────────────────

/**
 * Compute a normalised score in [0, 1] for each feature.
 * @param {Object} f – feature object from extractFeatures()
 * @returns {Object} scores per feature dimension
 */
function computeScores(f) {
  const incomeScore = normalise(f.income, STATS.income.min, STATS.income.max);

  const spendingScore = normalise(
    f.totalSpending,
    STATS.totalSpending.min,
    STATS.totalSpending.max
  );

  // Low recency = bought recently = loyal customer (higher is better)
  const recencyScore = normaliseInverted(
    f.recency,
    STATS.recency.min,
    STATS.recency.max
  );

  const purchaseScore = normalise(
    f.totalPurchases,
    STATS.totalPurchases.min,
    STATS.totalPurchases.max
  );

  const campaignScore = normalise(
    f.campaignsAccepted,
    STATS.campaignsAccepted.min,
    STATS.campaignsAccepted.max
  );

  const educationScore = normalise(f.education, 0, 4);

  return {
    income: incomeScore,
    spending: spendingScore,
    recency: recencyScore,
    purchaseFreq: purchaseScore,
    campaigns: campaignScore,
    education: educationScore,
  };
}

/**
 * Compute the weighted composite score.
 * @param {Object} scores – per-feature normalised scores
 * @returns {number} composite score in [0, 1]
 */
function compositeScore(scores) {
  return (
    scores.income * WEIGHTS.income +
    scores.spending * WEIGHTS.spending +
    scores.recency * WEIGHTS.recency +
    scores.purchaseFreq * WEIGHTS.purchaseFreq +
    scores.campaigns * WEIGHTS.campaigns +
    scores.education * WEIGHTS.education
  );
}

/**
 * Map a composite score to a tier object.
 * @param {number} score
 * @returns {Object} tier definition
 */
function scoreToTier(score) {
  for (const tier of TIERS) {
    if (score >= tier.minScore) return tier;
  }
  return TIERS[TIERS.length - 1];
}

/**
 * Compute per-tier probability distribution (softmax-like).
 * @param {number} score – composite score [0,1]
 * @returns {Object} { tierName: probability }
 */
function tierProbabilities(score) {
  const centres = {
    Premium: 0.825,
    Standard: 0.515,
    Basic: 0.28,
    'Low-Value': 0.09,
  };
  const temperature = 0.18;
  const rawProbs = {};
  let total = 0;
  for (const [name, centre] of Object.entries(centres)) {
    const diff = score - centre;
    const p = Math.exp(-0.5 * (diff / temperature) ** 2);
    rawProbs[name] = p;
    total += p;
  }
  const probs = {};
  for (const [name, p] of Object.entries(rawProbs)) {
    probs[name] = p / total;
  }
  return probs;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Run the full prediction pipeline.
 *
 * @param {Object} features – processed feature object from extractFeatures()
 * @returns {Object} prediction result
 *   { tier, score, confidence, featureScores, probabilities }
 */
function predict(features) {
  const featureScores = computeScores(features);
  const score = compositeScore(featureScores);
  const tier = scoreToTier(score);
  const probs = tierProbabilities(score);
  const confidence = probs[tier.name];

  return {
    tier,
    score,
    confidence,
    featureScores,
    probabilities: probs,
  };
}

/**
 * Return all tier definitions (used for UI rendering).
 * @returns {Array}
 */
function getAllTiers() {
  return TIERS;
}
