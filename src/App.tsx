import React, { useState, useEffect } from 'react';
import { store } from './lib/storage';
import { Customer, ProductPlan, Subscription, Invoice, Payment } from './types/database';
import { ActiveTab, Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { SubscriptionsView } from './components/subscriptions/SubscriptionsView';
import { QuotationsView } from './components/quotations/QuotationsView';
import { InvoicesView } from './components/invoices/InvoicesView';
import { PaymentsView } from './components/payments/PaymentsView';
import { CustomersView } from './components/customers/CustomersView';
import { ProductsView } from './components/products/ProductsView';
import { CustomerPortalView } from './components/portal/CustomerPortalView';
import { SqlConsoleView } from './components/sql/SqlConsoleView';
import { ScheduledBillingRunResult } from './types/models';
import { CheckCircle2 } from 'lucide-react';
import './styles/brightloop.css';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [portalCustomerId, setPortalCustomerId] = useState<string | undefined>();

  // Reactive state synced with SQL Database
  const [customers, setCustomers] = useState<Customer[]>(() => store.getCustomers());
  const [plans, setPlans] = useState<ProductPlan[]>(() => store.getPlans());
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() => store.getSubscriptions());
  const [invoices, setInvoices] = useState<Invoice[]>(() => store.getInvoices());
  const [payments, setPayments] = useState<Payment[]>(() => store.getPayments());

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setCustomers(store.getCustomers());
      setPlans(store.getPlans());
      setSubscriptions(store.getSubscriptions());
      setInvoices(store.getInvoices());
      setPayments(store.getPayments());
    });
    return () => unsubscribe();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleBillingRunComplete = (res: ScheduledBillingRunResult) => {
    showToast(
      res.message ||
        `SQL procedure complete: Generated ${res.invoicesGenerated} invoices with 18% GST.`
    );
  };

  const handleOpenPortalAsCustomer = (customerId: string) => {
    setPortalCustomerId(customerId);
    setActiveTab('portal');
  };

  const quotationCount = subscriptions.filter(
    (s) => s.status === 'quotation' || s.status === 'draft'
  ).length;

  const getPageInfo = (): { title: string; subtitle: string } => {
    switch (activeTab) {
      case 'dashboard':
        return {
          title: 'Overview',
          subtitle: 'A clear view of your subscription business',
        };
      case 'subscriptions':
        return {
          title: 'Subscription Lifecycle Management',
          subtitle: 'Enforced state transitions (Draft → Quotation → Confirmed → Active → Closed/Paused)',
        };
      case 'quotations':
        return {
          title: 'Sales Quotations & Proposals',
          subtitle: 'Formal recurring contract proposals with GST and 1-click conversion to subscription',
        };
      case 'invoices':
        return {
          title: 'Tax Invoices & Billing Cycles',
          subtitle: 'Generated 18% GST invoices, automated due dates, and Gravity AI default risk scores',
        };
      case 'payments':
        return {
          title: 'Payment Transactions & Reconciliation',
          subtitle: 'Manual and gateway payment records matched to unpaid client balances',
        };
      case 'customers':
        return {
          title: 'Client Directory & Tax Profiles',
          subtitle: 'Company profiles, GSTIN tax identifiers, credit limits, and historical risk scoring',
        };
      case 'products':
        return {
          title: 'Products & Subscription Plans',
          subtitle: 'Recurring intervals, rate cards, capabilities, and subscriber distributions',
        };
      case 'portal':
        return {
          title: 'Customer Self-Service Portal',
          subtitle: 'Client workspace to inspect active plans, download invoices, and settle balances',
        };
      case 'sql':
        return {
          title: 'SQL Workbench & Console',
          subtitle: 'Direct standard SQL query editor and database inspector (brightloop.db)',
        };
    }
  };

  const { title, subtitle } = getPageInfo();

  return (
    <div className="bl-layout">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        counts={{
          subscriptions: subscriptions.length,
          invoices: invoices.length,
          quotations: quotationCount,
        }}
        onToast={showToast}
      />

      {/* Main Panel */}
      <main className="bl-main">
        <Header
          title={title}
          subtitle={subtitle}
          onBillingRunComplete={handleBillingRunComplete}
          onSearch={setSearchTerm}
          onError={showToast}
        />

        <div className="bl-content" key={activeTab}>
          {activeTab === 'dashboard' && (
            <DashboardView
              subscriptions={subscriptions}
              invoices={invoices}
              customers={customers}
              payments={payments}
              onNavigateTab={setActiveTab}
              onToast={showToast}
            />
          )}

          {activeTab === 'subscriptions' && (
            <SubscriptionsView
              subscriptions={subscriptions}
              customers={customers}
              plans={plans}
              onToast={showToast}
              searchTerm={searchTerm}
            />
          )}

          {activeTab === 'quotations' && (
            <QuotationsView
              subscriptions={subscriptions}
              customers={customers}
              plans={plans}
              onToast={showToast}
              searchTerm={searchTerm}
            />
          )}

          {activeTab === 'invoices' && (
            <InvoicesView
              invoices={invoices}
              customers={customers}
              onToast={showToast}
              searchTerm={searchTerm}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentsView
              payments={payments}
              invoices={invoices}
              customers={customers}
              onToast={showToast}
              searchTerm={searchTerm}
            />
          )}

          {activeTab === 'customers' && (
            <CustomersView
              customers={customers}
              subscriptions={subscriptions}
              invoices={invoices}
              onToast={showToast}
              onOpenPortalAsCustomer={handleOpenPortalAsCustomer}
              searchTerm={searchTerm}
            />
          )}

          {activeTab === 'products' && (
            <ProductsView
              plans={plans}
              subscriptions={subscriptions}
              onToast={showToast}
              searchTerm={searchTerm}
            />
          )}

          {activeTab === 'portal' && (
            <CustomerPortalView
              customers={customers}
              subscriptions={subscriptions}
              invoices={invoices}
              plans={plans}
              initialCustomerId={portalCustomerId}
              onToast={showToast}
              onBackToAdmin={() => setActiveTab('dashboard')}
            />
          )}

          {activeTab === 'sql' && <SqlConsoleView />}
        </div>

        <footer className="bl-footer">
          <span>© {new Date().getFullYear()} Brightloop</span>
          <span>Subscription operations, made clear.</span>
        </footer>
      </main>

      {/* Real-Time Toast Alert */}
      {toastMessage && (
        <div className="bl-toast">
          <CheckCircle2 size={18} color="#10b981" />
          <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
export default App;
