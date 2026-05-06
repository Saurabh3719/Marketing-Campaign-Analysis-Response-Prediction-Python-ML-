# Marketing Campaign Analysis & Response Prediction

## 📊 Project Overview

This project focuses on analyzing customer personality and predicting marketing campaign responses using machine learning techniques. The dataset comes from Kaggle and contains comprehensive customer demographics, income, spending patterns, and campaign response data.

---

## 🎯 Problem Statement

### Challenge
Many businesses struggle to effectively target their marketing campaigns due to:
- **Lack of customer segmentation**: Inability to identify distinct customer groups with different behaviors and preferences
- **Inefficient resource allocation**: Marketing budgets are spent on customers unlikely to respond
- **Poor campaign ROI**: Low conversion rates due to untargeted messaging and irrelevant offers
- **Customer heterogeneity**: Wide variation in customer demographics, spending capacity, and purchase behavior

### Business Impact
- Wasted marketing resources on unresponsive customer segments
- Missed opportunities to engage high-value customers
- Inability to personalize marketing strategies based on customer profiles
- Suboptimal customer lifetime value realization

### Solution Approach
This project leverages machine learning and data analysis to:
1. Identify patterns in customer behavior and demographics
2. Segment customers into meaningful clusters
3. Build predictive models to forecast campaign responses
4. Provide actionable insights for targeted marketing strategies

---

## 🎓 Objectives

### Primary Objectives
1. **Customer Segmentation Analysis**
   - Perform exploratory data analysis (EDA) on customer demographics, income, and spending patterns
   - Identify distinct customer clusters using unsupervised learning techniques
   - Characterize each segment by behavioral and demographic traits

2. **Predictive Modeling**
   - Build machine learning models to predict customer response to marketing campaigns
   - Compare multiple algorithms (Logistic Regression, Random Forest, XGBoost, etc.)
   - Optimize model performance using hyperparameter tuning and cross-validation
   - Evaluate models using appropriate metrics (accuracy, precision, recall, F1-score, AUC-ROC)

3. **Feature Engineering**
   - Create meaningful features from raw customer data
   - Identify the most influential variables affecting campaign response
   - Handle missing values and outliers appropriately
   - Encode categorical variables effectively

### Secondary Objectives
1. **Business Intelligence**
   - Generate insights about high-value customer segments
   - Identify key characteristics of responsive vs. non-responsive customers
   - Recommend personalized marketing strategies for different segments

2. **Model Interpretability**
   - Provide clear explanations of model predictions
   - Identify and visualize feature importance
   - Support business decision-making with data-driven recommendations

3. **Reproducibility & Documentation**
   - Create well-documented, modular code
   - Ensure reproducible results with proper random seeds
   - Provide clear visualizations and insights

---

## 📁 Dataset

**Source**: Kaggle

**Dataset Components**:
- **Customer Demographics**: Age, education level, marital status, location
- **Income & Spending**: Income, total spending across product categories, discount usage
- **Campaign Responses**: Response indicators for 5 different marketing campaigns
- **Customer Engagement**: Website visits, catalog purchases, store purchases, web purchases

---

## 🛠 Tech Stack

- **Language**: Python
- **Notebooks**: Jupyter Notebook
- **Data Processing**: Pandas, NumPy
- **Data Visualization**: Matplotlib, Seaborn, Plotly
- **Machine Learning**: Scikit-learn, XGBoost, CatBoost
- **Statistical Analysis**: SciPy, Statsmodels

---

## 📈 Expected Outcomes

1. **Segmentation Report**: Identification of 3-5 distinct customer clusters with defined characteristics
2. **Predictive Models**: High-performing model(s) with AUC-ROC > 0.75 for campaign response prediction
3. **Feature Insights**: Top 10-15 features driving campaign response
4. **Business Recommendations**: Actionable strategies for targeting specific customer segments
5. **Visualizations**: Comprehensive charts and dashboards for business stakeholder communication

---

## 🚀 Getting Started

### Prerequisites
```bash
pip install pandas numpy scikit-learn matplotlib seaborn plotly xgboost catboost jupyter
```

### Running the Notebooks
1. Clone the repository
2. Navigate to the project directory
3. Launch Jupyter Notebook: `jupyter notebook`
4. Open and execute the notebooks in sequence

---

## 📊 Project Structure

```
Marketing-Campaign-Analysis-Response-Prediction-Python-ML-/
├── README.md                          # Project documentation
├── CA2.ipynb                          # Jupyter notebook – EDA & ML analysis
├── marketing_campaign.csv             # Raw customer dataset (tab-separated)
│
│  ── Web Application ──
├── index.html                         # Main application page
├── styles.css                         # Responsive CSS (dark/light mode)
├── script.js                          # Form logic, charts & history
├── model.js                           # Client-side tier prediction engine
└── utils.js                           # Data processing helpers
```

