import { Subscription, Invoice, ProductPlan, Customer } from '../types/database';
import { ScheduledBillingRunResult } from '../types/models';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { store } from '../lib/storage';

/**
 * Calculates billing intervals and dates.
 */
export function addIntervalToDate(dateStr: string, interval: 'monthly' | 'quarterly' | 'annually'): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const monthOffset = interval === 'quarterly' ? 3 : interval === 'annually' ? 12 : 1;
  const targetMonth = new Date(Date.UTC(year, month - 1 + monthOffset, 1));
  const lastDay = new Date(
    Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0)
  ).getUTCDate();
  const targetDay = Math.min(day, lastDay);

  return `${targetMonth.getUTCFullYear()}-${String(targetMonth.getUTCMonth() + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
}

/**
 * Scheduled Billing Engine
 * Executes automated recurring billing for all active subscriptions.
 * Enforces:
 * 1. 18% GST calculation (9% CGST + 9% SGST / 18% IGST)
 * 2. Strict prevention of duplicate billing periods
 * 3. Next billing date advancement
 */
export class BillingEngine {
  /**
   * Runs the scheduled billing routine for a given target date (defaults to today).
   */
  public static async runScheduledBilling(
    targetDateStr: string = new Date().toISOString().split('T')[0]
  ): Promise<ScheduledBillingRunResult> {
    console.info(`⏳ [BillingEngine] Running scheduled billing for date: ${targetDateStr}`);

    // If Supabase backend is configured and live, call the stored SQL procedure!
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await (supabase as any).rpc('run_scheduled_billing', {
          p_run_date: targetDateStr,
        });

        if (error) {
          console.error('Supabase run_scheduled_billing error:', error);
          throw error;
        }

        const res = data as any;
        await store.syncFromSupabase();
        return {
          runDate: res.run_date || targetDateStr,
          subscriptionsScanned: res.subscriptions_scanned || 0,
          invoicesGenerated: res.invoices_generated || 0,
          skippedDuplicates: res.skipped_duplicates || 0,
          invoices: res.invoices || [],
          status: 'success',
          message: `Generated ${res.invoices_generated || 0} invoices via Supabase stored procedure.`,
        };
      } catch (err: any) {
        console.warn('Fallback to local BillingEngine execution due to RPC error:', err.message);
      }
    }

    // High-Fidelity Reactive Engine Local Billing Execution
    const subscriptions = store.getSubscriptions();
    const customers = store.getCustomers();
    const plans = store.getPlans();
    const invoices = store.getInvoices();

    let scannedCount = 0;
    let generatedCount = 0;
    let skippedDuplicates = 0;
    const generatedInvoicesSummary: ScheduledBillingRunResult['invoices'] = [];

    const activeSubs = subscriptions.filter(
      (sub) => sub.status === 'active' && sub.next_billing_date <= targetDateStr
    );

    for (const sub of activeSubs) {
      scannedCount++;

      // Guard: Check for duplicate billing period for this subscription
      const alreadyBilled = invoices.some(
        (inv) =>
          inv.subscription_id === sub.id &&
          inv.period_start === sub.current_period_start &&
          inv.period_end === sub.current_period_end
      );

      if (alreadyBilled) {
        const nextStart = sub.current_period_end;
        const nextEnd = addIntervalToDate(nextStart, sub.billing_interval);
        store.updateSubscription({
          ...sub,
          current_period_start: nextStart,
          current_period_end: nextEnd,
          next_billing_date: nextEnd,
          last_billed_date: targetDateStr,
        });
        skippedDuplicates++;
        continue;
      }

      const customer = customers.find((c) => c.id === sub.customer_id);
      const plan = plans.find((p) => p.id === sub.plan_id);

      // Calculations:
      const unitPrice = Number(sub.unit_price);
      const qty = Number(sub.quantity || 1);
      const discount = Number(sub.discount_percentage || 0);

      const subtotal = Math.round(unitPrice * qty * (1 - discount / 100) * 100) / 100;
      const gstRate = 0.18; // 18% GST standard for Brightloop SaaS in India
      const taxAmount = Math.round(subtotal * gstRate * 100) / 100;
      const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

      // Generate invoice number: INV-YYYYMM-XXXX
      const datePart = targetDateStr.replace(/-/g, '').slice(0, 6);
      const randPart = Math.floor(1000 + Math.random() * 9000);
      const invoiceNumber = `INV-${datePart}-${randPart}`;

      // Calculate due date (Net 15 Days)
      const dueDateObj = new Date(targetDateStr);
      dueDateObj.setDate(dueDateObj.getDate() + 15);
      const dueDate = dueDateObj.toISOString().split('T')[0];

      // New invoice entity
      const newInvoice: Invoice = {
        id: crypto.randomUUID(),
        invoice_number: invoiceNumber,
        subscription_id: sub.id,
        customer_id: sub.customer_id,
        status: 'posted',
        issue_date: targetDateStr,
        due_date: dueDate,
        period_start: sub.current_period_start,
        period_end: sub.current_period_end,
        subtotal,
        tax_rate: gstRate,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        amount_paid: 0.0,
        balance_due: totalAmount,
        currency: sub.currency || 'INR',
        payment_terms: 'Net 15 Days',
        notes: `Automated recurring cycle for ${plan?.name || 'Subscription'}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: [
          {
            id: crypto.randomUUID(),
            invoice_id: '',
            description: `${plan?.name || 'SaaS Subscription'} (${sub.current_period_start} to ${sub.current_period_end})`,
            quantity: qty,
            unit_price: unitPrice,
            amount: subtotal,
            created_at: new Date().toISOString(),
          },
        ],
      };

      // Advance subscription next billing cycle
      const nextStart = sub.current_period_end;
      const nextEnd = addIntervalToDate(nextStart, sub.billing_interval);

      const updatedSub: Subscription = {
        ...sub,
        current_period_start: nextStart,
        current_period_end: nextEnd,
        next_billing_date: nextEnd,
        last_billed_date: targetDateStr,
        updated_at: new Date().toISOString(),
      };

      // Commit to store
      store.addInvoice(newInvoice);
      store.updateSubscription(updatedSub);

      generatedCount++;
      generatedInvoicesSummary.push({
        invoiceId: newInvoice.id,
        invoiceNumber: newInvoice.invoice_number,
        subscriptionId: sub.id,
        customerName: customer?.name || 'Valued Customer',
        totalAmount: newInvoice.total_amount,
        periodStart: sub.current_period_start,
        periodEnd: sub.current_period_end,
        advancedNextBilling: nextEnd,
      });
    }

    return {
      runDate: targetDateStr,
      subscriptionsScanned: scannedCount,
      invoicesGenerated: generatedCount,
      skippedDuplicates,
      invoices: generatedInvoicesSummary,
      status: 'success',
      message: `Processed ${scannedCount} subscription(s). Generated ${generatedCount} invoice(s) with 18% GST. Skipped ${skippedDuplicates} duplicate(s).`,
    };
  }
}
