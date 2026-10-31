import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DB_PATH = path.resolve('brightloop.db');
const SCHEMA_PATH = path.resolve('database/schema.sql');
const SEED_PATH = path.resolve('database/seed.sql');

class BrightloopSQLDatabase {
  constructor() {
    this.db = new DatabaseSync(DB_PATH);
    this.init();
  }

  init() {
    // 1. Run Schema
    if (fs.existsSync(SCHEMA_PATH)) {
      const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf-8');
      this.db.exec(schemaSql);
    }

    // 2. Run Seed if empty
    const customerCount = this.db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
    if (customerCount === 0 && fs.existsSync(SEED_PATH)) {
      const seedSql = fs.readFileSync(SEED_PATH, 'utf-8');
      this.db.exec(seedSql);
      console.log('✅ [SQL Engine] Initialized brightloop.db with schema and seed data.');
    } else {
      console.log('✅ [SQL Engine] Connected to brightloop.db (Records present).');
    }
  }

  // --- Customers ---
  getCustomers() {
    const rows = this.db.prepare('SELECT * FROM customers ORDER BY created_at DESC').all();
    return rows.map((r) => ({
      ...r,
      billing_address: typeof r.billing_address === 'string' ? JSON.parse(r.billing_address) : r.billing_address,
    }));
  }

