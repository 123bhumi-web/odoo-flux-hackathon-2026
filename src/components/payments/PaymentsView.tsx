import React, { useState } from 'react';
import { Payment, Invoice, Customer } from '../../types/database';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { store } from '../../lib/storage';
import { CreditCard, Plus, CheckCircle, ArrowUpRight, Search } from 'lucide-react';

interface PaymentsViewProps {
  payments: Payment[];
  invoices: Invoice[];
  customers: Customer[];
  onToast: (msg: string) => void;
  searchTerm?: string;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  payments,
  invoices,
  customers,
  onToast,
  searchTerm = '',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<any>('bank_transfer');
  const [reference, setReference] = useState('');

  // Unpaid invoices
  const openInvoices = invoices.filter((i) => i.balance_due > 0);

  const filtered = payments.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.payment_number.toLowerCase().includes(term) ||
      (p.transaction_reference && p.transaction_reference.toLowerCase().includes(term)) ||
      p.customer?.name.toLowerCase().includes(term) ||
      p.customer?.company.toLowerCase().includes(term)
    );
  });

  const handleOpenNewPayment = () => {
    if (openInvoices.length > 0) {
      setSelectedInvoiceId(openInvoices[0].id);
      setAmount(openInvoices[0].balance_due);
    }
    setReference(`REF-${Math.floor(100000 + Math.random() * 900000)}`);
    setIsModalOpen(true);
  };

  const handleInvoiceChange = (invId: string) => {
    setSelectedInvoiceId(invId);
    const inv = invoices.find((i) => i.id === invId);
    if (inv) setAmount(inv.balance_due);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const inv = invoices.find((i) => i.id === selectedInvoiceId);
    if (!inv) {
      onToast('Please select a valid invoice');
      return;
    }

    try {
      store.recordPayment({
        payment_number: `PAY-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        invoice_id: inv.id,
        customer_id: inv.customer_id,
        amount,
        currency: inv.currency || 'INR',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: method,
        status: 'completed',
        transaction_reference: reference,
        notes: 'Recorded manually in operator console',
      });
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Could not record payment.');
      return;
    }

    onToast(`Payment of ₹${amount.toLocaleString('en-IN')} reconciled against ${inv.invoice_number}`);
    setIsModalOpen(false);
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Settled Payments & Reconciliations</h3>
          <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Audit log of all gateway, bank transfer, and UPI transactions allocated to invoices.
          </p>
        </div>

        <button
          className="bl-btn bl-btn-primary bl-btn-sm"
          onClick={handleOpenNewPayment}
        >
          <Plus size={15} /> Record Payment
        </button>
      </div>

      <div className="bl-table-container">
        <table className="bl-table">
          <thead>
            <tr>
              <th>Payment #</th>
              <th>Transaction Reference</th>
              <th>Customer</th>
              <th>Allocated Invoice</th>
              <th>Method</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                  No payment records found.
                </td>
              </tr>
            ) : (
              filtered.map((pay) => (
                <tr key={pay.id}>
                  <td className="bl-cell-primary">{pay.payment_number}</td>
                  <td>
                    <code style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                      {pay.transaction_reference || 'N/A'}
                    </code>
                  </td>
                  <td>
                    <div className="bl-cell-primary">{pay.customer?.name}</div>
                    <div className="bl-cell-sub">{pay.customer?.company}</div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: '#4f46e5' }}>
                      {pay.invoice?.invoice_number || 'Direct Credit'}
                    </span>
                  </td>
                  <td style={{ textTransform: 'uppercase', fontSize: '0.78rem', fontWeight: 600 }}>
                    {pay.payment_method.replace('_', ' ')}
                  </td>
                  <td>{pay.payment_date}</td>
                  <td style={{ fontWeight: 700, color: '#059669' }}>
                    ₹{Number(pay.amount).toLocaleString('en-IN')}
                  </td>
                  <td>
                    <Badge status={pay.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Payment Transaction"
        maxWidth="520px"
      >
        <form onSubmit={handleSubmit}>
          <div className="bl-form-group">
            <label className="bl-label">Select Unpaid Invoice</label>
            {openInvoices.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#059669', padding: '10px 0' }}>
                All current invoices are settled in full!
              </p>
            ) : (
              <select
                className="bl-select"
                value={selectedInvoiceId}
                onChange={(e) => handleInvoiceChange(e.target.value)}
                required
              >
                {openInvoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} — {inv.customer?.name} (Balance: ₹
                    {Number(inv.balance_due).toLocaleString('en-IN')})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="bl-form-group">
            <label className="bl-label">Settlement Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              min={1}
              max={invoices.find((invoice) => invoice.id === selectedInvoiceId)?.balance_due}
              className="bl-input"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              required
            />
          </div>

          <div className="bl-form-group">
            <label className="bl-label">Payment Rail</label>
            <select
              className="bl-select"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="bank_transfer">Corporate Bank Transfer / RTGS / NEFT</option>
              <option value="upi">UPI / QR Code Settlement</option>
              <option value="credit_card">Credit / Debit Card</option>
              <option value="net_banking">Net Banking Portal</option>
              <option value="stripe">Stripe Global Checkout</option>
            </select>
          </div>

          <div className="bl-form-group">
            <label className="bl-label">Bank UTR / Transaction ID</label>
            <input
              type="text"
              className="bl-input"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button
              type="button"
              className="bl-btn bl-btn-secondary bl-btn-sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bl-btn bl-btn-primary bl-btn-sm"
              disabled={openInvoices.length === 0}
            >
              Record & Reconcile
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
