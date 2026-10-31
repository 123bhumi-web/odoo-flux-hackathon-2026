import React, { useState } from 'react';
import { Subscription, Customer, ProductPlan } from '../../types/database';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { store } from '../../lib/storage';
import { FileSpreadsheet, Plus, ArrowRight, CheckCircle, Percent, Printer } from 'lucide-react';

interface QuotationsViewProps {
  subscriptions: Subscription[];
  customers: Customer[];
  plans: ProductPlan[];
  onToast: (msg: string) => void;
  searchTerm?: string;
}

export const QuotationsView: React.FC<QuotationsViewProps> = ({
  subscriptions,
  customers,
  plans,
  onToast,
  searchTerm = '',
}) => {
  const [selectedQuote, setSelectedQuote] = useState<Subscription | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // New Quote fields
  const [customerId, setCustomerId] = useState('');
  const [planId, setPlanId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [discount, setDiscount] = useState(10);
  const [notes, setNotes] = useState('Standard enterprise proposal valid for 15 days');

  // Quotes are subscriptions in 'quotation' or 'draft' status
  const quotes = subscriptions.filter((s) => s.status === 'quotation' || s.status === 'draft');

  const filtered = quotes.filter((q) => {
    const term = searchTerm.toLowerCase();
    return (
      q.subscription_number.toLowerCase().includes(term) ||
      q.customer?.name.toLowerCase().includes(term) ||
      q.customer?.company.toLowerCase().includes(term) ||
      q.plan?.name.toLowerCase().includes(term)
    );
  });

  const handleConvertToConfirmed = (quoteId: string) => {
    const res = store.transitionSubscriptionState(quoteId, 'confirmed');
    if (!res.success) {
      onToast(res.error || 'Conversion failed');
    } else {
      onToast('🎉 Quotation successfully converted to Confirmed Subscription!');
      setSelectedQuote(null);
    }
  };

  const handleCreateQuotation = (e: React.FormEvent) => {
    e.preventDefault();
    const customer = customers.find((c) => c.id === customerId);
    const plan = plans.find((p) => p.id === planId);
    if (!customer || !plan) {
      onToast('Select valid customer and plan');
      return;
    }

    const unitPrice = plan.unit_amount;
    const subtotal = Math.round(unitPrice * quantity * (1 - discount / 100) * 100) / 100;
    const taxAmount = Math.round(subtotal * 0.18 * 100) / 100;
    const totalAmount = subtotal + taxAmount;

    const todayStr = new Date().toISOString().split('T')[0];
    const expiryObj = new Date();
    expiryObj.setDate(expiryObj.getDate() + 15);
    const expiryStr = expiryObj.toISOString().split('T')[0];

    const newQuote = store.addSubscription({
      subscription_number: `QUO-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      customer_id: customer.id,
      plan_id: plan.id,
      status: 'quotation',
      billing_interval: plan.interval,
      current_period_start: todayStr,
      current_period_end: expiryStr,
      next_billing_date: todayStr,
      last_billed_date: null,
      quantity,
      unit_price: unitPrice,
      discount_percentage: discount,
      subtotal,
      tax_rate: 0.18,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      currency: 'INR',
      auto_renew: true,
      notes,
    });

    onToast(`Quotation ${newQuote.subscription_number} issued`);
    setIsCreateOpen(false);
    setSelectedQuote(newQuote);
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
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Sales Quotations & Proposals</h3>
          <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Drafted contracts and proposals awaiting customer signature and conversion to active billing.
          </p>
        </div>

        <button
          className="bl-btn bl-btn-primary bl-btn-sm"
          onClick={() => {
            if (customers.length > 0) setCustomerId(customers[0].id);
            if (plans.length > 0) setPlanId(plans[0].id);
            setIsCreateOpen(true);
          }}
        >
          <Plus size={15} /> Create Quotation
        </button>
      </div>

      {/* Table */}
      <div className="bl-table-container">
        <table className="bl-table">
          <thead>
            <tr>
              <th>Quote #</th>
              <th>Customer</th>
              <th>Plan</th>
              <th>Discount</th>
              <th>Tax (18% GST)</th>
              <th>Total Value</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                  No quotations available. Click "Create Quotation" to draft a new proposal.
                </td>
              </tr>
            ) : (
              filtered.map((quote) => (
                <tr
                  key={quote.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedQuote(quote)}
                >
                  <td className="bl-cell-primary">{quote.subscription_number}</td>
                  <td>
                    <div className="bl-cell-primary">{quote.customer?.name}</div>
                    <div className="bl-cell-sub">{quote.customer?.company}</div>
                  </td>
                  <td>
                    <div className="bl-cell-primary">{quote.plan?.name}</div>
                    <div className="bl-cell-sub">{quote.billing_interval}</div>
                  </td>
                  <td>
                    {quote.discount_percentage > 0 ? (
                      <span style={{ color: '#059669', fontWeight: 600 }}>
                        {quote.discount_percentage}% OFF
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>₹{Number(quote.tax_amount).toLocaleString('en-IN')}</td>
                  <td style={{ fontWeight: 700 }}>
                    ₹{Number(quote.total_amount).toLocaleString('en-IN')}
                  </td>
                  <td>
                    <Badge status={quote.status} />
                  </td>
                  <td>
                    {quote.status === 'quotation' ? (
                      <button
                        className="bl-btn bl-btn-success bl-btn-sm"
                        style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConvertToConfirmed(quote.id);
                        }}
                      >
                        Convert to Sub <ArrowRight size={13} />
                      </button>
                    ) : (
                      <button
                        className="bl-btn bl-btn-secondary bl-btn-sm"
                        style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedQuote(quote);
                        }}
                      >
                        Review
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Quote Preview & Conversion Modal */}
      {selectedQuote && (
        <Modal
          isOpen={Boolean(selectedQuote)}
          onClose={() => setSelectedQuote(null)}
          title={`Quotation ${selectedQuote.subscription_number}`}
          maxWidth="680px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <button
                className="bl-btn bl-btn-secondary bl-btn-sm"
                onClick={() => setSelectedQuote(null)}
              >
                Close
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="bl-btn bl-btn-ghost bl-btn-sm"
                  onClick={() => window.print()}
                >
                  <Printer size={14} /> Print PDF
                </button>
                {selectedQuote.status === 'quotation' && (
                  <button
                    className="bl-btn bl-btn-success bl-btn-sm"
                    onClick={() => handleConvertToConfirmed(selectedQuote.id)}
                  >
                    <CheckCircle size={15} /> Confirm & Convert to Subscription
                  </button>
                )}
              </div>
            </div>
          }
        >
          {/* Header of Quote */}
          <div
            style={{
              borderBottom: '2px solid #e2e8f0',
              paddingBottom: '16px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                Brightloop Software Pvt Ltd
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                GSTIN: 27AABCB9988Z1Z2 • Mumbai, Maharashtra, India
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#4f46e5' }}>
                {selectedQuote.subscription_number}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Valid Until: {selectedQuote.current_period_end}
              </div>
            </div>
          </div>

          {/* Client Info */}
          <div style={{ marginBottom: '20px', background: '#f8fafc', padding: '14px', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>PROPOSAL FOR</div>
            <div style={{ fontSize: '1rem', fontWeight: 700 }}>{selectedQuote.customer?.name}</div>
            <div style={{ fontSize: '0.84rem', color: '#475569' }}>{selectedQuote.customer?.company}</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              GSTIN: {selectedQuote.customer?.gstin} • {selectedQuote.customer?.email}
            </div>
          </div>

          {/* Breakdown */}
          <div className="bl-table-container" style={{ marginBottom: '20px' }}>
            <table className="bl-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Rate</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>{selectedQuote.plan?.name}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Billed {selectedQuote.billing_interval}
                    </div>
                  </td>
                  <td>{selectedQuote.quantity}</td>
                  <td>₹{Number(selectedQuote.unit_price).toLocaleString('en-IN')}</td>
                  <td style={{ fontWeight: 600 }}>
                    ₹{(Number(selectedQuote.unit_price) * selectedQuote.quantity).toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tax Calc */}
          <div style={{ width: '280px', marginLeft: 'auto', fontSize: '0.86rem' }}>
            {selectedQuote.discount_percentage > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', marginBottom: '6px' }}>
                <span>Discount ({selectedQuote.discount_percentage}%):</span>
                <span>
                  -₹
                  {(
                    (Number(selectedQuote.unit_price) *
                      selectedQuote.quantity *
                      selectedQuote.discount_percentage) /
                    100
                  ).toLocaleString('en-IN')}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span>Taxable Subtotal:</span>
              <span style={{ fontWeight: 600 }}>₹{Number(selectedQuote.subtotal).toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#4f46e5' }}>
              <span>GST @ 18%:</span>
              <span style={{ fontWeight: 600 }}>₹{Number(selectedQuote.tax_amount).toLocaleString('en-IN')}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '2px solid #cbd5e1',
                paddingTop: '8px',
                fontSize: '1.05rem',
                fontWeight: 800,
              }}
            >
              <span>Total Contract:</span>
              <span>₹{Number(selectedQuote.total_amount).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Quote Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Issue New Sales Quotation"
        maxWidth="560px"
      >
        <form onSubmit={handleCreateQuotation}>
          <div className="bl-form-group">
            <label className="bl-label">Select Prospective Customer</label>
            <select
              className="bl-select"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.company})
                </option>
              ))}
            </select>
          </div>

          <div className="bl-form-group">
            <label className="bl-label">Select Plan Tier</label>
            <select
              className="bl-select"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              required
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — ₹{p.unit_amount.toLocaleString('en-IN')} / {p.interval}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="bl-form-group">
              <label className="bl-label">Quantity (Licenses/Seats)</label>
              <input
                type="number"
                min={1}
                className="bl-input"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                required
              />
            </div>
            <div className="bl-form-group">
              <label className="bl-label">Contract Discount %</label>
              <input
                type="number"
                min={0}
                max={100}
                className="bl-input"
                value={discount}
                onChange={(e) => setDiscount(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
              />
            </div>
          </div>

          <div className="bl-form-group">
            <label className="bl-label">Proposal Notes & Terms</label>
            <textarea
              className="bl-textarea"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="bl-btn bl-btn-secondary bl-btn-sm"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="bl-btn bl-btn-primary bl-btn-sm">
              Generate Formal Quotation
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
