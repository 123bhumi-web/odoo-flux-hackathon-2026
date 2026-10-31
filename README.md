# Brightloop Subscription Management System â€” SQL Edition
> **Odoo x FLUX Hackathon Project** based on the Brightloop Software Specification.

An enterprise-grade recurring billing, subscription orchestration, and default risk recovery engine powered by **React 18 (TypeScript) + Vite**, a **Standard SQL Database Engine (`brightloop.db`, SQL schemas, triggers, and stored procedures)**, and **Gravity AI** for behavioral risk scoring and automated payment recovery communications.

---

## ðŸŒŸ Highlights & Key Features

### 1. Standard SQL Database Backend (`brightloop.db`)
- **Direct SQL Architecture**: Migrated from third-party BaaS to a standard, portable SQL database engine powered by Node's native SQLite/PostgreSQL-compatible SQL executor.
- **SQL Tables**: `customers`, `products_plans`, `subscriptions`, `subscription_items`, `invoices`, `invoice_items`, `payments`, and `gravity_risk_logs`.
- **Interactive SQL Workbench**: Built-in developer console allowing operators and judges to execute raw SQL queries (`SELECT * FROM subscriptions`, `SELECT * FROM invoices WHERE status = 'overdue'`, etc.) and inspect real-time results.
- **Full Portability**: Standalone SQL files provided in `database/schema.sql`, `database/seed.sql`, and `database/billing_procedure.sql`.

