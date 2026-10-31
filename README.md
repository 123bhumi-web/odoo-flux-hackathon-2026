# Brightloop Subscription Management System
> **Odoo x FLUX Hackathon Project** based on the Brightloop Software Specification.

An enterprise-grade recurring billing, subscription orchestration, and default risk recovery engine powered by **React (TypeScript) + Vite**, **Supabase (PostgreSQL, RLS, Stored Procedures, Edge Functions)**, and **Gravity AI** for behavioral risk scoring and automated payment recovery communications.

---

## 🌟 Highlights & Key Features

### 1. Subscription Lifecycle State Machine
Strict state transition constraints enforced both at the **database level** (PostgreSQL triggers) and in the **React UI**:
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

### 2. Scheduled Billing Engine (`run_scheduled_billing`)
- **Automated Scanning**: Scans all subscriptions where `status = 'active'` and `next_billing_date <= CURRENT_DATE`.
- **Anti-Collision Guard**: Strictly validates `(subscription_id, period_start, period_end)` uniqueness to ensure duplicate invoices are never generated for the same billing cycle.
- **Indian GST Compliance**: Automatically computes taxable subtotal, **18% GST** (9% CGST + 9% SGST or 18% IGST), and total balance due with standard SAC code `998313`.
- **Date Advancement**: Automatically advances `current_period_start`, `current_period_end`, and `next_billing_date` based on cycle interval (`monthly`, `quarterly`, or `annually`).

### 3. Gravity AI Default Risk & Personalized Recovery Desk
- **Intelligent Scoring**: Evaluates delinquency risk (0–100 score) combining days past due, exposure ratio against customer credit limit, and historical default rating.
- **Risk Tiers**:
  - `Low (< 25)`: Diplomatic courtesy reminder.
  - `Medium (25–50)`: Structured payment notice with direct checkout link and payment plan option.
  - `High (51–75)`: Firm warning highlighting 48-hour service freeze grace period.
  - `Severe (> 75)`: Urgent executive suspension notice, temporary workspace hold, and settlement portal link.
- **Multi-Channel Dispatch**: Previews and transmits personalized recovery copy tailored for **Email**, **WhatsApp**, or **SMS**.
- **Audit Logging**: Persists risk evaluations and delivery status in `gravity_risk_logs`.

### 4. Brightloop Design System & Self-Service Customer Portal
- Custom responsive Brightloop UI styling (Indigo, Violet, and Slate theme with accessible contrast, interactive state steppers, metric trend pills, and data tables).
- **Customer Portal**: Lets customers inspect their provisioned licenses, download official GST receipts, request plan upgrades, and settle overdue invoices via instant UPI, Corporate Card, or Net Banking.

---

## 🏗️ Directory Structure

```
brightloop-subscription-system/
├── .env                              # Environment configuration (Supabase & Gravity AI)
├── .env.example
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── supabase/
│   ├── schema.sql                    # PostgreSQL tables, enums, triggers, and RLS policies
│   ├── seed.sql                      # Seed data with GST customers, plans, and overdue invoices
│   └── functions/
│       ├── run_scheduled_billing.sql # Stored procedure for automated 18% GST recurring billing
│       └── run-scheduled-billing/
│           └── index.ts              # Supabase Deno Edge Function (cron/webhook runner)
└── src/
    ├── main.tsx                      # Application bootstrap
    ├── App.tsx                       # Main router & global notification coordinator
    ├── vite-env.d.ts                 # TypeScript environment types
    ├── types/
    │   ├── database.ts               # Supabase Database & entity typings
    │   └── models.ts                 # State transition constraints & Gravity AI contracts
    ├── lib/
    │   ├── supabaseClient.ts         # @supabase/supabase-js client initialization
    │   ├── mockData.ts               # Seed data for immediate out-of-the-box demo
    │   └── storage.ts                # Reactive state store with Supabase sync & localStorage
    ├── services/
    │   ├── billingEngine.ts          # Client-side billing cycle orchestration
    │   └── gravityService.ts         # Gravity AI risk scoring & communication drafting
    ├── styles/
    │   └── brightloop.css            # Custom Brightloop UI design system tokens
    └── components/
        ├── layout/
        │   ├── Sidebar.tsx           # Navigation with real-time badges & portal switcher
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
        └── portal/
            └── CustomerPortalView.tsx# Self-service client dashboard & instant pay
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (tested on Node v24)
- npm or pnpm

### Quick Start (Out-of-the-Box Demo Mode)
The project comes pre-configured with a **High-Fidelity Reactive Engine** containing complete seed data (active subscriptions, overdue invoices with days-past-due triggers, and customers with Indian GSTIN numbers). You can run it immediately without setting up a database:

```bash
# 1. Navigate to the project directory
cd brightloop-subscription-system

