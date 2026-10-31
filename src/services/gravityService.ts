import { Customer, Invoice, GravityRiskLog, RiskLevel } from '../types/database';
import { GravityRiskAssessment } from '../types/models';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const GRAVITY_API_KEY = import.meta.env.VITE_GRAVITY_AI_API_KEY || 'grav_live_demo_key_9831a8';
const GRAVITY_ENDPOINT =
  import.meta.env.VITE_GRAVITY_AI_API_ENDPOINT ||
  'https://api.gravityai.internal/v1/risk-recovery';

/**
 * Calculates days overdue from invoice due date.
 */
export function getDaysOverdue(dueDateStr: string): number {
  const due = new Date(dueDateStr);
  const now = new Date();
  // Strip time for clean day diff
  const utcDue = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());
  const utcNow = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((utcNow - utcDue) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Gravity AI Risk Evaluation Service
 * Evaluates default risk on overdue invoices using behavioral & exposure heuristics,
 * calls the Gravity AI API endpoint, and generates context-aware payment recovery drafts.
 */
export class GravityService {
  /**
   * Evaluates the risk on an overdue or pending invoice.
   */
  public static async evaluateInvoiceDefaultRisk(
    invoice: Invoice,
    customer: Customer
  ): Promise<GravityRiskAssessment> {
    const daysOverdue = getDaysOverdue(invoice.due_date);
    const balanceDue = Number(invoice.balance_due || invoice.total_amount);
    const creditLimit = Number(customer.credit_limit || 100000);
    const exposureRatio = (balanceDue / creditLimit) * 100;

    // 1. Algorithmic Risk Scoring (0 to 100)
    // Factors:
    // a) Days overdue penalty: 0-45 points (accelerates past 15 and 30 days)
    let overdueScore = 0;
    if (daysOverdue > 45) {
      overdueScore = 48;
    } else if (daysOverdue > 30) {
      overdueScore = 38;
    } else if (daysOverdue > 15) {
      overdueScore = 24;
    } else if (daysOverdue > 0) {
      overdueScore = Math.min(20, daysOverdue * 1.5);
    }

    // b) Exposure penalty: 0-30 points (utilization of customer's credit line)
    let exposureScore = Math.min(30, (exposureRatio / 100) * 30);

    // c) Customer baseline behavioral risk: 0-25 points
    let baselineScore = (Number(customer.risk_score || 10) / 100) * 22;

    const computedRisk = Math.min(
      99,
      Math.max(5, Math.round(overdueScore + exposureScore + baselineScore))
    );

    // 2. Classify Risk Level
    let riskLevel: RiskLevel = 'low';
    let tone: 'diplomatic' | 'structured' | 'firm' | 'urgent' = 'diplomatic';
    let recommendedAction = '';
    const riskFactors: string[] = [];

    if (computedRisk >= 75) {
      riskLevel = 'severe';
      tone = 'urgent';
      recommendedAction =
        'Execute immediate suspension notice. Place subscription on credit hold, trigger executive collections escalation, and request split payment plan.';
    } else if (computedRisk >= 50) {
      riskLevel = 'high';
      tone = 'firm';
      recommendedAction =
        'Dispatch firm payment recovery notice with 48-hour deadline. Send WhatsApp & Email with automated settlement payment link.';
    } else if (computedRisk >= 25) {
      riskLevel = 'medium';
      tone = 'structured';
      recommendedAction =
        'Send polite structured payment reminder highlighting upcoming grace period expiration and offer UPI / Net Banking instant settlement.';
    } else {
      riskLevel = 'low';
      tone = 'diplomatic';
      recommendedAction =
        'Dispatch gentle courtesy reminder. Verify if invoice was received by accounts payable department.';
    }

    // Factor notes
    if (daysOverdue > 0) {
      riskFactors.push(`Payment overdue by ${daysOverdue} days (Due: ${invoice.due_date})`);
    } else {
      riskFactors.push(`Invoice approaching due date (${invoice.due_date})`);
    }

    if (exposureRatio > 50) {
      riskFactors.push(
        `High credit exposure: Invoice represents ${exposureRatio.toFixed(1)}% of credit limit (₹${creditLimit.toLocaleString()})`
      );
    } else {
      riskFactors.push(
        `Credit exposure healthy: ${exposureRatio.toFixed(1)}% of allocated limit`
      );
    }

    if (customer.risk_score > 40) {
      riskFactors.push(`Historical account volatility: Customer rating is ${customer.risk_score}/100`);
    }

    // 3. Generate Personalized Recovery Communication
    const recoveryMessage = this.generateRecoveryMessageDraft(
      invoice,
      customer,
      daysOverdue,
      tone,
      riskLevel
    );

    const assessment: GravityRiskAssessment = {
      invoiceId: invoice.id,
      customerId: customer.id,
      customerName: customer.name,
      invoiceNumber: invoice.invoice_number,
      totalAmount: invoice.total_amount,
      balanceDue,
      daysOverdue,
      defaultRiskScore: computedRisk,
      riskLevel,
      riskFactors,
      recommendedAction,
      recoveryCommunications: recoveryMessage,
      analyzedAt: new Date().toISOString(),
    };

    // 4. Attempt real Gravity AI API call if available, otherwise record in DB
    try {
      if (GRAVITY_ENDPOINT && GRAVITY_API_KEY && !GRAVITY_ENDPOINT.includes('internal')) {
        await fetch(GRAVITY_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${GRAVITY_API_KEY}`,
          },
          body: JSON.stringify({
            invoiceId: invoice.id,
            customerId: customer.id,
            amount: balanceDue,
            daysOverdue,
            gstin: customer.gstin,
          }),
        });
      }
    } catch (err) {
      console.warn('Gravity AI live API unreachable, proceeding with AI engine output:', err);
    }

    // 5. Audit Log to Supabase / Storage
    await this.logAssessmentAudit(assessment);

    return assessment;
  }

  /**
   * Generates AI-personalized recovery communications for various channels and tones.
   */
  private static generateRecoveryMessageDraft(
    invoice: Invoice,
    customer: Customer,
    daysOverdue: number,
    tone: 'diplomatic' | 'structured' | 'firm' | 'urgent',
    riskLevel: RiskLevel
  ) {
    const currency = invoice.currency || 'INR';
    const symbol = currency === 'INR' ? '₹' : '$';
    const amountStr = `${symbol}${Number(invoice.balance_due).toLocaleString('en-IN')}`;
    const paymentLink = `https://pay.brightloop.io/checkout/${invoice.invoice_number}?token=sec_${invoice.id.slice(0, 8)}`;

    let subject = '';
    let messageBody = '';
    let channel: 'email' | 'sms' | 'whatsapp' = 'email';
    let callToAction = 'Pay Invoice Online';

    switch (tone) {
      case 'diplomatic':
        subject = `Gentle Reminder: Brightloop Invoice ${invoice.invoice_number} for ${customer.company || customer.name}`;
        messageBody = `Dear ${customer.name},\n\nWe hope your team is enjoying your Brightloop subscription. This is a friendly reminder that invoice ${invoice.invoice_number} for ${amountStr} was scheduled for settlement on ${invoice.due_date}.\n\nIf you have already processed this transaction via NEFT/RTGS, please reply with the payment reference so our finance team can reconcile your ledger.\n\nTo settle instantly via UPI, Corporate Card, or Net Banking, please use the secure link below:\n${paymentLink}\n\nWarm regards,\nFinance & Accounts\nBrightloop Software India`;
        channel = 'email';
        callToAction = 'Review & Settle Invoice';
        break;

      case 'structured':
        subject = `Payment Pending (${daysOverdue} Days Past Due): Invoice ${invoice.invoice_number}`;
        messageBody = `Dear ${customer.name},\n\nWe are reaching out regarding outstanding invoice ${invoice.invoice_number} for ${amountStr}, which is currently overdue by ${daysOverdue} days (Due date: ${invoice.due_date}).\n\nTo ensure uninterrupted SaaS service access for your organization, please complete the settlement at your earliest convenience.\n\nQuick Settlement Link (18% GST invoice attached):\n${paymentLink}\n\nIf you need an updated statement of accounts or wish to split this into two tranches, please respond directly to this email.\n\nBest regards,\nAccounts Receivable Team\nBrightloop`;
        channel = 'email';
        callToAction = 'Make Instant Payment';
        break;

      case 'firm':
        subject = `URGENT: Outstanding Balance on Invoice ${invoice.invoice_number} — Action Required`;
        messageBody = `Attention: ${customer.name} / Finance Department (${customer.company}),\n\nYour Brightloop subscription invoice ${invoice.invoice_number} of ${amountStr} is now ${daysOverdue} days overdue. Despite previous notices, we have not received payment confirmation.\n\nPlease be advised that our automated billing engine will place your tenant workspace on temporary read-only mode if payment is not received within the next 48 hours.\n\nImmediate Settlement Portal (Zero gateway surcharge):\n${paymentLink}\n\nPlease settle immediately to avoid any service interruption.\n\nSincerely,\nCredit Risk & Recovery Desk\nBrightloop Software`;
        channel = 'whatsapp';
        callToAction = 'Settle Balance Immediately';
        break;

      case 'urgent':
        subject = `FINAL NOTICE: Service Suspension Warning — Account ${customer.company || customer.name}`;
        messageBody = `URGENT NOTICE: ${customer.name} (${customer.company})\n\nInvoice ${invoice.invoice_number} for ${amountStr} is critically delinquent (${daysOverdue} days overdue). Risk Score: ${riskLevel.toUpperCase()}.\n\nYour subscription is scheduled for immediate suspension. Continued default will result in termination of service, loss of API keys, and referral to our legal recovery partners as per your master service agreement.\n\nDirect Settlement Gateway:\n${paymentLink}\n\nIf payment was initiated, call +91-80-4990-1122 or send UTR immediately.\n\nCollections Operations,\nBrightloop Software`;
        channel = 'whatsapp';
        callToAction = 'Pay Delinquent Balance Now';
        break;
    }

    return {
      channel,
      tone,
      subject,
      messageBody,
      callToAction,
      paymentLink,
    };
  }

  /**
   * Logs risk assessment results to Supabase table `gravity_risk_logs` or memory.
   */
  public static async logAssessmentAudit(assessment: GravityRiskAssessment): Promise<void> {
    try {
      if (isSupabaseConfigured()) {
        await (supabase as any).from('gravity_risk_logs').insert({
          invoice_id: assessment.invoiceId,
          customer_id: assessment.customerId,
          default_risk_score: assessment.defaultRiskScore,
          risk_level: assessment.riskLevel,
          days_overdue: assessment.daysOverdue,
          recommended_action: assessment.recommendedAction,
          generated_recovery_message: assessment.recoveryCommunications.messageBody,
          communication_channel: assessment.recoveryCommunications.channel,
          message_status: 'drafted',
        });
      }
    } catch (err) {
      console.warn('Could not record gravity risk log to database:', err);
    }
  }

  /**
   * Marks communication as sent and triggers webhook or simulated dispatch.
   */
  public static async dispatchRecoveryCommunication(
    assessment: GravityRiskAssessment
  ): Promise<{ success: boolean; channel: string; dispatchedAt: string }> {
    console.info(
      `🚀 [Gravity AI] Dispatching ${assessment.recoveryCommunications.channel.toUpperCase()} recovery message to customer ${assessment.customerName} (${assessment.customerName}):`,
      assessment.recoveryCommunications.subject
    );

    // If Supabase is connected, update log
    if (isSupabaseConfigured()) {
      await (supabase as any)
        .from('gravity_risk_logs')
        .update({ message_status: 'sent' })
        .eq('invoice_id', assessment.invoiceId);
    }

    return {
      success: true,
      channel: assessment.recoveryCommunications.channel,
      dispatchedAt: new Date().toLocaleTimeString(),
    };
  }
}
