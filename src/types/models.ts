import { SubscriptionStatus, InvoiceStatus, RiskLevel } from './database';

// Allowed State Transitions according to Brightloop specification:
// Draft -> Quotation -> Confirmed -> Active -> Closed/Paused
export const ALLOWED_SUBSCRIPTION_TRANSITIONS: Record<
  SubscriptionStatus,
  SubscriptionStatus[]
> = {
  draft: ['quotation', 'closed'],
  quotation: ['confirmed', 'draft', 'closed'],
  confirmed: ['active', 'closed'],
  active: ['paused', 'closed'],
  paused: ['active', 'closed'],
  closed: [], // Terminal state
};

export interface SubscriptionStateRule {
  from: SubscriptionStatus;
  to: SubscriptionStatus;
  actionLabel: string;
  description: string;
  badgeVariant: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export const STATE_ACTION_MAP: Record<SubscriptionStatus, {
  nextActions: {
    target: SubscriptionStatus;
    label: string;
    variant: 'primary' | 'secondary' | 'danger' | 'warning' | 'success';
    icon?: string;
  }[];
  description: string;
}> = {
  draft: {
    nextActions: [
      { target: 'quotation', label: 'Send Quotation', variant: 'primary' },
      { target: 'closed', label: 'Discard / Close', variant: 'danger' },
    ],
    description: 'Initial draft. Items and discounts can be modified freely.',
  },
  quotation: {
    nextActions: [
      { target: 'confirmed', label: 'Customer Confirm Order', variant: 'success' },
      { target: 'draft', label: 'Revise Quote', variant: 'secondary' },
      { target: 'closed', label: 'Reject Quote', variant: 'danger' },
    ],
    description: 'Sent to customer. Awaiting agreement and digital sign-off.',
  },
  confirmed: {
    nextActions: [
      { target: 'active', label: 'Activate Subscription', variant: 'primary' },
      { target: 'closed', label: 'Cancel Agreement', variant: 'danger' },
    ],
    description: 'Order confirmed. Ready for service provisioning and billing schedule initiation.',
  },
  active: {
    nextActions: [
      { target: 'paused', label: 'Pause Subscription', variant: 'warning' },
      { target: 'closed', label: 'Terminate / Close', variant: 'danger' },
    ],
    description: 'Subscription actively being billed according to billing frequency.',
  },
  paused: {
    nextActions: [
      { target: 'active', label: 'Resume Subscription', variant: 'success' },
      { target: 'closed', label: 'Terminate / Close', variant: 'danger' },
    ],
    description: 'Billing suspended temporarily upon customer request or risk hold.',
  },
  closed: {
    nextActions: [],
    description: 'Subscription terminated. No further recurring invoices will be generated.',
  },
};

export interface GravityRiskAssessment {
  invoiceId: string;
  customerId: string;
  customerName: string;
  invoiceNumber: string;
  totalAmount: number;
  balanceDue: number;
  daysOverdue: number;
  defaultRiskScore: number; // 0 to 100
  riskLevel: RiskLevel;
  riskFactors: string[];
  recommendedAction: string;
  recoveryCommunications: {
    channel: 'email' | 'sms' | 'whatsapp';
    tone: 'diplomatic' | 'structured' | 'firm' | 'urgent';
    subject: string;
    messageBody: string;
    callToAction: string;
    paymentLink: string;
  };
  analyzedAt: string;
}

export interface ScheduledBillingRunResult {
  runDate: string;
  subscriptionsScanned: number;
  invoicesGenerated: number;
  skippedDuplicates: number;
  invoices: {
    invoiceId: string;
    invoiceNumber: string;
    subscriptionId: string;
    customerName: string;
    totalAmount: number;
    periodStart: string;
    periodEnd: string;
    advancedNextBilling: string;
  }[];
  status: 'success' | 'partial' | 'error';
  message?: string;
}
