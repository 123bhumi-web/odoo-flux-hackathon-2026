# Brightloop Subscription Management System — SQL Edition
> **Odoo x FLUX Hackathon Project** based on the Brightloop Software Specification.

An enterprise-grade recurring billing, subscription orchestration, and default risk recovery engine powered by **React 18 (TypeScript) + Vite**, a **Standard SQL Database Engine (`brightloop.db`, SQL schemas, triggers, and stored procedures)**, and **Gravity AI** for behavioral risk scoring and automated payment recovery communications.

---

## 🌟 Highlights & Key Features

### 1. Standard SQL Database Backend (`brightloop.db`)
- **Direct SQL Architecture**: Migrated from third-party BaaS to a standard, portable SQL database engine powered by Node's native SQLite/PostgreSQL-compatible SQL executor.
- **SQL Tables**: `customers`, `products_plans`, `subscriptions`, `subscription_items`, `invoices`, `invoice_items`, `payments`, and `gravity_risk_logs`.
- **Interactive SQL Workbench**: Built-in developer console allowing operators and judges to execute raw SQL queries (`SELECT * FROM subscriptions`, `SELECT * FROM invoices WHERE status = 'overdue'`, etc.) and inspect real-time results.
- **Full Portability**: Standalone SQL files provided in `database/schema.sql`, `database/seed.sql`, and `database/billing_procedure.sql`.

### 2. Subscription Lifecycle State Machine (SQL Enforced)
Strict state transition constraints enforced both in the **SQL database layer** and in the **React UI**:
```
Draft ──► Quotation ──► Confirmed ──► Active ──► Closed / Paused
  │            │              │          ▲             ▲
  └────────────┴──────────────┴──────────┴─────────────┘ (Terminates to Closed)
```
- **Draft**: Unconfirmed proposal; items, licenses, and custom discounts can be edited.
- **Quotation**: Formal customer quotation with 15-day validity, PDF export, and 18% GST breakdown.
- **Confirmed**: Signed order awaiting workspace provisioning and billing activation.
- **Active**: Actively scanned by the recurring billing engine.
- **Paused**: Temporary credit or customer hold; excluded from scheduled billing runs until resumed.
- **Closed**: Terminal state; recurring charges permanently ceased.

### 3. Scheduled Billing Procedure in SQL (`run_scheduled_billing`)
- **Automated Scanning**: Scans active subscriptions where `status = 'active'` and `next_billing_date <= CURRENT_DATE`.
- **Anti-Collision Guard**: Validates `UNIQUE(subscription_id, period_start, period_end)` so duplicate invoices are never generated for the same billing cycle.
- **Indian GST Compliance**: Automatically computes taxable subtotal, **18% GST** (9% CGST + 9% SGST or 18% IGST), and total balance due with standard SAC code `998313`.
- **Date Advancement**: Automatically advances `current_period_start`, `current_period_end`, and `next_billing_date` based on cycle interval (`monthly`, `quarterly`, or `annually`).

### 4. Gravity AI Default Risk & Personalized Recovery Desk
- **Intelligent Scoring**: Evaluates delinquency risk (0–100 score) combining days past due, exposure ratio against customer credit limit, and historical default rating.
- **Risk Tiers**:
  - `Low (< 25)`: Diplomatic courtesy reminder.
  - `Medium (25–50)`: Structured payment notice with direct checkout link and payment plan option.
  - `High (51–75)`: Firm warning highlighting 48-hour service freeze grace period.
  - `Severe (> 75)`: Urgent executive suspension notice, temporary workspace hold, and settlement portal link.
- **Multi-Channel Dispatch**: Previews and transmits personalized recovery copy tailored for **Email**, **WhatsApp**, or **SMS**.
- **Audit Logging**: Persists risk evaluations and delivery status in `gravity_risk_logs` SQL table.

