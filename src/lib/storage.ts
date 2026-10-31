import { Customer, ProductPlan, Subscription, Invoice, Payment, SubscriptionStatus, InvoiceStatus } from '../types/database';
import {
  INITIAL_CUSTOMERS,
  INITIAL_PLANS,
  INITIAL_SUBSCRIPTIONS,
  INITIAL_INVOICES,
  INITIAL_PAYMENTS,
} from './mockData';
import { SqlClient } from './sqlClient';
import { ALLOWED_SUBSCRIPTION_TRANSITIONS } from '../types/models';

type Listener = () => void;

class BrightloopSQLStore {
  private customers: Customer[] = [];
  private plans: ProductPlan[] = [];
  private subscriptions: Subscription[] = [];
  private invoices: Invoice[] = [];
  private payments: Payment[] = [];
  private listeners: Set<Listener> = new Set();
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private async init() {
    if (this.isInitialized) return;

    // Load cached records first for zero-latency paint
    const cachedCustomers = localStorage.getItem('bl_customers');
    const cachedPlans = localStorage.getItem('bl_plans');
    const cachedSubs = localStorage.getItem('bl_subscriptions');
    const cachedInvoices = localStorage.getItem('bl_invoices');
    const cachedPayments = localStorage.getItem('bl_payments');

    this.customers = cachedCustomers ? JSON.parse(cachedCustomers) : [...INITIAL_CUSTOMERS];
    this.plans = cachedPlans ? JSON.parse(cachedPlans) : [...INITIAL_PLANS];
    this.subscriptions = cachedSubs ? JSON.parse(cachedSubs) : [...INITIAL_SUBSCRIPTIONS];
    this.invoices = cachedInvoices ? JSON.parse(cachedInvoices) : [...INITIAL_INVOICES];
    this.payments = cachedPayments ? JSON.parse(cachedPayments) : [...INITIAL_PAYMENTS];

    this.isInitialized = true;
    this.persist();

    // Sync from live SQL Database
    await this.syncFromSqlDatabase();
  }

  public async syncFromSqlDatabase() {
    try {
      const [custs, plans, subs, invs, pays] = await Promise.all([
        SqlClient.getCustomers(),
        SqlClient.getPlans(),
        SqlClient.getSubscriptions(),
        SqlClient.getInvoices(),
        SqlClient.getPayments(),
      ]);

      if (custs && custs.length > 0) this.customers = custs;
      if (plans && plans.length > 0) this.plans = plans;
      if (subs && subs.length > 0) this.subscriptions = subs;
      if (invs && invs.length > 0) this.invoices = invs;
      if (pays && pays.length > 0) this.payments = pays;

      console.info('⚡ [Brightloop] Synced with SQL Database (brightloop.db)');
      this.notify();
    } catch (err) {
      console.info('ℹ️ [Brightloop] SQL server sync notice (using cached/active memory state):', err);
    }
  }

  private persist() {
    localStorage.setItem('bl_customers', JSON.stringify(this.customers));
    localStorage.setItem('bl_plans', JSON.stringify(this.plans));
    localStorage.setItem('bl_subscriptions', JSON.stringify(this.subscriptions));
    localStorage.setItem('bl_invoices', JSON.stringify(this.invoices));
    localStorage.setItem('bl_payments', JSON.stringify(this.payments));
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.persist();
    this.listeners.forEach((fn) => fn());
  }

  // --- Customers ---
  public getCustomers(): Customer[] {
    return [...this.customers];
  }

  public getCustomerById(id: string): Customer | undefined {
    return this.customers.find((c) => c.id === id);
  }