# 2. Start the Vite development server
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## ⚡ Connecting to Live Supabase Backend

To connect directly to your live Supabase project:

1. **Create a Supabase Project**:
   Go to [supabase.com](https://supabase.com) and create a new project.

2. **Execute Schema & Stored Procedure**:
   - In your Supabase Dashboard, navigate to the **SQL Editor**.
   - Copy and execute the contents of `supabase/schema.sql`.
   - Copy and execute the contents of `supabase/functions/run_scheduled_billing.sql`.
   - (Optional) Copy and execute `supabase/seed.sql` to populate sample data.

3. **Configure Environment Variables**:
   In your `.env` file, enter your project URL and public Anon Key:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   VITE_GRAVITY_AI_API_KEY=grav_live_demo_key_9831a8
   VITE_GRAVITY_AI_API_ENDPOINT=https://api.gravityai.internal/v1/risk-recovery
   ```

4. **Deploy Edge Function (Optional for automated Cron / Webhook billing)**:
   ```bash
   supabase functions deploy run-scheduled-billing
   ```

---

## 🧪 Hackathon Demo Walkthrough

1. **Dashboard Overview**:
   - Check the **MRR** (Monthly Recurring Revenue) and **ARR** tiles.
   - Note the **Gravity AI Risk Radar** highlighting delinquent accounts like *Hyperion Retail Logistics*.

2. **Gravity AI Risk Evaluation**:
   - Click **"Evaluate Risk"** on the overdue invoice `INV-202609-1002`.
   - Inspect the **Default Risk Score** (82/100, High/Severe).
   - Review the identified risk drivers (days past due, credit exposure ratio).
   - Toggle between **Email**, **WhatsApp**, and **SMS** tabs to review personalized AI-drafted payment recovery communications.
   - Click **"Send Recovery Reminder"** to simulate dispatch and audit logging.

3. **Automated Scheduled Billing (`run_scheduled_billing`)**:
   - Click the top **"Run Automated Billing"** button in the header.
   - Watch the engine scan active subscriptions, compute subtotal and **18% GST**, generate `INV-YYYYMM-XXXX` invoices without duplicate collisions, and advance `next_billing_date` by the billing interval.

4. **Subscription Lifecycle State Transitions**:
   - Navigate to **Subscriptions**.
   - Click on a **Draft** subscription -> Click **"Send Quotation"**.
   - Move to **Quotations** -> Review terms -> Click **"Convert to Sub"** (advances to **Confirmed**).
   - Click **"Activate Subscription"** to make it billable.
   - Test pausing and resuming subscriptions with the visual state stepper.

5. **Customer Self-Service Portal**:
   - Click **Customer Portal** in the sidebar.
   - Switch persona to *Vikramaditya Roy (Hyperion Retail Logistics)*.
   - Notice the red delinquent alert banner.
   - Click **"Pay Balance Now"** -> Select **UPI** or **Corporate Card** -> Confirm instant settlement.
   - Observe the invoice status instantly update to **PAID** and the balance due clear to ₹0!