### 5. Brightloop Design System & Self-Service Customer Portal
- Custom responsive Brightloop UI styling (Indigo, Violet, and Slate theme with accessible contrast, interactive state steppers, metric trend pills, and data tables).
- **Customer Portal**: Lets customers inspect their provisioned licenses, download official GST receipts, request plan upgrades, and settle overdue invoices via instant UPI, Corporate Card, or Net Banking.

---

## 🏗️ Directory Structure

```
brightloop-subscription-system/
├── brightloop.db                     # Live standard SQL database file
├── brightloop-subscription-demo.gif  # 11-scene animated demo walkthrough (1.5 MB)
├── database/
│   ├── schema.sql                    # Standard SQL DDL tables, constraints, indexes
│   ├── seed.sql                      # Initial seed records (GSTIN customers, plans, invoices)
│   ├── billing_procedure.sql         # SQL transaction logic for run_scheduled_billing
│   └── db.js                         # Node SQL database engine & query runner
├── server.js                         # Standalone HTTP/REST API server (port 3001)
├── vite.config.ts                    # Vite config with integrated SQL API middleware
├── index.html
├── package.json
├── tsconfig.json
└── src/
    ├── main.tsx                      # Application bootstrap
    ├── App.tsx                       # Main router & global notification coordinator
    ├── types/
    │   ├── database.ts               # Database & entity typings
    │   └── models.ts                 # State transition constraints & Gravity AI contracts
    ├── lib/
    │   ├── sqlClient.ts              # Standard SQL API database client
    │   ├── mockData.ts               # Seed data fallback
    │   └── storage.ts                # Reactive state store syncing with SQL database
    ├── services/
    │   ├── billingEngine.ts          # Scheduled billing execution
    │   └── gravityService.ts         # Gravity AI risk scoring & communication drafting
    ├── styles/
    │   └── brightloop.css            # Custom Brightloop UI design system tokens
    └── components/
        ├── layout/
        │   ├── Sidebar.tsx           # Navigation with SQL status & portal switcher
        │   └── Header.tsx            # Search, workspace selector & "Run Automated Billing"
        ├── common/
        │   ├── Badge.tsx             # Color-coded status badge component
        │   ├── Modal.tsx             # Accessible backdrop & dialog container
        │   ├── StatCard.tsx          # Metric cards with trend indicators
        │   └── RiskModal.tsx         # Gravity AI assessment & recovery draft drawer
        ├── dashboard/
        │   └── DashboardView.tsx     # MRR/ARR analytics, risk radar & overdue table
        ├── subscriptions/
        │   └── SubscriptionsView.tsx # Lifecycle state machine & transition actions
        ├── quotations/
        │   └── QuotationsView.tsx    # Quote creation & 1-click subscription conversion
        ├── invoices/
        │   └── InvoicesView.tsx      # 18% GST invoices & Gravity AI trigger
        ├── payments/
        │   └── PaymentsView.tsx      # Payment logging & invoice reconciliation
        ├── customers/
        │   └── CustomersView.tsx     # Client directory, GSTINs, and credit limits
        ├── products/
        │   └── ProductsView.tsx      # Tier catalog, intervals, and features
        ├── portal/
        │   └── CustomerPortalView.tsx# Self-service client dashboard & instant pay
        └── sql/
            └── SqlConsoleView.tsx    # Interactive SQL Workbench to run raw SQL queries
```

---

## 🚀 Running the Project

```bash
# 1. Navigate to the project directory
cd C:\Users\Raunak\.gemini\antigravity\scratch\brightloop-subscription-system

# 2. Start the Vite full-stack dev server (Frontend + SQL API)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🎬 Animated Demo GIF Walkthrough
The animated walkthrough file is ready to share with your friend:
- **Location**: `brightloop-subscription-demo.gif` (in project root)
- **Size**: **1.53 MB**
- Covers all 11 core scenes: Dashboard, Gravity AI Overdue Risk Analysis, WhatsApp Recovery Notice, SQL Billing Procedure Execution, Subscriptions State Machine, Quotations Conversion, 18% GST Invoices, **SQL Workbench with live query results**, Customer Portal, and Instant UPI Settlement.