  addCustomer(cust) {
    const id = cust.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const addressStr = typeof cust.billing_address === 'object' ? JSON.stringify(cust.billing_address) : cust.billing_address;

    const stmt = this.db.prepare(`
      INSERT INTO customers (id, name, email, phone, company, gstin, billing_address, credit_limit, default_payment_method, risk_score, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      cust.name,
      cust.email,
      cust.phone || '',
      cust.company || '',
      cust.gstin || '',
      addressStr,
      cust.credit_limit || 100000.0,
      cust.default_payment_method || 'bank_transfer',
      cust.risk_score || 12.5,
      now,
      now
    );

    return this.getCustomers().find((c) => c.id === id);
  }

  // --- Plans ---
  getPlans() {
    const rows = this.db.prepare('SELECT * FROM products_plans ORDER BY unit_amount ASC').all();
    return rows.map((r) => ({
      ...r,
      is_active: Boolean(r.is_active),
      features: typeof r.features === 'string' ? JSON.parse(r.features) : r.features,
    }));
  }

  addPlan(plan) {
    const id = plan.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const featuresStr = Array.isArray(plan.features) ? JSON.stringify(plan.features) : '[]';

    const stmt = this.db.prepare(`
      INSERT INTO products_plans (id, name, code, description, interval, unit_amount, currency, gst_rate, is_active, features, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      plan.name,
      plan.code,
      plan.description || '',
      plan.interval || 'monthly',
      plan.unit_amount,
      plan.currency || 'INR',
      plan.gst_rate || 0.18,
      plan.is_active ? 1 : 0,
      featuresStr,
      now,
      now
    );

    return this.getPlans().find((p) => p.id === id);
  }

  // --- Subscriptions ---
  getSubscriptions() {
    const rows = this.db.prepare(`
      SELECT s.*, 
             c.name as customer_name, c.company as customer_company, c.email as customer_email, c.gstin as customer_gstin, c.billing_address as customer_address,
             p.name as plan_name, p.unit_amount as plan_amount, p.features as plan_features
      FROM subscriptions s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN products_plans p ON s.plan_id = p.id
      ORDER BY s.created_at DESC
    `).all();

    return rows.map((r) => ({
      ...r,
      auto_renew: Boolean(r.auto_renew),
      customer: {
        id: r.customer_id,
        name: r.customer_name,
        company: r.customer_company,
        email: r.customer_email,
        gstin: r.customer_gstin,
        billing_address: r.customer_address ? JSON.parse(r.customer_address) : {},
      },
      plan: {
        id: r.plan_id,
        name: r.plan_name,
        unit_amount: r.plan_amount,
        features: r.plan_features ? JSON.parse(r.plan_features) : [],
      },
    }));
  }

  addSubscription(sub) {
    const id = sub.id || crypto.randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO subscriptions (
        id, subscription_number, customer_id, plan_id, status, billing_interval,
        current_period_start, current_period_end, next_billing_date, last_billed_date,
        quantity, unit_price, discount_percentage, subtotal, tax_rate, tax_amount, total_amount,
        currency, auto_renew, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      sub.subscription_number,
      sub.customer_id,
      sub.plan_id,
      sub.status || 'draft',
      sub.billing_interval || 'monthly',
      sub.current_period_start,
      sub.current_period_end,
      sub.next_billing_date,
      sub.last_billed_date || null,
      sub.quantity || 1,
      sub.unit_price,
      sub.discount_percentage || 0,
      sub.subtotal,
      sub.tax_rate || 0.18,
      sub.tax_amount,
      sub.total_amount,
      sub.currency || 'INR',
      sub.auto_renew ? 1 : 0,
      sub.notes || '',
      now,
      now
    );

    return this.getSubscriptions().find((s) => s.id === id);
  }

  /**
   * Enforces State Transition Constraints:
   * Draft -> Quotation -> Confirmed -> Active -> Closed/Paused
   */
  transitionSubscriptionState(id, targetState) {
    const sub = this.db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id);
    if (!sub) return { success: false, error: 'Subscription not found in SQL database' };

    const allowed = {
      draft: ['quotation', 'closed'],
      quotation: ['confirmed', 'draft', 'closed'],
      confirmed: ['active', 'closed'],
      active: ['paused', 'closed'],
      paused: ['active', 'closed'],
      closed: [],
    };

    const validTargets = allowed[sub.status] || [];
    if (!validTargets.includes(targetState)) {
      return {
        success: false,
        error: `SQL Constraint: Cannot transition subscription from "${sub.status}" to "${targetState}". Allowed: ${validTargets.join(', ') || 'None'}`,
      };
    }

    const now = new Date().toISOString();
    let pausedAt = sub.paused_at;
    let closedAt = sub.closed_at;
    if (targetState === 'paused') pausedAt = now;
    if (targetState === 'closed') closedAt = now;
    if (targetState === 'active') pausedAt = null;

    const stmt = this.db.prepare(`
      UPDATE subscriptions 
      SET status = ?, paused_at = ?, closed_at = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(targetState, pausedAt, closedAt, now, id);

    return { success: true };
  }

  // --- Invoices ---
  getInvoices() {
    const rows = this.db.prepare(`
      SELECT i.*, 
             c.name as customer_name, c.company as customer_company, c.email as customer_email, c.gstin as customer_gstin,
             s.subscription_number
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN subscriptions s ON i.subscription_id = s.id
      ORDER BY i.issue_date DESC
    `).all();

    const items = this.db.prepare('SELECT * FROM invoice_items').all();

    return rows.map((r) => ({
      ...r,
      customer: {
        id: r.customer_id,
        name: r.customer_name,
        company: r.customer_company,
        email: r.customer_email,
        gstin: r.customer_gstin,
      },
      items: items.filter((it) => it.invoice_id === r.id),
    }));
  }

  addInvoice(inv) {
    const id = inv.id || crypto.randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO invoices (
        id, invoice_number, subscription_id, customer_id, status,
        issue_date, due_date, period_start, period_end,
        subtotal, tax_rate, tax_amount, total_amount, amount_paid, balance_due,
        currency, notes, payment_terms, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      inv.invoice_number,
      inv.subscription_id || null,
      inv.customer_id,
      inv.status || 'posted',
      inv.issue_date,
      inv.due_date,
      inv.period_start,
      inv.period_end,
      inv.subtotal,
      inv.tax_rate || 0.18,
      inv.tax_amount,
      inv.total_amount,
      inv.amount_paid || 0,
      inv.balance_due || inv.total_amount,
      inv.currency || 'INR',
      inv.notes || '',
      inv.payment_terms || 'Net 15 Days',
      now,
      now
    );

    if (Array.isArray(inv.items)) {
      const itemStmt = this.db.prepare(`
        INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, amount, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const it of inv.items) {
        itemStmt.run(
          it.id || crypto.randomUUID(),
          id,
          it.description,
          it.quantity || 1,
          it.unit_price,
          it.amount,
          now
        );
      }
    }