---

## 🌐 CRM Customer Tier Prediction Web App

A fully client-side web application that lets CRM teams predict customer value tiers
(Premium / Standard / Basic / Low-Value) instantly in the browser — no server required.

### Features

| Feature | Details |
|---|---|
| **Tier Prediction** | Real-time scoring based on income, spending, recency, education, purchase frequency, and campaign engagement |
| **Confidence Score** | Softmax probability distribution across all four tiers |
| **Feature Scores** | Visual breakdown of each input dimension's contribution |
| **Recommendations** | Tier-specific CRM action items |
| **Charts** | Spending breakdown bar chart + tier distribution donut chart (Chart.js) |
| **Prediction History** | All predictions persisted in browser `localStorage` (up to 100 records) |
| **CSV Export** | Export history or individual results as `.csv` |
| **JSON Export** | Export detailed result payload as `.json` |
| **Batch Upload** | Upload a `marketing_campaign.csv`-format file to predict multiple rows at once |
| **Dark / Light Mode** | Toggle persisted per browser |
| **Responsive Design** | Mobile-first layout with CSS Grid/Flexbox |
| **No dependencies** | Vanilla HTML/CSS/JS — just open `index.html` in a browser |

### Running the Web App

Simply open `index.html` in any modern browser:

```bash
# Option 1 – Double-click index.html in your file manager

# Option 2 – Serve locally with Python
python -m http.server 8080
# then navigate to http://localhost:8080

# Option 3 – VS Code Live Server extension
```

### Tier Classification Logic

The prediction engine (`model.js`) computes a weighted composite score from six normalised dimensions:

| Dimension | Weight | Description |
|---|---|---|
| Income | 28 % | Annual household income vs dataset range (0–$120 k) |
| Spending | 30 % | Total annual product spending vs dataset range (0–$2 525) |
| Recency | 18 % | Days since last purchase (inverted – lower is better) |
| Purchase Frequency | 12 % | Web + catalogue + store purchases |
| Campaign Acceptance | 8 % | Number of campaigns accepted (0–5) |
| Education | 4 % | Education level ordinal encoding |

**Tier thresholds:**

| Tier | Score |
|---|---|
| 👑 Premium | ≥ 0.65 |
| ⭐ Standard | ≥ 0.38 |
| 🌱 Basic | ≥ 0.18 |
| 🔔 Low-Value | < 0.18 |

### Input Fields

- **Education**: Basic / 2nd Cycle / Graduation / Master / PhD
- **Marital Status**: Single / Married / Together / Divorced / Widow
- **Kids & Teens at Home**: 0–3 each
- **Annual Income**: in USD
- **Recency**: days since last purchase
- **Spending**: annual amounts for Wines, Fruits, Meat, Fish, Sweets, Gold
- **Purchase Channels**: Web, Catalogue, Store purchases; Deals used
- **Campaigns Accepted**: checkboxes for Campaigns 1–5

### Batch CSV Upload

Upload a tab-separated CSV matching the `marketing_campaign.csv` schema.
Required columns: `Income`, `Kidhome`, `Teenhome`, `Recency`, `Education`, `Marital_Status`,
`MntWines`, `MntFruits`, `MntMeatProducts`, `MntFishProducts`, `MntSweetProducts`, `MntGoldProds`,
`NumWebPurchases`, `NumCatalogPurchases`, `NumStorePurchases`, `NumDealsPurchases`,
`AcceptedCmp1`–`AcceptedCmp5`.

### Technical Stack (Web App)

- **HTML5** – semantic structure
- **CSS3** – custom properties, flexbox/grid, dark mode via `data-theme` attribute
- **Vanilla JavaScript (ES2020)** – no frameworks or jQuery
- **Chart.js 4** – visualisations (loaded from CDN)
- **localStorage** – client-side persistence

---

## 🔍 Key Questions Addressed

- What are the main characteristics of high-value customers?
- Which customer segments are most responsive to marketing campaigns?
- What features are most predictive of campaign response?
- How can marketing budgets be optimized across different customer segments?
- Which marketing channels (catalog, web, store) are most effective for different segments?

---

## 📝 Author & License

**Repository**: Saurabh3719/Marketing-Campaign-Analysis-Response-Prediction-Python-ML-

**Data Source**: Kaggle - Marketing Campaign Dataset

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for improvements and suggestions.

---

## 📧 Contact

For questions or collaboration inquiries, please reach out via GitHub.

---

**Last Updated**: 2026-04-26
