-- ====================================================================
-- Stored SQL Procedure: run_scheduled_billing
-- Brightloop Subscription System Automation
-- Scans active subscriptions, generates 18% GST invoices without duplicates,
-- and advances billing periods.
-- ====================================================================

CREATE OR REPLACE FUNCTION run_scheduled_billing(p_run_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB AS $$
DECLARE
  v_sub RECORD;
  v_plan RECORD;
  v_customer RECORD;
  v_subtotal NUMERIC(12, 2);
  v_tax_rate NUMERIC(4, 2) := 0.18; -- 18% Indian GST
  v_tax_amount NUMERIC(12, 2);
  v_total_amount NUMERIC(12, 2);
  v_invoice_id UUID;
  v_invoice_num VARCHAR(50);
  v_next_period_start DATE;
  v_next_period_end DATE;
  v_interval_step INTERVAL;
  v_invoices_generated INTEGER := 0;
  v_subscriptions_processed INTEGER := 0;
  v_skipped_duplicates INTEGER := 0;
  v_results JSONB := '[]'::jsonb;
  v_invoice_record JSONB;
BEGIN
  -- Cursor over all active subscriptions whose next billing date has arrived
  FOR v_sub IN 
    SELECT s.* 
    FROM subscriptions s
    WHERE s.status = 'active'
      AND s.next_billing_date <= p_run_date
    ORDER BY s.next_billing_date ASC
  LOOP
    v_subscriptions_processed := v_subscriptions_processed + 1;

    -- 1. Check for Duplicate Billing:
    -- Verify if an invoice already exists for this subscription and period
    IF EXISTS (
      SELECT 1 FROM invoices 
      WHERE subscription_id = v_sub.id 
        AND period_start = v_sub.current_period_start 
        AND period_end = v_sub.current_period_end
    ) THEN
      v_skipped_duplicates := v_skipped_duplicates + 1;
      CONTINUE;
    END IF;

    -- Fetch Plan details
    SELECT * INTO v_plan FROM products_plans WHERE id = v_sub.plan_id;
    -- Fetch Customer details
    SELECT * INTO v_customer FROM customers WHERE id = v_sub.customer_id;

    -- 2. Calculate Line Items, Subtotal, 18% GST, and Total
    v_subtotal := ROUND(v_sub.unit_price * v_sub.quantity * (1.0 - (COALESCE(v_sub.discount_percentage, 0.0) / 100.0)), 2);
    v_tax_amount := ROUND(v_subtotal * v_tax_rate, 2);
    v_total_amount := v_subtotal + v_tax_amount;

    -- Generate Invoice Number: INV-YYYYMM-XXXX
    v_invoice_num := 'INV-' || TO_CHAR(p_run_date, 'YYYYMM') || '-' || LPAD(FLOOR(RANDOM() * 8999 + 1000)::TEXT, 4, '0');

    -- 3. Create Invoice
    INSERT INTO invoices (
      invoice_number,
      subscription_id,
      customer_id,
      status,
      issue_date,
      due_date,
      period_start,
      period_end,
      subtotal,
      tax_rate,
      tax_amount,
      total_amount,
      amount_paid,
      balance_due,
      currency,
      notes,
      payment_terms
    ) VALUES (
      v_invoice_num,
      v_sub.id,
      v_sub.customer_id,
      'posted',
      p_run_date,
      (p_run_date + INTERVAL '15 days')::date,
      v_sub.current_period_start,
      v_sub.current_period_end,
      v_subtotal,
      v_tax_rate,
      v_tax_amount,
      v_total_amount,
      0.00,
      v_total_amount,
      COALESCE(v_sub.currency, 'INR'),
      'Automated billing cycle for ' || COALESCE(v_plan.name, 'Subscription Plan'),
      'Net 15 Days'
    ) RETURNING id INTO v_invoice_id;

    -- 4. Create Invoice Item Line
    INSERT INTO invoice_items (
      invoice_id,
      description,
      quantity,
      unit_price,
      amount
    ) VALUES (
      v_invoice_id,
      COALESCE(v_plan.name, 'SaaS Subscription') || ' (' || TO_CHAR(v_sub.current_period_start, 'DD Mon YYYY') || ' - ' || TO_CHAR(v_sub.current_period_end, 'DD Mon YYYY') || ')',
      v_sub.quantity,
      v_sub.unit_price,
      v_subtotal
    );

    -- 5. Advance Subscription Next Billing Date according to billing interval
    IF v_sub.billing_interval = 'quarterly' THEN
      v_interval_step := INTERVAL '3 months';
    ELSIF v_sub.billing_interval = 'annually' THEN
      v_interval_step := INTERVAL '1 year';
    ELSE
      v_interval_step := INTERVAL '1 month';
    END IF;

    v_next_period_start := v_sub.current_period_end;
    v_next_period_end := (v_next_period_start + v_interval_step)::date;

    UPDATE subscriptions
    SET 
      current_period_start = v_next_period_start,
      current_period_end = v_next_period_end,
      next_billing_date = v_next_period_end,
      last_billed_date = p_run_date,
      updated_at = NOW()
    WHERE id = v_sub.id;

    v_invoices_generated := v_invoices_generated + 1;

    -- Append record summary
    v_invoice_record := jsonb_build_object(
      'invoice_id', v_invoice_id,
      'invoice_number', v_invoice_num,
      'subscription_id', v_sub.id,
      'customer_name', v_customer.name,
      'total_amount', v_total_amount,
      'period_start', v_sub.current_period_start,
      'period_end', v_sub.current_period_end,
      'advanced_next_billing', v_next_period_end
    );
    v_results := v_results || v_invoice_record;

  END LOOP;

  RETURN jsonb_build_object(
    'run_date', p_run_date,
    'subscriptions_scanned', v_subscriptions_processed,
    'invoices_generated', v_invoices_generated,
    'skipped_duplicates', v_skipped_duplicates,
    'invoices', v_results,
    'status', 'success'
  );
END;
$$ LANGUAGE plpgsql;
