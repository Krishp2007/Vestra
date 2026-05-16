# 📊 Assets View — Family Investment Management & Analytics System

> A personal finance intelligence system for families that turns scattered and imperfect investment data into clear, actionable insights.

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  React Frontend │────▶│  Express Backend  │────▶│  Python Flask   │
│  (Port 5173)    │     │  (Port 5000)      │     │  (Port 5001)    │
│                 │     │                   │     │                 │
│  • Dashboard    │     │  • REST API       │     │  • CSV Parser   │
│  • SIP/FD/Stock │     │  • JWT Auth       │     │  • Calculator   │
│  • Charts       │     │  • MongoDB        │     │  • Insights     │
│  • Upload       │     │  • Cron Jobs      │     │  • Anomaly Det  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+
- **Python** 3.9+
- **MongoDB** (local or [MongoDB Atlas](https://www.mongodb.com/atlas) free tier)

### 1. Backend (Express.js)
```bash
cd server
npm install
# Create your local environment file
cp .env.example .env
# Edit .env with your MongoDB URI & JWT Secret (Do NOT commit .env to GitHub)
node server.js
# ✅ Runs on http://localhost:5000
```

### 2. Frontend (React + Vite)
```bash
cd client
npm install
npm run dev
# ✅ Runs on http://localhost:5173
```

### 3. Python Analytics (Flask)
```bash
cd analytics

# Create a secure virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies securely inside venv
pip install -r requirements.txt

# Run the server
python app.py
# ✅ Runs on http://localhost:5001
```

> **⚠️ SECURITY WARNING FOR GITHUB:**  
> Ensure your `.env`, `credentials.json`, `node_modules`, and `venv` folders are listed in your `.gitignore` files before pushing to GitHub. This prevents your database keys and API tokens from being leaked publicly. The `.gitignore` files have already been fortified across `client`, `server`, and `analytics` to help protect your secrets.

## 📁 Project Structure

```
Assests_View/
├── client/          # React frontend (Vite)
│   └── src/
│       ├── pages/       # Dashboard, SIP, FD, Stock, etc.
│       ├── components/  # Layout, UI components
│       ├── store/       # Zustand state management
│       └── utils/       # API client, helpers
│
├── server/          # Express.js backend
│   ├── models/      # Mongoose schemas
│   ├── routes/      # API routes
│   ├── controllers/ # Business logic
│   ├── middleware/   # JWT auth
│   └── cron/        # Scheduled jobs
│
└── analytics/       # Python Flask service
    └── services/    # CSV parser, calculator, insights
```

## ✨ Features
- 👨‍👩‍👧‍👦 **Multi-user family tracking** — Track investments for all family members
- 📈 **SIP Management** — Track mutual funds with payment history
- 🏦 **FD Tracking** — Auto-calculate maturity with compound interest
- 📉 **Stock Portfolio** — Live price updates via Yahoo Finance
- 📤 **Bulk Upload** — Import CSV/Excel data with pandas
- 💡 **Smart Insights** — Rule-based financial analysis
- 🔔 **Automated Alerts** — SIP due dates, FD maturity reminders
- 📊 **Visual Dashboards** — Charts, allocation donuts, trend bars
- 🔐 **JWT Authentication** — Secure login/register

## 🛠️ Tech Stack
| Layer | Technology |
|:------|:-----------|
| Frontend | React, Vite, Recharts, Zustand |
| Backend | Node.js, Express.js, Mongoose |
| Database | MongoDB |
| Analytics | Python, Flask, pandas, numpy |
| Auth | JWT + bcrypt |
