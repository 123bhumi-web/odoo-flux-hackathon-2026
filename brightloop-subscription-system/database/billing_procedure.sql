-- ====================================================================
-- Brightloop Scheduled Recurring Billing Script (Standard SQL)
-- Scans active subscriptions, computes 18% GST, prevents duplicate billing,
-- generates invoices and advances next_billing_date.
-- ====================================================================

-- Input Parameters (e.g., Target Date: :run_date)
-- 1. Identify subscriptions ready to bill:
-- SELECT * FROM subscriptions 
-- WHERE status = 'active' AND next_billing_date <= :run_date;

-- 2. Anti-collision query:
-- SELECT COUNT(*) FROM invoices 
-- WHERE subscription_id = :sub_id 
--   AND period_start = :period_start 
--   AND period_end = :period_end;

-- 3. SQL Insert Invoice:
-- INSERT INTO invoices (
--   id, invoice_number, subscription_id, customer_id, status,
--   issue_date, due_date, period_start, period_end,
--   subtotal, tax_rate, tax_amount, total_amount, balance_due, currency, payment_terms
-- ) VALUES (
--   :id, :invoice_number, :sub_id, :customer_id, 'posted',
--   :run_date, date(:run_date, '+15 days'), :period_start, :period_end,
--   :subtotal, 0.18, :tax_amount, :total_amount, :total_amount, 'INR', 'Net 15 Days'
-- );

-- 4. Advance Subscription Next Billing Date in SQL:
-- UPDATE subscriptions 
-- SET current_period_start = :next_start,
--     current_period_end = :next_end,
--     next_billing_date = :next_end,
--     last_billed_date = :run_date,
--     updated_at = datetime('now')
-- WHERE id = :sub_id;
