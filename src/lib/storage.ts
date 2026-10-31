import { Customer, ProductPlan, Subscription, Invoice, Payment, SubscriptionStatus, InvoiceStatus } from '../types/database';
import {
  INITIAL_CUSTOMERS,
  INITIAL_PLANS,
  INITIAL_SUBSCRIPTIONS,
  INITIAL_INVOICES,
  INITIAL_PAYMENTS,
} from './mockData';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { ALLOWED_SUBSCRIPTION_TRANSITIONS } from '../types/models';

type Listener = () => void;

class BrightloopStore {
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

  private init() {
    if (this.isInitialized) return;

    // Load from localStorage or use initial seed
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

    // If Supabase is configured, trigger background sync
    if (isSupabaseConfigured()) {
      this.syncFromSupabase();
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

  public async syncFromSupabase() {
    try {
      const client = supabase as any;
      const [custRes, planRes, subRes, invRes, payRes] = await Promise.all([
        client.from('customers').select('*'),
        client.from('products_plans').select('*'),
        client.from('subscriptions').select('*'),
        client.from('invoices').select('*, items:invoice_items(*)'),
        client.from('payments').select('*'),
      ]);

      if (custRes.data && custRes.data.length > 0) this.customers = custRes.data as Customer[];
      if (planRes.data && planRes.data.length > 0) this.plans = planRes.data as ProductPlan[];
      if (subRes.data && subRes.data.length > 0) this.subscriptions = subRes.data as Subscription[];
      if (invRes.data && invRes.data.length > 0) this.invoices = invRes.data as Invoice[];
      if (payRes.data && payRes.data.length > 0) this.payments = payRes.data as Payment[];

      this.notify();
    } catch (err) {
      console.warn('Could not sync with Supabase tables:', err);
    }
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

    if (isSupabaseConfigured()) {
      (supabase as any).from('customers').insert(newCust);
    }
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

    if (isSupabaseConfigured()) {
      (supabase as any).from('products_plans').insert(newPlan);
    }
    return newPlan;
  }

  // --- Subscriptions ---
  public getSubscriptions(): Subscription[] {
    return this.subscriptions.map((sub) => ({
      ...sub,
      customer: this.getCustomerById(sub.customer_id),
      plan: this.getPlanById(sub.plan_id),
    }));
  }

  public getSubscriptionById(id: string): Subscription | undefined {
    const sub = this.subscriptions.find((s) => s.id === id);
    if (!sub) return undefined;
    return {
      ...sub,
      customer: this.getCustomerById(sub.customer_id),
      plan: this.getPlanById(sub.plan_id),
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
    };
    this.subscriptions.unshift(newSub);
    this.notify();

    if (isSupabaseConfigured()) {
      (supabase as any).from('subscriptions').insert(newSub);
    }
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

      if (isSupabaseConfigured()) {
        (supabase as any).from('subscriptions').update(sub).eq('id', sub.id);
      }
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
      const err = `Invalid state transition: Cannot change from "${sub.status}" to "${targetState}". Allowed transitions: ${allowed ? allowed.join(', ') : 'None'}`;
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

    if (isSupabaseConfigured()) {
      (supabase as any)
        .from('subscriptions')
        .update({
          status: targetState,
          paused_at: sub.paused_at,
          closed_at: sub.closed_at,
          updated_at: sub.updated_at,
        })
        .eq('id', subscriptionId);
    }

    return { success: true };
  }

  // --- Invoices ---
  public getInvoices(): Invoice[] {
    return this.invoices.map((inv) => ({
      ...inv,
      customer: this.getCustomerById(inv.customer_id),
      subscription: inv.subscription_id ? this.getSubscriptionById(inv.subscription_id) : undefined,
    }));
  }

  public getInvoiceById(id: string): Invoice | undefined {
    const inv = this.invoices.find((i) => i.id === id);
    if (!inv) return undefined;
    return {
      ...inv,
      customer: this.getCustomerById(inv.customer_id),
      subscription: inv.subscription_id ? this.getSubscriptionById(inv.subscription_id) : undefined,
    };
  }

  public addInvoice(invoice: Invoice): Invoice {
    this.invoices.unshift(invoice);
    this.notify();

    if (isSupabaseConfigured()) {
      const { id, created_at, updated_at, items, customer, subscription, ...invoiceRow } = invoice;
      const client = supabase as any;
      void (async () => {
        const { data, error } = await client
          .from('invoices')
          .insert(invoiceRow)
          .select('id')
          .single();
        if (error) {
          console.error('Could not insert invoice into Supabase:', error);
          return;
        }

        if (items?.length) {
          const itemRows = items.map(({ description, quantity, unit_price, amount }) => ({
            invoice_id: data.id,
            description,
            quantity,
            unit_price,
            amount,
          }));
          const { error: itemsError } = await client.from('invoice_items').insert(itemRows);
          if (itemsError) {
            console.error('Could not insert invoice items into Supabase:', itemsError);
          }
        }
      })().catch((error: unknown) => {
        console.error('Could not persist invoice to Supabase:', error);
      });
    }
    return invoice;
  }

  public updateInvoiceStatus(id: string, status: InvoiceStatus): void {
    const inv = this.invoices.find((i) => i.id === id);
    if (inv) {
      inv.status = status;
      inv.updated_at = new Date().toISOString();
      this.notify();

      if (isSupabaseConfigured()) {
        (supabase as any)
          .from('invoices')
          .update({ status, updated_at: inv.updated_at })
          .eq('id', id);
      }
    }
  }

  // --- Payments ---
  public getPayments(): Payment[] {
    return this.payments.map((p) => ({
      ...p,
      customer: this.getCustomerById(p.customer_id),
      invoice: this.getInvoiceById(p.invoice_id),
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
    };
    this.payments.unshift(newPayment);

    // Auto reconcile payment against invoice:
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

      if (isSupabaseConfigured()) {
        (supabase as any)
          .from('invoices')
          .update({
            amount_paid: inv.amount_paid,
            balance_due: inv.balance_due,
            status: inv.status,
            updated_at: inv.updated_at,
          })
          .eq('id', inv.id);
      }
    }

    this.notify();

    if (isSupabaseConfigured()) {
      (supabase as any).from('payments').insert(newPayment);
    }
    return newPayment;
  }

  // Reset to initial demo state
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

export const store = new BrightloopStore();
