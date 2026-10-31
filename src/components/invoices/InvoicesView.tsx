import React, { useState } from 'react';
import { Invoice, Customer } from '../../types/database';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { RiskModal } from '../common/RiskModal';
import { GravityRiskAssessment } from '../../types/models';
import { GravityService, getDaysOverdue } from '../../services/gravityService';
import { store } from '../../lib/storage';
import {
  Receipt,
  Sparkles,
  Zap,
  CreditCard,
  Printer,
  Calendar,
  AlertTriangle,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface InvoicesViewProps {
  invoices: Invoice[];
  customers: Customer[];
  onToast: (msg: string) => void;
  searchTerm?: string;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  invoices,
  customers,
  onToast,
  searchTerm = '',
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [assessment, setAssessment] = useState<GravityRiskAssessment | null>(null);
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);

  // Quick Payment Modal
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<any>('bank_transfer');
  const [txRef, setTxRef] = useState('');

  const filtered = invoices.filter((inv) => {
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(term) ||
      inv.customer?.name.toLowerCase().includes(term) ||
      inv.customer?.company.toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  const handleEvaluateRisk = async (invoice: Invoice, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEvaluatingId(invoice.id);
    try {
      const customer = customers.find((c) => c.id === invoice.customer_id);
      if (!customer) {
        onToast('Customer not found for this invoice');
        return;
      }
      const result = await GravityService.evaluateInvoiceDefaultRisk(invoice, customer);
      setAssessment(result);
    } catch (err) {
      console.error(err);
      onToast('Failed to evaluate default risk');
    } finally {
      setEvaluatingId(null);
    }
  };

  const handleOpenPaymentModal = (invoice: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedInvoice(invoice);
    setPaymentAmount(invoice.balance_due);
    setTxRef(`TXN-SIM-${Math.floor(100000 + Math.random() * 900000)}`);
    setIsPaymentOpen(true);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    store.recordPayment({
      payment_number: `PAY-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      invoice_id: selectedInvoice.id,
      customer_id: selectedInvoice.customer_id,
      amount: paymentAmount,
      currency: selectedInvoice.currency || 'INR',
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: paymentMethod,
      status: 'completed',
      transaction_reference: txRef,
      notes: 'Recorded via operator billing desk',
    });

    onToast(`Payment of ₹${paymentAmount.toLocaleString('en-IN')} recorded successfully`);
    setIsPaymentOpen(false);
    // Refresh modal if open
    const updated = store.getInvoiceById(selectedInvoice.id);
    if (updated) setSelectedInvoice(updated);
  };

  return (
    <div>
      {/* Top Filter Tabs */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          {['all', 'draft', 'posted', 'paid', 'overdue'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              style={{
                background: statusFilter === tab ? '#0f172a' : '#ffffff',
                color: statusFilter === tab ? '#ffffff' : '#64748b',
                border: '1px solid #e2e8f0',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                textTransform: 'capitalize',
                cursor: 'pointer',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
          Showing <strong>{filtered.length}</strong> invoice(s)
        </div>
      </div>

      {/* Table */}
      <div className="bl-table-container">
        <table className="bl-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Billing Period</th>
              <th>Subtotal</th>
              <th>18% GST</th>
              <th>Total Amount</th>
              <th>Balance Due</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                  No invoices found matching criteria.
                </td>
              </tr>
            ) : (
              filtered.map((inv) => {
                const daysOverdue = getDaysOverdue(inv.due_date);
                const isOverdue = inv.status === 'overdue' || daysOverdue > 0 && inv.balance_due > 0;

                return (
                  <tr
                    key={inv.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedInvoice(inv)}
                  >
                    <td>
                      <div className="bl-cell-primary">{inv.invoice_number}</div>
                      <div className="bl-cell-sub">Due: {inv.due_date}</div>
                    </td>
                    <td>
                      <div className="bl-cell-primary">{inv.customer?.name}</div>
                      <div className="bl-cell-sub">{inv.customer?.company}</div>
                    </td>
                    <td>
                      <Badge status={inv.status} />
                      {inv.status === 'overdue' && (
                        <div style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 700, marginTop: '2px' }}>
                          {daysOverdue}d overdue
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                        {inv.period_start} to {inv.period_end}
                      </div>
                    </td>
                    <td>₹{Number(inv.subtotal).toLocaleString('en-IN')}</td>
                    <td style={{ color: '#4f46e5' }}>
                      ₹{Number(inv.tax_amount).toLocaleString('en-IN')}
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      ₹{Number(inv.total_amount).toLocaleString('en-IN')}
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
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {inv.balance_due > 0 && (
                          <button
                            className="bl-btn bl-btn-primary bl-btn-sm"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            title="Evaluate Risk with Gravity AI & send payment recovery notice"
                            disabled={evaluatingId === inv.id}
                            onClick={(e) => handleEvaluateRisk(inv, e)}
                          >
                            {evaluatingId === inv.id ? (
                              'AI...'
                            ) : (
                              <>
                                <Sparkles size={12} /> AI Risk
                              </>
                            )}
                          </button>
                        )}
                        {inv.balance_due > 0 && (
                          <button
                            className="bl-btn bl-btn-secondary bl-btn-sm"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            onClick={(e) => handleOpenPaymentModal(inv, e)}
                          >
                            Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Invoice Detail / GST Tax Invoice Modal */}
      {selectedInvoice && (
        <Modal
          isOpen={Boolean(selectedInvoice)}
          onClose={() => setSelectedInvoice(null)}
          title={`Tax Invoice ${selectedInvoice.invoice_number}`}
          maxWidth="700px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                HSN/SAC Code: <strong>998313</strong> (Software Subscription Services)
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="bl-btn bl-btn-ghost bl-btn-sm"
                  onClick={() => window.print()}
                >
                  <Printer size={14} /> Print Tax Receipt
                </button>
                {selectedInvoice.balance_due > 0 && (
                  <button
                    className="bl-btn bl-btn-primary bl-btn-sm"
                    onClick={(e) => handleOpenPaymentModal(selectedInvoice, e)}
                  >
                    <CreditCard size={14} /> Record Payment
                  </button>
                )}
              </div>
            </div>
          }
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderBottom: '2px solid #e2e8f0',
              paddingBottom: '16px',
              marginBottom: '18px',
            }}
          >
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                Brightloop Software Pvt Ltd
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                GSTIN: <strong>27AABCB9988Z1Z2</strong> • PAN: AABCB9988Z
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                State: Maharashtra (Code: 27)
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Badge status={selectedInvoice.status} />
              <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: '6px' }}>
                {selectedInvoice.invoice_number}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Date: {selectedInvoice.issue_date}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Due Date: {selectedInvoice.due_date}
              </div>
            </div>
          </div>

          {/* Billed To */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '20px',
              background: '#f8fafc',
              padding: '14px',
              borderRadius: '8px',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                BILLED TO (BUYER)
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '4px' }}>
                {selectedInvoice.customer?.name}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                {selectedInvoice.customer?.company}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                GSTIN: <strong>{selectedInvoice.customer?.gstin || 'Unregistered'}</strong>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                BILLING PERIOD
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, marginTop: '4px' }}>
                {selectedInvoice.period_start} to {selectedInvoice.period_end}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                Payment Terms: {selectedInvoice.payment_terms}
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bl-table-container" style={{ marginBottom: '20px' }}>
            <table className="bl-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>SAC Code</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                  selectedInvoice.items.map((it) => (
                    <tr key={it.id}>
                      <td>{it.description}</td>
                      <td>998313</td>
                      <td>{it.quantity}</td>
                      <td>₹{Number(it.unit_price).toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 600 }}>₹{Number(it.amount).toLocaleString('en-IN')}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td>SaaS Subscription Recurrent Cycle</td>
                    <td>998313</td>
                    <td>1</td>
                    <td>₹{Number(selectedInvoice.subtotal).toLocaleString('en-IN')}</td>
                    <td style={{ fontWeight: 600 }}>
                      ₹{Number(selectedInvoice.subtotal).toLocaleString('en-IN')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* GST Calculation Box */}
          <div style={{ width: '320px', marginLeft: 'auto', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span>Taxable Subtotal:</span>
              <span style={{ fontWeight: 600 }}>
                ₹{Number(selectedInvoice.subtotal).toLocaleString('en-IN')}
              </span>
            </div>
            {/* Split GST: CGST 9% + SGST 9% */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#475569' }}>
              <span>CGST (Central Tax @ 9%):</span>
              <span>₹{(Number(selectedInvoice.tax_amount) / 2).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#475569' }}>
              <span>SGST (State Tax @ 9%):</span>
              <span>₹{(Number(selectedInvoice.tax_amount) / 2).toFixed(2)}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '1px solid #cbd5e1',
                paddingTop: '6px',
                marginBottom: '6px',
                fontWeight: 700,
              }}
            >
              <span>Total Invoice Value:</span>
              <span>₹{Number(selectedInvoice.total_amount).toLocaleString('en-IN')}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '6px',
                color: '#059669',
              }}
            >
              <span>Amount Paid:</span>
              <span>-₹{Number(selectedInvoice.amount_paid).toLocaleString('en-IN')}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '2px dashed #0f172a',
                paddingTop: '8px',
                fontSize: '1.05rem',
                fontWeight: 800,
                color: selectedInvoice.balance_due > 0 ? '#dc2626' : '#059669',
              }}
            >
              <span>Balance Due:</span>
              <span>₹{Number(selectedInvoice.balance_due).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </Modal>
      )}

      {/* Payment Recording Modal */}
      {selectedInvoice && (
        <Modal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          title={`Record Payment for ${selectedInvoice.invoice_number}`}
          maxWidth="500px"
        >
          <form onSubmit={handleRecordPayment}>
            <div className="bl-form-group">
              <label className="bl-label">Payment Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                max={selectedInvoice.balance_due}
                className="bl-input"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div className="bl-form-group">
              <label className="bl-label">Payment Method</label>
              <select
                className="bl-select"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="bank_transfer">Direct Bank Transfer / NEFT / RTGS</option>
                <option value="upi">UPI (PhonePe, GPay, Paytm)</option>
                <option value="credit_card">Corporate Credit Card</option>
                <option value="net_banking">Net Banking</option>
                <option value="stripe">Stripe Gateway Settlement</option>
              </select>
            </div>

            <div className="bl-form-group">
              <label className="bl-label">UTR / Transaction Reference</label>
              <input
                type="text"
                className="bl-input"
                value={txRef}
                onChange={(e) => setTxRef(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                className="bl-btn bl-btn-secondary bl-btn-sm"
                onClick={() => setIsPaymentOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="bl-btn bl-btn-success bl-btn-sm">
                Confirm & Reconcile Payment
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Gravity AI Risk Modal */}
      <RiskModal
        isOpen={Boolean(assessment)}
        onClose={() => setAssessment(null)}
        assessment={assessment}
        onDispatched={() => onToast('Recovery communication logged and transmitted')}
      />
    </div>
  );
};
