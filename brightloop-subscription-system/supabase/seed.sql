-- ====================================================================
-- Brightloop Subscription Management System - Seed Data
-- Odoo x FLUX Hackathon Specification
-- ====================================================================

-- 1. Seed Products / Plans
INSERT INTO products_plans (id, name, code, description, interval, unit_amount, currency, gst_rate, is_active, features)
VALUES 
  ('11111111-1111-1111-1111-111111111101', 'Flux Starter Plan', 'PLAN-STARTER', 'Core subscription & billing engine for small SaaS startups', 'monthly', 4999.00, 'INR', 0.18, true, 
   '["Up to 50 active subscriptions", "Automated 18% GST invoicing", "Standard Customer Portal", "Basic Risk Scoring"]'::jsonb),
   
  ('11111111-1111-1111-1111-111111111102', 'Brightloop Growth Pro', 'PLAN-PRO', 'Advanced subscription orchestration with Gravity AI risk detection', 'monthly', 14999.00, 'INR', 0.18, true, 
   '["Unlimited subscriptions", "Gravity AI Default Risk Engine", "Automated WhatsApp & Email Dunning", "Priority Payment Reconciliation", "Custom Quotations Builder"]'::jsonb),
   
  ('11111111-1111-1111-1111-111111111103', 'Enterprise Scale Cloud', 'PLAN-ENTERPRISE-Q', 'High-volume recurring billing for multi-entity enterprise operations', 'quarterly', 42999.00, 'INR', 0.18, true, 
   '["Multi-entity billing", "Dedicated Supabase DB replica", "Predictive churn model", "24/7 SLA & Tech Support", "Automated GST e-invoicing export"]'::jsonb),
   
  ('11111111-1111-1111-1111-111111111104', 'Enterprise Annual Suite', 'PLAN-ENTERPRISE-Y', 'Annual enterprise contract with custom SLA and VIP dunning', 'annually', 159999.00, 'INR', 0.18, true, 
   '["All Enterprise Scale Cloud features", "Dedicated CSM", "Zero gateway surcharge", "Custom Gravity AI risk model fine-tuning"]'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- 2. Seed Customers
INSERT INTO customers (id, name, email, phone, company, gstin, billing_address, credit_limit, default_payment_method, risk_score)
VALUES 
  ('22222222-2222-2222-2222-222222222201', 'Aditi Sharma', 'aditi@nexustech.io', '+91 98201 12345', 'NexusTech Solutions Pvt Ltd', '27AABCN1234A1Z5', 
   '{"street": "402, High Street Phoenix", "city": "Mumbai", "state": "Maharashtra", "pincode": "400013", "country": "India"}'::jsonb, 250000.00, 'bank_transfer', 8.5),
   
  ('22222222-2222-2222-2222-222222222202', 'Rohan Verma', 'rohan@finflow.co', '+91 98450 67890', 'FinFlow India Labs', '29ABCDE1234F1Z5', 
   '{"street": "88, Brigade Road", "city": "Bengaluru", "state": "Karnataka", "pincode": "560001", "country": "India"}'::jsonb, 150000.00, 'credit_card', 24.0),
   
  ('22222222-2222-2222-2222-222222222203', 'Vikramaditya Roy', 'roy@hyperionretail.in', '+91 99030 44556', 'Hyperion Retail Logistics', '19AACCH4321B1Z2', 
   '{"street": "12, Park Street", "city": "Kolkata", "state": "West Bengal", "pincode": "700016", "country": "India"}'::jsonb, 80000.00, 'upi', 82.5),
   
  ('22222222-2222-2222-2222-222222222204', 'Pooja Iyer', 'pooja@cloudwave.systems', '+91 94440 88990', 'CloudWave Systems LLP', '33AAACL9988C1Z8', 
   '{"street": "Tidel Park, Rajiv Gandhi Salai", "city": "Chennai", "state": "Tamil Nadu", "pincode": "600113", "country": "India"}'::jsonb, 300000.00, 'bank_transfer', 15.0),
   
  ('22222222-2222-2222-2222-222222222205', 'Karan Singhal', 'karan@delhilogistics.com', '+91 98111 22334', 'Delhi Express Courier Logistics', '07AACCD5566E1Z1', 
   '{"street": "Block B, Connaught Place", "city": "New Delhi", "state": "Delhi", "pincode": "110001", "country": "India"}'::jsonb, 60000.00, 'net_banking', 71.0)
ON CONFLICT (email) DO NOTHING;

-- 3. Seed Subscriptions
INSERT INTO subscriptions (
  id, subscription_number, customer_id, plan_id, status, billing_interval,
  current_period_start, current_period_end, next_billing_date, last_billed_date,
  quantity, unit_price, discount_percentage, subtotal, tax_rate, tax_amount, total_amount, currency
) VALUES 
  -- Active subscription ready to bill
  ('33333333-3333-3333-3333-333333333301', 'SUB-2026-0001', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111102', 
   'active', 'monthly', '2026-10-01', '2026-10-31', '2026-10-31', '2026-10-01',
   1, 14999.00, 0.00, 14999.00, 0.18, 2699.82, 17698.82, 'INR'),

  -- Active subscription with next bill in future
  ('33333333-3333-3333-3333-333333333302', 'SUB-2026-0002', '22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111101', 
   'active', 'monthly', '2026-10-15', '2026-11-15', '2026-11-15', '2026-10-15',
   2, 4999.00, 10.00, 8998.20, 0.18, 1619.68, 10617.88, 'INR'),

  -- Confirmed subscription waiting for activation
  ('33333333-3333-3333-3333-333333333303', 'SUB-2026-0003', '22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111103', 
   'confirmed', 'quarterly', '2026-11-01', '2027-02-01', '2026-11-01', NULL,
   1, 42999.00, 5.00, 40849.05, 0.18, 7352.83, 48201.88, 'INR'),

  -- Quotation stage subscription
  ('33333333-3333-3333-3333-333333333304', 'QUO-2026-0004', '22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111104', 
   'quotation', 'annually', '2026-11-01', '2027-11-01', '2026-11-01', NULL,
   1, 159999.00, 15.00, 135999.15, 0.18, 24479.85, 160479.00, 'INR'),

  -- Paused subscription
  ('33333333-3333-3333-3333-333333333305', 'SUB-2026-0005', '22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111101', 
   'paused', 'monthly', '2026-09-01', '2026-10-01', '2026-10-01', '2026-09-01',
   1, 4999.00, 0.00, 4999.00, 0.18, 899.82, 5898.82, 'INR')
ON CONFLICT (subscription_number) DO NOTHING;

-- 4. Seed Invoices (including Overdue invoice to demonstrate Gravity AI Risk Scoring)
INSERT INTO invoices (
  id, invoice_number, subscription_id, customer_id, status,
  issue_date, due_date, period_start, period_end,
  subtotal, tax_rate, tax_amount, total_amount, amount_paid, balance_due, currency, notes
) VALUES 
  -- Paid invoice
  ('44444444-4444-4444-4444-444444444401', 'INV-202610-1001', '33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201',
   'paid', '2026-10-01', '2026-10-16', '2026-10-01', '2026-10-31',
   14999.00, 0.18, 2699.82, 17698.82, 17698.82, 0.00, 'INR', 'Monthly Subscription - October 2026'),

  -- Overdue invoice (Overdue by 16 days! Trigger for Gravity AI)
  ('44444444-4444-4444-4444-444444444402', 'INV-202609-1002', '33333333-3333-3333-3333-333333333305', '22222222-2222-2222-2222-222222222203',
   'overdue', '2026-09-15', '2026-09-30', '2026-09-01', '2026-10-01',
   4999.00, 0.18, 899.82, 5898.82, 0.00, 5898.82, 'INR', 'Monthly Starter Plan - September 2026. Payment past due 31 days.'),

  -- Posted invoice awaiting payment
  ('44444444-4444-4444-4444-444444444403', 'INV-202610-1003', '33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222202',
   'posted', '2026-10-15', '2026-10-30', '2026-10-15', '2026-11-15',
   8998.20, 0.18, 1619.68, 10617.88, 0.00, 10617.88, 'INR', 'Monthly Subscription with 10% coupon')
ON CONFLICT (invoice_number) DO NOTHING;

-- 5. Seed Payments
INSERT INTO payments (
  id, payment_number, invoice_id, customer_id, amount, currency,
  payment_date, payment_method, status, transaction_reference, notes
) VALUES 
  ('55555555-5555-5555-5555-555555555501', 'PAY-202610-9001', '44444444-4444-4444-4444-444444444401', '22222222-2222-2222-2222-222222222201',
   17698.82, 'INR', '2026-10-05', 'bank_transfer', 'completed', 'NEFT-AXIS-993821092', 'Settled via Corporate Net Banking')
ON CONFLICT (payment_number) DO NOTHING;
