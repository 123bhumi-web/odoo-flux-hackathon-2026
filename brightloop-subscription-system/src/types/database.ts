export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SubscriptionStatus =
  | 'draft'
  | 'quotation'
  | 'confirmed'
  | 'active'
  | 'paused'
  | 'closed';

export type InvoiceStatus = 'draft' | 'posted' | 'paid' | 'overdue' | 'void';

export type BillingInterval = 'monthly' | 'quarterly' | 'annually';

export type PaymentMethod =
  | 'credit_card'
  | 'upi'
  | 'bank_transfer'
  | 'stripe'
  | 'net_banking';

export type RiskLevel = 'low' | 'medium' | 'high' | 'severe';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  gstin: string; // Indian GST number (e.g., 27AABCN1234A1Z5)
  billing_address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  credit_limit: number;
  default_payment_method: PaymentMethod;
  risk_score: number; // 0 - 100
  created_at: string;
  updated_at: string;
}

export interface ProductPlan {
  id: string;
  name: string;
  code: string;
  description: string;
  interval: BillingInterval;
  unit_amount: number;
  currency: string;
  gst_rate: number; // default 0.18 (18%)
  is_active: boolean;
  features: string[];
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  subscription_number: string;
  customer_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  billing_interval: BillingInterval;
  current_period_start: string; // YYYY-MM-DD
  current_period_end: string; // YYYY-MM-DD
  next_billing_date: string; // YYYY-MM-DD
  last_billed_date: string | null;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  subtotal: number;
  tax_rate: number; // 0.18
  tax_amount: number;
  total_amount: number;
  currency: string;
  auto_renew: boolean;
  notes?: string;
  paused_at?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
  // Joined relation fields
  customer?: Customer;
  plan?: ProductPlan;
}

export interface SubscriptionItem {
  id: string;
  subscription_id: string;
  item_type: 'plan' | 'addon' | 'setup_fee';
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  subscription_id: string | null;
  customer_id: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  period_start: string;
  period_end: string;
  subtotal: number;
  tax_rate: number; // 0.18
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  currency: string;
  notes?: string;
  payment_terms: string;
  created_at: string;
  updated_at: string;
  // Joined relation fields
  customer?: Customer;
  subscription?: Subscription;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  created_at: string;
}

export interface Payment {
  id: string;
  payment_number: string;
  invoice_id: string;
  customer_id: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_method: PaymentMethod;
  status: 'completed' | 'pending' | 'failed';
  transaction_reference?: string;
  notes?: string;
  created_at: string;
  // Joined relation fields
  invoice?: Invoice;
  customer?: Customer;
}

export interface GravityRiskLog {
  id: string;
  invoice_id: string;
  customer_id: string;
  default_risk_score: number;
  risk_level: RiskLevel;
  days_overdue: number;
  recommended_action: string;
  generated_recovery_message: string;
  communication_channel: 'email' | 'sms' | 'whatsapp';
  message_status: 'drafted' | 'sent' | 'acknowledged';
  analyzed_at: string;
}

export interface Database {
  public: {
    Tables: {
      customers: {
        Row: Customer;
        Insert: Omit<Customer, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Customer, 'id'>>;
      };
      products_plans: {
        Row: ProductPlan;
        Insert: Omit<ProductPlan, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ProductPlan, 'id'>>;
      };
      subscriptions: {
        Row: Subscription;
        Insert: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Subscription, 'id'>>;
      };
      subscription_items: {
        Row: SubscriptionItem;
        Insert: Omit<SubscriptionItem, 'id' | 'created_at'>;
        Update: Partial<Omit<SubscriptionItem, 'id'>>;
      };
      invoices: {
        Row: Invoice;
        Insert: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Invoice, 'id'>>;
      };
      invoice_items: {
        Row: InvoiceItem;
        Insert: Omit<InvoiceItem, 'id' | 'created_at'>;
        Update: Partial<Omit<InvoiceItem, 'id'>>;
      };
      payments: {
        Row: Payment;
        Insert: Omit<Payment, 'id' | 'created_at'>;
        Update: Partial<Omit<Payment, 'id'>>;
      };
      gravity_risk_logs: {
        Row: GravityRiskLog;
        Insert: Omit<GravityRiskLog, 'id' | 'analyzed_at'>;
        Update: Partial<Omit<GravityRiskLog, 'id'>>;
      };
    };
    Functions: {
      run_scheduled_billing: {
        Args: { p_run_date?: string };
        Returns: Json;
      };
    };
  };
}