    return this.getInvoices().find((i) => i.id === id);
  }

  // --- Payments ---
  getPayments() {
    const rows = this.db.prepare(`
      SELECT p.*, 
             c.name as customer_name, c.company as customer_company,
             i.invoice_number, i.balance_due as invoice_balance
      FROM payments p
      LEFT JOIN customers c ON p.customer_id = c.id
      LEFT JOIN invoices i ON p.invoice_id = i.id
      ORDER BY p.payment_date DESC
    `).all();

    return rows.map((r) => ({
      ...r,
      customer: { id: r.customer_id, name: r.customer_name, company: r.customer_company },
      invoice: { id: r.invoice_id, invoice_number: r.invoice_number, balance_due: r.invoice_balance },
    }));
  }

  recordPayment(pay) {
    const id = pay.id || crypto.randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO payments (id, payment_number, invoice_id, customer_id, amount, currency, payment_date, payment_method, status, transaction_reference, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      pay.payment_number,
      pay.invoice_id,
      pay.customer_id,
      pay.amount,
      pay.currency || 'INR',
      pay.payment_date || now.split('T')[0],
      pay.payment_method || 'bank_transfer',
      pay.status || 'completed',
      pay.transaction_reference || '',
      pay.notes || '',
      now
    );

    // Reconcile Invoice in SQL
    const inv = this.db.prepare('SELECT * FROM invoices WHERE id = ?').get(pay.invoice_id);
    if (inv && pay.status === 'completed') {
      const currentPaid = Number(inv.amount_paid || 0);
      const newPaid = currentPaid + Number(pay.amount);
      const newBalance = Math.max(0, Number(inv.total_amount) - newPaid);
      const newStatus = newBalance <= 0 ? 'paid' : inv.status;

      this.db.prepare(`
        UPDATE invoices 
        SET amount_paid = ?, balance_due = ?, status = ?, updated_at = ?
        WHERE id = ?
      `).run(newPaid, newBalance, newStatus, now, pay.invoice_id);
    }

    return this.getPayments().find((p) => p.id === id);
  }

  // --- Gravity AI Risk Logs ---
  logGravityRisk(log) {
    const id = log.id || crypto.randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO gravity_risk_logs (
        id, invoice_id, customer_id, default_risk_score, risk_level,
        days_overdue, recommended_action, generated_recovery_message,
        communication_channel, message_status, analyzed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      log.invoiceId,
      log.customerId,
      log.defaultRiskScore,
      log.riskLevel,
      log.daysOverdue,
      log.recommendedAction,
      log.recoveryCommunications?.messageBody || '',
      log.recoveryCommunications?.channel || 'email',
      'drafted',
      now
    );
  }

  // --- SQL Procedure: run_scheduled_billing ---
  runScheduledBilling(targetDateStr = new Date().toISOString().split('T')[0]) {
    const activeSubs = this.db.prepare(`
      SELECT s.*, p.name as plan_name, c.name as customer_name
      FROM subscriptions s
      JOIN products_plans p ON s.plan_id = p.id
      JOIN customers c ON s.customer_id = c.id
      WHERE s.status = 'active' AND s.next_billing_date <= ?
      ORDER BY s.next_billing_date ASC
    `).all(targetDateStr);

    let generatedCount = 0;
    let skippedDuplicates = 0;
    const generatedInvoices = [];

    for (const sub of activeSubs) {
      // 1. Anti-collision check in SQL
      const existing = this.db.prepare(`
        SELECT COUNT(*) as count FROM invoices 
        WHERE subscription_id = ? AND period_start = ? AND period_end = ?
      `).get(sub.id, sub.current_period_start, sub.current_period_end);

      if (existing.count > 0) {
        skippedDuplicates++;
        continue;
      }

      // 2. Compute 18% GST and total
      const unitPrice = Number(sub.unit_price);
      const qty = Number(sub.quantity || 1);
      const discount = Number(sub.discount_percentage || 0);

      const subtotal = Math.round(unitPrice * qty * (1 - discount / 100) * 100) / 100;
      const gstRate = 0.18;
      const taxAmount = Math.round(subtotal * gstRate * 100) / 100;
      const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

      const datePart = targetDateStr.replace(/-/g, '').slice(0, 6);
      const randPart = Math.floor(1000 + Math.random() * 9000);
      const invoiceNumber = `INV-${datePart}-${randPart}`;

      const dueDateObj = new Date(targetDateStr);
      dueDateObj.setDate(dueDateObj.getDate() + 15);
      const dueDate = dueDateObj.toISOString().split('T')[0];

      const invId = crypto.randomUUID();
      const now = new Date().toISOString();

      // Insert invoice
      this.db.prepare(`
        INSERT INTO invoices (
          id, invoice_number, subscription_id, customer_id, status,
          issue_date, due_date, period_start, period_end,
          subtotal, tax_rate, tax_amount, total_amount, amount_paid, balance_due,
          currency, notes, payment_terms, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        invId,
        invoiceNumber,
        sub.id,
        sub.customer_id,
        'posted',
        targetDateStr,
        dueDate,
        sub.current_period_start,
        sub.current_period_end,
        subtotal,
        gstRate,
        taxAmount,
        totalAmount,
        0.0,
        totalAmount,
        sub.currency || 'INR',
        `Automated billing cycle for ${sub.plan_name}`,
        'Net 15 Days',
        now,
        now
      );

      // Insert item
      this.db.prepare(`
        INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, amount, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        invId,
        `${sub.plan_name} (${sub.current_period_start} to ${sub.current_period_end})`,
        qty,
        unitPrice,
        subtotal,
        now
      );

      // Advance Next Billing Date
      const nextStart = sub.current_period_end;
      const d = new Date(nextStart);
      if (sub.billing_interval === 'quarterly') d.setMonth(d.getMonth() + 3);
      else if (sub.billing_interval === 'annually') d.setFullYear(d.getFullYear() + 1);
      else d.setMonth(d.getMonth() + 1);
      const nextEnd = d.toISOString().split('T')[0];

      this.db.prepare(`
        UPDATE subscriptions 
        SET current_period_start = ?, current_period_end = ?, next_billing_date = ?, last_billed_date = ?, updated_at = ?
        WHERE id = ?
      `).run(nextStart, nextEnd, nextEnd, targetDateStr, now, sub.id);

      generatedCount++;
      generatedInvoices.push({
        invoiceId: invId,
        invoiceNumber,
        subscriptionId: sub.id,
        customerName: sub.customer_name,
        totalAmount,
        periodStart: sub.current_period_start,
        periodEnd: sub.current_period_end,
        advancedNextBilling: nextEnd,
      });
    }

    return {
      runDate: targetDateStr,
      subscriptionsScanned: activeSubs.length,
      invoicesGenerated: generatedCount,
      skippedDuplicates,
      invoices: generatedInvoices,
      status: 'success',
      message: `[SQL Engine] Processed ${activeSubs.length} subscriptions. Generated ${generatedCount} invoice(s) with 18% GST. Skipped ${skippedDuplicates} duplicate(s).`,
    };
  }

  // --- Raw SQL Query Execution for Reviewer / SQL Console ---
  executeRawSql(sqlQuery) {
    const trimmed = sqlQuery.trim();
    if (!trimmed) return { error: 'Empty query' };

    try {
      if (trimmed.toUpperCase().startsWith('SELECT') || trimmed.toUpperCase().startsWith('PRAGMA')) {
        const rows = this.db.prepare(trimmed).all();
        return { success: true, rows, count: rows.length };
      } else {
        const info = this.db.exec(trimmed);
        return { success: true, message: 'SQL executed successfully', info };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

export const sqlDb = new BrightloopSQLDatabase();
