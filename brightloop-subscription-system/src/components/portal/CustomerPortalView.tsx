import React, { useState } from 'react';
import { Customer, Subscription, Invoice, ProductPlan } from '../../types/database';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { store } from '../../lib/storage';
import {
  Globe,
  CreditCard,
  Download,
  Calendar,
  CheckCircle,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  ChevronDown,
  Layers,
} from 'lucide-react';

interface CustomerPortalViewProps {
  customers: Customer[];
  subscriptions: Subscription[];
  invoices: Invoice[];
  plans: ProductPlan[];
  initialCustomerId?: string;
  onToast: (msg: string) => void;
  onBackToAdmin: () => void;
}

export const CustomerPortalView: React.FC<CustomerPortalViewProps> = ({
  customers,
  subscriptions,
  invoices,
  plans,
  initialCustomerId,
  onToast,
  onBackToAdmin,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    initialCustomerId || (customers[0] ? customers[0].id : '')
  );
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const currentCustomer = customers.find((c) => c.id === selectedCustomerId);
  const customerSubs = subscriptions.filter((s) => s.customer_id === selectedCustomerId);
  const customerInvoices = invoices.filter((i) => i.customer_id === selectedCustomerId);

  const activeSub = customerSubs.find((s) => s.status === 'active') || customerSubs[0];
  const overdueInvoice = customerInvoices.find((i) => i.status === 'overdue' || i.balance_due > 0);

  const handlePayInvoice = (inv: Invoice) => {
    setPayingInvoice(inv);
  };

  const handleConfirmPortalPayment = (method: string) => {
    if (!payingInvoice) return;
    setIsProcessingPayment(true);

    setTimeout(() => {
      store.recordPayment({
        payment_number: `PAY-PORTAL-${Math.floor(1000 + Math.random() * 9000)}`,
        invoice_id: payingInvoice.id,
        customer_id: payingInvoice.customer_id,
        amount: payingInvoice.balance_due,
        currency: payingInvoice.currency || 'INR',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: method as any,
        status: 'completed',
        transaction_reference: `PORTAL-UPI-${Math.floor(10000000 + Math.random() * 90000000)}`,
        notes: 'Settled via Customer Self-Service Portal checkout',
      });

      setIsProcessingPayment(false);
      setPayingInvoice(null);
      onToast(`Payment of ₹${Number(payingInvoice.balance_due).toLocaleString('en-IN')} confirmed! Invoice marked as PAID.`);
    }, 800);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Top Banner & Customer Switcher */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
          padding: '24px 32px',
          borderRadius: '16px',
          color: '#ffffff',
          marginBottom: '28px',
          boxShadow: '0 4px 20px rgba(49, 46, 129, 0.25)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Globe size={18} color="#a5b4fc" />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#c7d2fe', textTransform: 'uppercase' }}>
              Brightloop Customer Self-Service Portal
            </span>
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '2px 0' }}>
            {currentCustomer?.company || currentCustomer?.name}
          </h2>
          <div style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
            GSTIN: {currentCustomer?.gstin || 'Unregistered'} • {currentCustomer?.email}
          </div>
        </div>

        {/* Switch Persona */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <button
            className="bl-btn bl-btn-secondary bl-btn-sm"
            onClick={onBackToAdmin}
            style={{ fontSize: '0.78rem' }}
          >
            ← Back to Admin Console
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: '#c7d2fe' }}>View as client:</span>
            <select
              className="bl-select"
              style={{
                width: 'auto',
                fontSize: '0.8rem',
                padding: '4px 8px',
                background: 'rgba(255,255,255,0.15)',
                color: '#fff',
                borderColor: 'rgba(255,255,255,0.25)',
              }}
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id} style={{ color: '#000' }}>
                  {c.name} ({c.company})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Overdue Notification Alert if any */}
      {overdueInvoice && (
        <div
          style={{
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={24} color="#e11d48" />
            <div>
              <div style={{ fontWeight: 700, color: '#9f1239', fontSize: '0.92rem' }}>
                Outstanding Invoice {overdueInvoice.invoice_number} (Due: {overdueInvoice.due_date})
              </div>
              <div style={{ fontSize: '0.82rem', color: '#be123c' }}>
                Balance due: ₹{Number(overdueInvoice.balance_due).toLocaleString('en-IN')} (Includes 18% GST). Settle immediately to avoid subscription suspension.
              </div>
            </div>
          </div>
          <button
            className="bl-btn bl-btn-danger bl-btn-sm"
            onClick={() => handlePayInvoice(overdueInvoice)}
          >
            <CreditCard size={15} /> Pay Balance Now
          </button>
        </div>
      )}

      {/* Active Subscription Overview Card */}
      <div className="bl-card" style={{ marginBottom: '28px' }}>
        <div className="bl-card-header">
          <div>
            <h3 className="bl-card-title">Current Active Subscription</h3>
            <p className="bl-card-subtitle">Manage plan entitlements, renewal frequency, and licenses</p>
          </div>
          {activeSub && <Badge status={activeSub.status} />}
        </div>

        {activeSub ? (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                padding: '20px',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                marginBottom: '20px',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>CURRENT PLAN</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  {activeSub.plan?.name}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'capitalize' }}>
                  Interval: {activeSub.billing_interval}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>RECURRING RATE</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#4f46e5', marginTop: '2px' }}>
                  ₹{Number(activeSub.total_amount).toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Includes 18% GST</div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>NEXT RENEWAL DATE</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  {activeSub.next_billing_date}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>
                  Auto-Renew: Active
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>PROVISIONED SEATS</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  {activeSub.quantity} Licenses
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Workspace Allocated</div>
              </div>
            </div>

            {/* Plan Features */}
            {activeSub.plan?.features && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                  Plan Capabilities & Quotas:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {activeSub.plan.features.map((f, i) => (
                    <span
                      key={i}
                      style={{
                        background: '#f1f5f9',
                        border: '1px solid #e2e8f0',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        color: '#334155',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <CheckCircle size={13} color="#10b981" /> {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="bl-btn bl-btn-primary bl-btn-sm"
                onClick={() => setIsUpgradeModalOpen(true)}
              >
                <Layers size={14} /> Request Plan Upgrade
              </button>
            </div>
          </div>
        ) : (
          <p style={{ color: '#64748b' }}>No active subscription found for this account.</p>
        )}
      </div>

      {/* Invoices & Receipts Table */}
      <div className="bl-card">
        <div className="bl-card-header">
          <div>
            <h3 className="bl-card-title">Billing History & GST Tax Invoices</h3>
            <p className="bl-card-subtitle">Download official tax invoices or settle open balances</p>
          </div>
        </div>

        <div className="bl-table-container">
          <table className="bl-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Period</th>
                <th>Total (inc. GST)</th>
                <th>Status</th>
                <th>Balance Due</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {customerInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    No invoices on record.
                  </td>
                </tr>
              ) : (
                customerInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="bl-cell-primary">{inv.invoice_number}</td>
                    <td style={{ fontSize: '0.82rem' }}>
                      {inv.period_start} to {inv.period_end}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      ₹{Number(inv.total_amount).toLocaleString('en-IN')}
                    </td>
                    <td>
                      <Badge status={inv.status} />
                    </td>
                    <td
                      style={{
                        fontWeight: 700,
                        color: inv.balance_due > 0 ? '#dc2626' : '#059669',
                      }}
                    >
                      ₹{Number(inv.balance_due).toLocaleString('en-IN')}
                    </td>
                    <td>
                      {inv.balance_due > 0 ? (
                        <button
                          className="bl-btn bl-btn-primary bl-btn-sm"
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          onClick={() => handlePayInvoice(inv)}
                        >
                          <CreditCard size={13} /> Pay Now
                        </button>
                      ) : (
                        <button
                          className="bl-btn bl-btn-ghost bl-btn-sm"
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          onClick={() => window.print()}
                        >
                          <Download size={13} /> Receipt
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pay Now Simulated Gateway Modal */}
      {payingInvoice && (
        <Modal
          isOpen={Boolean(payingInvoice)}
          onClose={() => setPayingInvoice(null)}
          title={`Checkout — Invoice ${payingInvoice.invoice_number}`}
          maxWidth="500px"
        >
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Settlement Amount (18% GST included):</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>
              ₹{Number(payingInvoice.balance_due).toLocaleString('en-IN')}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            <button
              className="bl-btn bl-btn-secondary"
              style={{ justifyContent: 'space-between', padding: '14px' }}
              disabled={isProcessingPayment}
              onClick={() => handleConfirmPortalPayment('upi')}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                <span style={{ background: '#ecfdf5', color: '#059669', padding: '4px 8px', borderRadius: '4px' }}>UPI</span>
                Instant UPI (PhonePe / GPay / Paytm)
              </span>
              <ArrowUpRight size={16} />
            </button>

            <button
              className="bl-btn bl-btn-secondary"
              style={{ justifyContent: 'space-between', padding: '14px' }}
              disabled={isProcessingPayment}
              onClick={() => handleConfirmPortalPayment('credit_card')}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '4px 8px', borderRadius: '4px' }}>CARD</span>
                Corporate Credit / Debit Card
              </span>
              <ArrowUpRight size={16} />
            </button>

            <button
              className="bl-btn bl-btn-secondary"
              style={{ justifyContent: 'space-between', padding: '14px' }}
              disabled={isProcessingPayment}
              onClick={() => handleConfirmPortalPayment('net_banking')}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                <span style={{ background: '#fef3c7', color: '#b45309', padding: '4px 8px', borderRadius: '4px' }}>NET</span>
                Corporate Net Banking (HDFC, ICICI, SBI, Axis)
              </span>
              <ArrowUpRight size={16} />
            </button>
          </div>

          {isProcessingPayment && (
            <div style={{ textAlign: 'center', padding: '12px', color: '#4f46e5', fontWeight: 600 }}>
              Connecting to payment gateway & generating GST reconciliation...
            </div>
          )}
        </Modal>
      )}

      {/* Upgrade Request Modal */}
      <Modal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        title="Upgrade Subscription Plan"
        maxWidth="500px"
      >
        <div style={{ marginBottom: '16px', fontSize: '0.85rem', color: '#475569' }}>
          Select the target tier for your organization. Upgrades take effect immediately with pro-rated billing.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {plans.map((p) => (
            <div
              key={p.id}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{p.name}</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  ₹{p.unit_amount.toLocaleString('en-IN')} / {p.interval}
                </div>
              </div>
              <button
                className="bl-btn bl-btn-secondary bl-btn-sm"
                onClick={() => {
                  onToast(`Upgrade request for "${p.name}" submitted to account manager.`);
                  setIsUpgradeModalOpen(false);
                }}
              >
                Select Tier
              </button>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};
