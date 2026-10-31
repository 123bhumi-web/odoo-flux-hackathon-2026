-- ====================================================================
-- Brightloop Subscription System - Standard SQL Seed Data
-- ====================================================================

-- 1. Insert Products & Plans
INSERT OR IGNORE INTO products_plans (id, name, code, description, interval, unit_amount, currency, gst_rate, is_active, features)
VALUES 
  ('p1', 'Flux Starter Plan', 'PLAN-STARTER', 'Core subscription & billing engine for small SaaS startups', 'monthly', 4999.00, 'INR', 0.18, 1, 
   '["Up to 50 active subscriptions", "Automated 18% GST invoicing", "Standard Customer Portal", "Basic Risk Scoring"]'),
   
  ('p2', 'Brightloop Growth Pro', 'PLAN-PRO', 'Advanced subscription orchestration with Gravity AI risk detection', 'monthly', 14999.00, 'INR', 0.18, 1, 
   '["Unlimited subscriptions", "Gravity AI Default Risk Engine", "Automated WhatsApp & Email Dunning", "Priority Payment Reconciliation", "Custom Quotations Builder"]'),
   
  ('p3', 'Enterprise Scale Cloud', 'PLAN-ENTERPRISE-Q', 'High-volume recurring billing for multi-entity enterprise operations', 'quarterly', 42999.00, 'INR', 0.18, 1, 
   '["Multi-entity billing", "Dedicated SQL DB replica", "Predictive churn model", "24/7 SLA & Tech Support", "Automated GST e-invoicing export"]'),
   
  ('p4', 'Enterprise Annual Suite', 'PLAN-ENTERPRISE-Y', 'Annual enterprise contract with custom SLA and VIP dunning', 'annually', 159999.00, 'INR', 0.18, 1, 
   '["All Enterprise Scale Cloud features", "Dedicated CSM", "Zero gateway surcharge", "Custom Gravity AI risk model fine-tuning"]');

-- 2. Insert Customers
INSERT OR IGNORE INTO customers (id, name, email, phone, company, gstin, billing_address, credit_limit, default_payment_method, risk_score)
VALUES 
  ('c1', 'Aditi Sharma', 'aditi@nexustech.io', '+91 98201 12345', 'NexusTech Solutions Pvt Ltd', '27AABCN1234A1Z5', 
   '{"street": "402, High Street Phoenix", "city": "Mumbai", "state": "Maharashtra", "pincode": "400013", "country": "India"}', 250000.00, 'bank_transfer', 8.5),
   
  ('c2', 'Rohan Verma', 'rohan@finflow.co', '+91 98450 67890', 'FinFlow India Labs', '29ABCDE1234F1Z5', 
   '{"street": "88, Brigade Road", "city": "Bengaluru", "state": "Karnataka", "pincode": "560001", "country": "India"}', 150000.00, 'credit_card', 24.0),
   
  ('c3', 'Vikramaditya Roy', 'roy@hyperionretail.in', '+91 99030 44556', 'Hyperion Retail Logistics', '19AACCH4321B1Z2', 
   '{"street": "12, Park Street", "city": "Kolkata", "state": "West Bengal", "pincode": "700016", "country": "India"}', 80000.00, 'upi', 82.5),
   
  ('c4', 'Pooja Iyer', 'pooja@cloudwave.systems', '+91 94440 88990', 'CloudWave Systems LLP', '33AAACL9988C1Z8', 
   '{"street": "Tidel Park, Rajiv Gandhi Salai", "city": "Chennai", "state": "Tamil Nadu", "pincode": "600113", "country": "India"}', 300000.00, 'bank_transfer', 15.0),
   
  ('c5', 'Karan Singhal', 'karan@delhilogistics.com', '+91 98111 22334', 'Delhi Express Courier Logistics', '07AACCD5566E1Z1', 
   '{"street": "Block B, Connaught Place", "city": "New Delhi", "state": "Delhi", "pincode": "110001", "country": "India"}', 60000.00, 'net_banking', 71.0);

