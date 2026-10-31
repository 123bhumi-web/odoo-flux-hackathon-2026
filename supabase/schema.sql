-- ====================================================================
-- Brightloop Subscription Management System Schema
-- Odoo x FLUX Hackathon Specification
-- PostgreSQL / Supabase Schema with RLS, Constraints, and Procedures
-- ====================================================================

-- 1. Create Enums
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM (
    'draft', 
    'quotation', 
    'confirmed', 
    'active', 
    'paused', 
    'closed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM (
    'draft', 
    'posted', 
    'paid', 
    'overdue', 
    'void'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE billing_interval AS ENUM (
    'monthly', 
    'quarterly', 
    'annually'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM (
    'credit_card', 
    'upi', 
    'bank_transfer', 
    'stripe', 
    'net_banking'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE risk_level AS ENUM (
    'low', 
    'medium', 
    'high', 
    'severe'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50),
  company VARCHAR(255),
  gstin VARCHAR(20), -- Indian GST Identification Number
  billing_address JSONB NOT NULL DEFAULT '{"street": "", "city": "", "state": "", "pincode": "", "country": "India"}'::jsonb,
  credit_limit NUMERIC(12, 2) DEFAULT 100000.00,
  default_payment_method payment_method DEFAULT 'bank_transfer',
  risk_score NUMERIC(5, 2) DEFAULT 12.50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Products / Plans Table
CREATE TABLE IF NOT EXISTS products_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  interval billing_interval NOT NULL DEFAULT 'monthly',
  unit_amount NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  gst_rate NUMERIC(4, 2) DEFAULT 0.18, -- 18% GST (CGST 9% + SGST 9% / IGST 18%)
  is_active BOOLEAN DEFAULT TRUE,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_number VARCHAR(50) NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  plan_id UUID NOT NULL REFERENCES products_plans(id) ON DELETE RESTRICT,
  status subscription_status NOT NULL DEFAULT 'draft',
  billing_interval billing_interval NOT NULL DEFAULT 'monthly',
  current_period_start DATE NOT NULL DEFAULT CURRENT_DATE,
  current_period_end DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 month')::date,
  next_billing_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 month')::date,
  last_billed_date DATE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  discount_percentage NUMERIC(5, 2) DEFAULT 0.00 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  tax_rate NUMERIC(4, 2) NOT NULL DEFAULT 0.18,
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(10) DEFAULT 'INR',
  auto_renew BOOLEAN DEFAULT TRUE,
  notes TEXT,
  paused_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Subscription Line Items Table
CREATE TABLE IF NOT EXISTS subscription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  item_type VARCHAR(50) DEFAULT 'plan', -- 'plan', 'addon', 'setup_fee'
  description VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL,
  subtotal NUMERIC(12, 2) NOT NULL,
  tax_amount NUMERIC(12, 2) NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  status invoice_status NOT NULL DEFAULT 'draft',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '15 days')::date,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  tax_rate NUMERIC(4, 2) NOT NULL DEFAULT 0.18,
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  balance_due NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(10) DEFAULT 'INR',
  notes TEXT,
  payment_terms VARCHAR(100) DEFAULT 'Net 15 Days',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure no duplicate invoice for the same subscription and billing cycle
  CONSTRAINT unique_sub_billing_period UNIQUE (subscription_id, period_start, period_end)
);

-- 7. Create Invoice Items Table
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number VARCHAR(50) NOT NULL UNIQUE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(10) DEFAULT 'INR',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method payment_method NOT NULL DEFAULT 'bank_transfer',
  status VARCHAR(50) NOT NULL DEFAULT 'completed',
  transaction_reference VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Create Gravity AI Risk & Communication Logs Table
CREATE TABLE IF NOT EXISTS gravity_risk_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  default_risk_score NUMERIC(5, 2) NOT NULL CHECK (default_risk_score >= 0 AND default_risk_score <= 100),
  risk_level risk_level NOT NULL,
  days_overdue INTEGER NOT NULL DEFAULT 0,
  recommended_action TEXT NOT NULL,
  generated_recovery_message TEXT NOT NULL,
  communication_channel VARCHAR(50) DEFAULT 'email',
  message_status VARCHAR(50) DEFAULT 'drafted', -- 'drafted', 'sent', 'acknowledged'
  analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. State Transition Constraint for Subscriptions
-- Allowed Transitions:
-- draft -> quotation, closed
-- quotation -> confirmed, draft, closed
-- confirmed -> active, closed
-- active -> paused, closed
-- paused -> active, closed
-- closed -> (terminal state)
CREATE OR REPLACE FUNCTION validate_subscription_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF OLD.status = 'draft' AND NEW.status NOT IN ('quotation', 'closed') THEN
      RAISE EXCEPTION 'Invalid state transition from % to %. Allowed: quotation, closed', OLD.status, NEW.status;
    ELSIF OLD.status = 'quotation' AND NEW.status NOT IN ('confirmed', 'draft', 'closed') THEN
      RAISE EXCEPTION 'Invalid state transition from % to %. Allowed: confirmed, draft, closed', OLD.status, NEW.status;
    ELSIF OLD.status = 'confirmed' AND NEW.status NOT IN ('active', 'closed') THEN
      RAISE EXCEPTION 'Invalid state transition from % to %. Allowed: active, closed', OLD.status, NEW.status;
    ELSIF OLD.status = 'active' AND NEW.status NOT IN ('paused', 'closed') THEN
      RAISE EXCEPTION 'Invalid state transition from % to %. Allowed: paused, closed', OLD.status, NEW.status;
    ELSIF OLD.status = 'paused' AND NEW.status NOT IN ('active', 'closed') THEN
      RAISE EXCEPTION 'Invalid state transition from % to %. Allowed: active, closed', OLD.status, NEW.status;
    ELSIF OLD.status = 'closed' THEN
      RAISE EXCEPTION 'Cannot transition closed subscription % to % (Closed is terminal)', OLD.id, NEW.status;
    END IF;

    -- Timestamp markers
    IF NEW.status = 'paused' THEN
      NEW.paused_at := NOW();
    ELSIF NEW.status = 'closed' THEN
      NEW.closed_at := NOW();
    END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_subscription_state ON subscriptions;
CREATE TRIGGER trg_validate_subscription_state
BEFORE UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION validate_subscription_state_transition();

-- 11. Trigger to update Invoice Paid Status on Payment Insertion
CREATE OR REPLACE FUNCTION update_invoice_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_total NUMERIC(12, 2);
  v_paid NUMERIC(12, 2);
  v_new_balance NUMERIC(12, 2);
BEGIN
  -- Sum all completed payments for this invoice
  SELECT COALESCE(SUM(amount), 0)
  INTO v_paid
  FROM payments
  WHERE invoice_id = NEW.invoice_id AND status = 'completed';

  SELECT total_amount INTO v_total FROM invoices WHERE id = NEW.invoice_id;
  v_new_balance := GREATEST(0, v_total - v_paid);

  UPDATE invoices
  SET 
    amount_paid = v_paid,
    balance_due = v_new_balance,
    status = CASE 
      WHEN v_new_balance = 0 THEN 'paid'::invoice_status
      WHEN status = 'draft' THEN 'posted'::invoice_status
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = NEW.invoice_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_invoice_on_payment ON payments;
CREATE TRIGGER trg_update_invoice_on_payment
AFTER INSERT OR UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_invoice_on_payment();

-- 12. Enable Row Level Security (RLS)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE gravity_risk_logs ENABLE ROW LEVEL SECURITY;

-- Fail closed until Supabase Auth and per-customer ownership policies are configured.
-- With RLS enabled and no policies, browser roles cannot access these tables.
DROP POLICY IF EXISTS "Public full access customers" ON customers;
DROP POLICY IF EXISTS "Public full access products" ON products_plans;
DROP POLICY IF EXISTS "Public full access subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Public full access subscription_items" ON subscription_items;
DROP POLICY IF EXISTS "Public full access invoices" ON invoices;
DROP POLICY IF EXISTS "Public full access invoice_items" ON invoice_items;
DROP POLICY IF EXISTS "Public full access payments" ON payments;
DROP POLICY IF EXISTS "Public full access gravity_risk_logs" ON gravity_risk_logs;