### 2. Subscription Lifecycle State Machine (SQL Enforced)
Strict state transition constraints enforced both in the **SQL database layer** and in the **React UI**:
```
Draft â”€â”€â–º Quotation â”€â”€â–º Confirmed â”€â”€â–º Active â”€â”€â–º Closed / Paused
  â”‚            â”‚              â”‚          â–²             â–²
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ (Terminates to Closed)
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
- **Intelligent Scoring**: Evaluates delinquency risk (0â€“100 score) combining days past due, exposure ratio against customer credit limit, and historical default rating.
- **Risk Tiers**:
  - `Low (< 25)`: Diplomatic courtesy reminder.
  - `Medium (25â€“50)`: Structured payment notice with direct checkout link and payment plan option.
  - `High (51â€“75)`: Firm warning highlighting 48-hour service freeze grace period.
  - `Severe (> 75)`: Urgent executive suspension notice, temporary workspace hold, and settlement portal link.
- **Multi-Channel Dispatch**: Previews and transmits personalized recovery copy tailored for **Email**, **WhatsApp**, or **SMS**.
- **Audit Logging**: Persists risk evaluations and delivery status in `gravity_risk_logs` SQL table.

### 5. Brightloop Design System & Self-Service Customer Portal
- Custom responsive Brightloop UI styling (Indigo, Violet, and Slate theme with accessible contrast, interactive state steppers, metric trend pills, and data tables).
- **Customer Portal**: Lets customers inspect their provisioned licenses, download official GST receipts, request plan upgrades, and settle overdue invoices via instant UPI, Corporate Card, or Net Banking.

---

## ðŸ—ï¸ Directory Structure

```
brightloop-subscription-system/
â”œâ”€â”€ brightloop.db                     # Live standard SQL database file
â”œâ”€â”€ brightloop-subscription-demo.gif  # 11-scene animated demo walkthrough (1.5 MB)
â”œâ”€â”€ database/
â”‚   â”œâ”€â”€ schema.sql                    # Standard SQL DDL tables, constraints, indexes
â”‚   â”œâ”€â”€ seed.sql                      # Initial seed records (GSTIN customers, plans, invoices)
â”‚   â”œâ”€â”€ billing_procedure.sql         # SQL transaction logic for run_scheduled_billing
â”‚   â””â”€â”€ db.js                         # Node SQL database engine & query runner
â”œâ”€â”€ server.js                         # Standalone HTTP/REST API server (port 3001)
â”œâ”€â”€ vite.config.ts                    # Vite config with integrated SQL API middleware
â”œâ”€â”€ index.html
â”œâ”€â”€ package.json
â”œâ”€â”€ tsconfig.json
â””â”€â”€ src/
    â”œâ”€â”€ main.tsx                      # Application bootstrap
    â”œâ”€â”€ App.tsx                       # Main router & global notification coordinator
    â”œâ”€â”€ types/
    â”‚   â”œâ”€â”€ database.ts               # Database & entity typings
    â”‚   â””â”€â”€ models.ts                 # State transition constraints & Gravity AI contracts
    â”œâ”€â”€ lib/
    â”‚   â”œâ”€â”€ sqlClient.ts              # Standard SQL API database client
    â”‚   â”œâ”€â”€ mockData.ts               # Seed data fallback
    â”‚   â””â”€â”€ storage.ts                # Reactive state store syncing with SQL database
    â”œâ”€â”€ services/
    â”‚   â”œâ”€â”€ billingEngine.ts          # Scheduled billing execution
    â”‚   â””â”€â”€ gravityService.ts         # Gravity AI risk scoring & communication drafting
    â”œâ”€â”€ styles/
    â”‚   â””â”€â”€ brightloop.css            # Custom Brightloop UI design system tokens
    â””â”€â”€ components/
        â”œâ”€â”€ layout/
        â”‚   â”œâ”€â”€ Sidebar.tsx           # Navigation with SQL status & portal switcher
        â”‚   â””â”€â”€ Header.tsx            # Search, workspace selector & "Run Automated Billing"
        â”œâ”€â”€ common/
        â”‚   â”œâ”€â”€ Badge.tsx             # Color-coded status badge component
        â”‚   â”œâ”€â”€ Modal.tsx             # Accessible backdrop & dialog container
        â”‚   â”œâ”€â”€ StatCard.tsx          # Metric cards with trend indicators
        â”‚   â””â”€â”€ RiskModal.tsx         # Gravity AI assessment & recovery draft drawer
        â”œâ”€â”€ dashboard/
        â”‚   â””â”€â”€ DashboardView.tsx     # MRR/ARR analytics, risk radar & overdue table
        â”œâ”€â”€ subscriptions/
        â”‚   â””â”€â”€ SubscriptionsView.tsx # Lifecycle state machine & transition actions
        â”œâ”€â”€ quotations/
        â”‚   â””â”€â”€ QuotationsView.tsx    # Quote creation & 1-click subscription conversion
        â”œâ”€â”€ invoices/
        â”‚   â””â”€â”€ InvoicesView.tsx      # 18% GST invoices & Gravity AI trigger
        â”œâ”€â”€ payments/
        â”‚   â””â”€â”€ PaymentsView.tsx      # Payment logging & invoice reconciliation
        â”œâ”€â”€ customers/
        â”‚   â””â”€â”€ CustomersView.tsx     # Client directory, GSTINs, and credit limits
        â”œâ”€â”€ products/
        â”‚   â””â”€â”€ ProductsView.tsx      # Tier catalog, intervals, and features
        â”œâ”€â”€ portal/
        â”‚   â””â”€â”€ CustomerPortalView.tsx# Self-service client dashboard & instant pay
        â””â”€â”€ sql/
            â””â”€â”€ SqlConsoleView.tsx    # Interactive SQL Workbench to run raw SQL queries
```

---

## ðŸš€ Running the Project

```bash
# 1. Navigate to the project directory
cd C:\Users\Raunak\.gemini\antigravity\scratch\brightloop-subscription-system

# 2. Start the Vite full-stack dev server (Frontend + SQL API)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## ðŸŽ¬ Animated Demo GIF Walkthrough
The animated walkthrough file is ready to share with your friend:
- **Location**: `brightloop-subscription-demo.gif` (in project root)
- **Size**: **1.53 MB**
- Covers all 11 core scenes: Dashboard, Gravity AI Overdue Risk Analysis, WhatsApp Recovery Notice, SQL Billing Procedure Execution, Subscriptions State Machine, Quotations Conversion, 18% GST Invoices, **SQL Workbench with live query results**, Customer Portal, and Instant UPI Settlement.
## âš¡ Connecting to Live Supabase Backend

> **Authentication required before live use:** The schema enables RLS but intentionally creates no table access policies. This denies browser access until Supabase Auth and per-customer ownership policies are implemented. The app can still run in local demo mode; do not restore unrestricted `USING (true)` policies for production data.

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

## ðŸ§ª Hackathon Demo Walkthrough

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
   - Observe the invoice status instantly update to **PAID** and the balance due clear to â‚¹0!
