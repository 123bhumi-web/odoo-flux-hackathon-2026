import { Customer, ProductPlan, Subscription, Invoice, Payment, SubscriptionStatus } from '../types/database';
import { ScheduledBillingRunResult, GravityRiskAssessment } from '../types/models';

export interface SqlQueryResult {
  success: boolean;
  rows?: any[];
  count?: number;
  message?: string;
  error?: string;
}

/**
 * SQL Database Client
 * Replaces Supabase with direct standard SQL queries to the SQL Database Engine.
 */
export class SqlClient {
  private static async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const res = await fetch(endpoint, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });
      if (!res.ok) {
        throw new Error(`SQL Server Error: ${res.statusText}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      console.warn(`[SQL Client] Network request to ${endpoint} failed, falling back to local state:`, err);
      throw err;
    }
  }

  // --- Customers ---
  public static async getCustomers(): Promise<Customer[]> {
    return this.request<Customer[]>('/api/customers');
  }

  public static async addCustomer(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> {
    return this.request<Customer>('/api/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    });
  }

  // --- Plans ---
  public static async getPlans(): Promise<ProductPlan[]> {
    return this.request<ProductPlan[]>('/api/plans');
  }

  public static async addPlan(plan: Omit<ProductPlan, 'id' | 'created_at' | 'updated_at'>): Promise<ProductPlan> {
    return this.request<ProductPlan>('/api/plans', {
      method: 'POST',
      body: JSON.stringify(plan),
    });
  }

  // --- Subscriptions ---
  public static async getSubscriptions(): Promise<Subscription[]> {
    return this.request<Subscription[]>('/api/subscriptions');
  }

  public static async addSubscription(
    sub: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Subscription> {
    return this.request<Subscription>('/api/subscriptions', {
      method: 'POST',
      body: JSON.stringify(sub),
    });
  }

  /**
   * Enforces state transition constraints in SQL:
   * Draft -> Quotation -> Confirmed -> Active -> Closed/Paused
   */
  public static async transitionSubscriptionState(
    id: string,
    targetState: SubscriptionStatus
  ): Promise<{ success: boolean; error?: string }> {
    return this.request<{ success: boolean; error?: string }>(
      `/api/subscriptions/${id}/transition`,
      {
        method: 'POST',
        body: JSON.stringify({ targetState }),
      }
    );
  }

  // --- Invoices ---
  public static async getInvoices(): Promise<Invoice[]> {
    return this.request<Invoice[]>('/api/invoices');
  }

  public static async addInvoice(invoice: Invoice): Promise<Invoice> {
    return this.request<Invoice>('/api/invoices', {
      method: 'POST',
      body: JSON.stringify(invoice),
    });
  }

  // --- Payments ---
  public static async getPayments(): Promise<Payment[]> {
    return this.request<Payment[]>('/api/payments');
  }

  public static async recordPayment(payment: Omit<Payment, 'id' | 'created_at'>): Promise<Payment> {
    return this.request<Payment>('/api/payments', {
      method: 'POST',
      body: JSON.stringify(payment),
    });
  }

  // --- Stored SQL Procedure: run_scheduled_billing ---
  public static async runScheduledBilling(runDate?: string): Promise<ScheduledBillingRunResult> {
    return this.request<ScheduledBillingRunResult>('/api/billing/run', {
      method: 'POST',
      body: JSON.stringify({ run_date: runDate || new Date().toISOString().split('T')[0] }),
    });
  }

  // --- Gravity Risk Logs ---
  public static async logGravityRisk(assessment: GravityRiskAssessment): Promise<void> {
    try {
      await this.request('/api/gravity/log', {
        method: 'POST',
        body: JSON.stringify(assessment),
      });
    } catch {
      // safe fallback
    }
  }

  // --- Raw SQL Query Execution (SQL Workbench) ---
  public static async executeRawSql(query: string): Promise<SqlQueryResult> {
    return this.request<SqlQueryResult>('/api/sql/execute', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  }
}