-- 3. Insert Subscriptions
INSERT OR IGNORE INTO subscriptions (
  id, subscription_number, customer_id, plan_id, status, billing_interval,
  current_period_start, current_period_end, next_billing_date, last_billed_date,
  quantity, unit_price, discount_percentage, subtotal, tax_rate, tax_amount, total_amount, currency
) VALUES 
  ('s1', 'SUB-2026-0001', 'c1', 'p2', 'active', 'monthly', '2026-10-01', '2026-10-31', '2026-10-31', '2026-10-01', 1, 14999.00, 0.00, 14999.00, 0.18, 2699.82, 17698.82, 'INR'),
  ('s2', 'SUB-2026-0002', 'c2', 'p1', 'active', 'monthly', '2026-10-15', '2026-11-15', '2026-11-15', '2026-10-15', 2, 4999.00, 10.00, 8998.20, 0.18, 1619.68, 10617.88, 'INR'),
  ('s3', 'SUB-2026-0003', 'c4', 'p3', 'confirmed', 'quarterly', '2026-11-01', '2027-02-01', '2026-11-01', NULL, 1, 42999.00, 5.00, 40849.05, 0.18, 7352.83, 48201.88, 'INR'),
  ('s4', 'QUO-2026-0004', 'c5', 'p4', 'quotation', 'annually', '2026-11-01', '2027-11-01', '2026-11-01', NULL, 1, 159999.00, 15.00, 135999.15, 0.18, 24479.85, 160479.00, 'INR'),
  ('s5', 'SUB-2026-0005', 'c3', 'p1', 'paused', 'monthly', '2026-09-01', '2026-10-01', '2026-10-01', '2026-09-01', 1, 4999.00, 0.00, 4999.00, 0.18, 899.82, 5898.82, 'INR');

-- 4. Insert Invoices
INSERT OR IGNORE INTO invoices (
  id, invoice_number, subscription_id, customer_id, status,
  issue_date, due_date, period_start, period_end,
  subtotal, tax_rate, tax_amount, total_amount, amount_paid, balance_due, currency, notes
) VALUES 
  ('inv1', 'INV-202610-1001', 's1', 'c1', 'paid', '2026-10-01', '2026-10-16', '2026-10-01', '2026-10-31', 14999.00, 0.18, 2699.82, 17698.82, 17698.82, 0.00, 'INR', 'Monthly Growth Pro - Oct 2026'),
  ('inv2', 'INV-202609-1002', 's5', 'c3', 'overdue', '2026-09-15', '2026-09-30', '2026-09-01', '2026-10-01', 4999.00, 0.18, 899.82, 5898.82, 0.00, 5898.82, 'INR', 'Monthly Starter Plan - Overdue 31 days. Gravity AI Risk Target.'),
  ('inv3', 'INV-202610-1003', 's2', 'c2', 'posted', '2026-10-15', '2026-10-30', '2026-10-15', '2026-11-15', 8998.20, 0.18, 1619.68, 10617.88, 0.00, 10617.88, 'INR', 'Monthly Starter (2 seats) with 10% coupon');

-- 5. Insert Invoice Items
INSERT OR IGNORE INTO invoice_items (id, invoice_id, description, quantity, unit_price, amount)
VALUES 
  ('ii1', 'inv1', 'Brightloop Growth Pro (01 Oct 2026 - 31 Oct 2026)', 1, 14999.00, 14999.00),
  ('ii2', 'inv2', 'Flux Starter Plan (01 Sep 2026 - 01 Oct 2026)', 1, 4999.00, 4999.00),
  ('ii3', 'inv3', 'Flux Starter Plan - 2 Seats (15 Oct 2026 - 15 Nov 2026)', 2, 4999.00, 8998.20);

-- 6. Insert Payments
INSERT OR IGNORE INTO payments (
  id, payment_number, invoice_id, customer_id, amount, currency,
  payment_date, payment_method, status, transaction_reference, notes
) VALUES 
  ('pay1', 'PAY-202610-9001', 'inv1', 'c1', 17698.82, 'INR', '2026-10-05', 'bank_transfer', 'completed', 'NEFT-AXIS-993821092', 'Settled via Corporate Net Banking');
