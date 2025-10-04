# bizgpt: AI-Powered Business Insights Dashboard

A web-based dashboard that allows non-technical users to analyze business datasets using **natural language queries (NLQ)**. The system automatically generates SQL queries, KPIs, predictions, anomaly detection, and visualizations based on user input.

---

## Features

- **Natural Language Query (NLQ) Interface**: Ask questions like "What is the average revenue?" or "Show sales trend over time" and get insights automatically.
- **KPI Generation**: Calculates key performance indicators from numeric columns in your dataset.
- **Time-Series Forecasting**: Predicts trends for primary metrics using historical data.
- **Anomaly Detection**: Flags anomalies in numeric metrics with severity levels.
- **Recommendations**: Generates actionable AI-powered suggestions based on anomalies and predictions.
- **Interactive Visualizations**:
  - Line Charts for trends
  - Bar Charts for top metrics
  - Pie Charts for categorical breakdowns
- **Role-Based Dashboard Views**: Sales, Marketing, Product, and Analyst dashboards with tailored insights.

---

## Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS, Lucide Icons
- **Backend**: Node.js / Express (for ML services simulation)
- **ML Services**: Time-series prediction, KPI calculation, anomaly detection (simulated)
- **State Management**: React Context (`DataContext` & `AuthContext`)
- **Data Handling**: JSON datasets from local storage

---

## Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/ai-business-dashboard.git
cd ai-business-dashboard