  public addCustomer(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Customer {
    const newCust: Customer = {
      ...customer,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.customers.unshift(newCust);
    this.notify();

    // Async push to SQL Database
    SqlClient.addCustomer(customer)
      .then((saved) => {
        if (saved) {
          const idx = this.customers.findIndex((c) => c.id === newCust.id);
          if (idx !== -1) this.customers[idx] = saved;
          this.notify();
        }
      })
      .catch(() => {});

    return newCust;
  }

  // --- Plans ---
  public getPlans(): ProductPlan[] {
    return [...this.plans];
  }

  public getPlanById(id: string): ProductPlan | undefined {
    return this.plans.find((p) => p.id === id);
  }

  public addPlan(plan: Omit<ProductPlan, 'id' | 'created_at' | 'updated_at'>): ProductPlan {
    const newPlan: ProductPlan = {
      ...plan,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.plans.push(newPlan);
    this.notify();

    SqlClient.addPlan(plan)
      .then((saved) => {
        if (saved) {
          const idx = this.plans.findIndex((p) => p.id === newPlan.id);
          if (idx !== -1) this.plans[idx] = saved;
          this.notify();
        }
      })
      .catch(() => {});

    return newPlan;
  }

  // --- Subscriptions ---
  public getSubscriptions(): Subscription[] {
    return this.subscriptions.map((sub) => ({
      ...sub,
      customer: sub.customer || this.getCustomerById(sub.customer_id),
      plan: sub.plan || this.getPlanById(sub.plan_id),
    }));
  }

  public getSubscriptionById(id: string): Subscription | undefined {
    const sub = this.subscriptions.find((s) => s.id === id);
    if (!sub) return undefined;
    return {
      ...sub,
      customer: sub.customer || this.getCustomerById(sub.customer_id),
      plan: sub.plan || this.getPlanById(sub.plan_id),
    };
  }

  public addSubscription(
    subData: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>
  ): Subscription {
    const newSub: Subscription = {
      ...subData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      customer: this.getCustomerById(subData.customer_id),
      plan: this.getPlanById(subData.plan_id),
    };
    this.subscriptions.unshift(newSub);
    this.notify();

    SqlClient.addSubscription(subData)
      .then((saved) => {
        if (saved) {
          const idx = this.subscriptions.findIndex((s) => s.id === newSub.id);
          if (idx !== -1) this.subscriptions[idx] = saved;
          this.notify();
        }
      })
      .catch(() => {});

    return newSub;
  }

  public updateSubscription(sub: Subscription): void {
    const index = this.subscriptions.findIndex((s) => s.id === sub.id);
    if (index !== -1) {
      this.subscriptions[index] = {
        ...sub,
        updated_at: new Date().toISOString(),
      };
      this.notify();
    }
  }

  /**
   * Enforces strict state transitions:
   * Draft -> Quotation -> Confirmed -> Active -> Closed/Paused
   */
  public transitionSubscriptionState(
    subscriptionId: string,
    targetState: SubscriptionStatus
  ): { success: boolean; error?: string } {
    const sub = this.subscriptions.find((s) => s.id === subscriptionId);
    if (!sub) return { success: false, error: 'Subscription not found' };

    const allowed = ALLOWED_SUBSCRIPTION_TRANSITIONS[sub.status];
    if (!allowed || !allowed.includes(targetState)) {
      const err = `SQL Constraint Violation: Cannot transition from "${sub.status}" to "${targetState}". Allowed transitions: ${allowed ? allowed.join(', ') : 'None'}`;
      return { success: false, error: err };
    }

    sub.status = targetState;
    sub.updated_at = new Date().toISOString();

    if (targetState === 'paused') {
      sub.paused_at = new Date().toISOString();
    } else if (targetState === 'closed') {
      sub.closed_at = new Date().toISOString();
    } else if (targetState === 'active') {
      sub.paused_at = null;
    }

    this.notify();

    // Async push transition to SQL Database
    SqlClient.transitionSubscriptionState(subscriptionId, targetState).catch((err) => {
      console.warn('SQL backend transition notice:', err);
    });

    return { success: true };
  }

  // --- Invoices ---
  public getInvoices(): Invoice[] {
    return this.invoices.map((inv) => ({
      ...inv,
      customer: inv.customer || this.getCustomerById(inv.customer_id),
      subscription: inv.subscription_id ? this.getSubscriptionById(inv.subscription_id) : undefined,
    }));
  }

  public getInvoiceById(id: string): Invoice | undefined {
    const inv = this.invoices.find((i) => i.id === id);
    if (!inv) return undefined;
    return {
      ...inv,
      customer: inv.customer || this.getCustomerById(inv.customer_id),
      subscription: inv.subscription_id ? this.getSubscriptionById(inv.subscription_id) : undefined,
    };
  }

  public addInvoice(invoice: Invoice): Invoice {
    this.invoices.unshift(invoice);
    this.notify();

    SqlClient.addInvoice(invoice).catch((error: unknown) => {
      console.error('Could not persist invoice to SQL database:', error);
    });
    return invoice;
  }

  public updateInvoiceStatus(id: string, status: InvoiceStatus): void {
    const inv = this.invoices.find((i) => i.id === id);
    if (inv) {
      inv.status = status;
      inv.updated_at = new Date().toISOString();
      this.notify();
    }
  }

  // --- Payments ---
  public getPayments(): Payment[] {
    return this.payments.map((p) => ({
      ...p,
      customer: p.customer || this.getCustomerById(p.customer_id),
      invoice: p.invoice || this.getInvoiceById(p.invoice_id),
    }));
  }

  public recordPayment(payment: Omit<Payment, 'id' | 'created_at'>): Payment {
    if (!Number.isFinite(payment.amount) || payment.amount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    const inv = this.invoices.find((i) => i.id === payment.invoice_id);
    if (!inv || inv.customer_id !== payment.customer_id) {
      throw new Error('Payment must reference a valid invoice for this customer.');
    }
    if (payment.amount > Number(inv.balance_due)) {
      throw new Error('Payment amount cannot exceed the invoice balance due.');
    }

    const newPayment: Payment = {
      ...payment,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      customer: this.getCustomerById(payment.customer_id),
      invoice: this.getInvoiceById(payment.invoice_id),
    };
    this.payments.unshift(newPayment);

    // Reconcile the invoice in memory before notifying subscribers.
    if (inv && payment.status === 'completed') {
      const currentPaid = Number(inv.amount_paid || 0);
      const newPaid = currentPaid + Number(payment.amount);
      const newBalance = Math.max(0, Number(inv.total_amount) - newPaid);

      inv.amount_paid = newPaid;
      inv.balance_due = newBalance;
      if (newBalance <= 0) {
        inv.status = 'paid';
      }
      inv.updated_at = new Date().toISOString();
    }

    this.notify();

    // Async push to SQL Database
    SqlClient.recordPayment(payment).catch(() => {});
    return newPayment;
  }

  // Reset to initial seed state
  public resetToSeed(): void {
    localStorage.removeItem('bl_customers');
    localStorage.removeItem('bl_plans');
    localStorage.removeItem('bl_subscriptions');
    localStorage.removeItem('bl_invoices');
    localStorage.removeItem('bl_payments');
    this.isInitialized = false;
    this.init();
    this.notify();
  }
}

export const store = new BrightloopSQLStore();
