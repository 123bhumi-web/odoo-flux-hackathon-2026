-- ====================================================================
-- Brightloop Subscription Management System - Standard SQL Schema
-- Target: SQL Database (PostgreSQL / SQLite / MySQL compatible)
-- ====================================================================

-- 1. Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  company TEXT,
  gstin TEXT, -- Indian GST Identification Number (15 digits)
  billing_address TEXT NOT NULL, -- JSON formatted string
  credit_limit REAL DEFAULT 100000.00,
  default_payment_method TEXT DEFAULT 'bank_transfer',
  risk_score REAL DEFAULT 12.50, -- 0 - 100 default risk rating
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 2. Products / Plans Catalog Table
CREATE TABLE IF NOT EXISTS products_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  interval TEXT NOT NULL DEFAULT 'monthly', -- 'monthly', 'quarterly', 'annually'
  unit_amount REAL NOT NULL,
  currency TEXT DEFAULT 'INR',
  gst_rate REAL DEFAULT 0.18, -- 18% GST (CGST 9% + SGST 9% / IGST 18%)
  is_active INTEGER DEFAULT 1,
  features TEXT DEFAULT '[]', -- JSON array of feature descriptions
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 3. Subscriptions Table
-- Enforces State Transitions: Draft -> Quotation -> Confirmed -> Active -> Closed/Paused
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  subscription_number TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  plan_id TEXT NOT NULL REFERENCES products_plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'quotation', 'confirmed', 'active', 'paused', 'closed'
  billing_interval TEXT NOT NULL DEFAULT 'monthly',
  current_period_start TEXT NOT NULL,
  current_period_end TEXT NOT NULL,
  next_billing_date TEXT NOT NULL,
  last_billed_date TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL,
  discount_percentage REAL DEFAULT 0.00,
  subtotal REAL NOT NULL DEFAULT 0.00,
  tax_rate REAL NOT NULL DEFAULT 0.18,
  tax_amount REAL NOT NULL DEFAULT 0.00,
  total_amount REAL NOT NULL DEFAULT 0.00,
  currency TEXT DEFAULT 'INR',
  auto_renew INTEGER DEFAULT 1,
  notes TEXT,
  paused_at TEXT,
  closed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 4. Subscription Line Items Table
CREATE TABLE IF NOT EXISTS subscription_items (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  item_type TEXT DEFAULT 'plan', -- 'plan', 'addon', 'setup_fee'
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL,
  subtotal REAL NOT NULL,
  tax_amount REAL NOT NULL,
  total_amount REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 5. Invoices Table
-- Note: UNIQUE(subscription_id, period_start, period_end) prevents duplicate billing periods!
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  subscription_id TEXT REFERENCES subscriptions(id) ON DELETE SET NULL,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'posted', 'paid', 'overdue', 'void'
  issue_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  subtotal REAL NOT NULL DEFAULT 0.00,
  tax_rate REAL NOT NULL DEFAULT 0.18,
  tax_amount REAL NOT NULL DEFAULT 0.00,
  total_amount REAL NOT NULL DEFAULT 0.00,
  amount_paid REAL NOT NULL DEFAULT 0.00,
  balance_due REAL NOT NULL DEFAULT 0.00,
  currency TEXT DEFAULT 'INR',
  notes TEXT,
  payment_terms TEXT DEFAULT 'Net 15 Days',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  CONSTRAINT unique_sub_billing_period UNIQUE (subscription_id, period_start, period_end)
);

-- 6. Invoice Line Items Table
CREATE TABLE IF NOT EXISTS invoice_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL,
  amount REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 7. Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  payment_number TEXT NOT NULL UNIQUE,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'INR',
  payment_date TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer', -- 'credit_card', 'upi', 'bank_transfer', 'stripe', 'net_banking'
  status TEXT NOT NULL DEFAULT 'completed',
  transaction_reference TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 8. Gravity AI Risk & Communication Audit Logs Table
CREATE TABLE IF NOT EXISTS gravity_risk_logs (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  default_risk_score REAL NOT NULL,
  risk_level TEXT NOT NULL, -- 'low', 'medium', 'high', 'severe'
  days_overdue INTEGER NOT NULL DEFAULT 0,
  recommended_action TEXT NOT NULL,
  generated_recovery_message TEXT NOT NULL,
  communication_channel TEXT DEFAULT 'email',
  message_status TEXT DEFAULT 'drafted', -- 'drafted', 'sent', 'acknowledged'
  analyzed_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_subs_customer ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subs_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_sub ON invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
