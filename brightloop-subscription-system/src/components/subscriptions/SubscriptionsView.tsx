import React, { useState } from 'react';
import { Subscription, Customer, ProductPlan, SubscriptionStatus } from '../../types/database';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { store } from '../../lib/storage';
import { STATE_ACTION_MAP, ALLOWED_SUBSCRIPTION_TRANSITIONS } from '../../types/models';
import {
  Repeat,
  Calendar,
  AlertCircle,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  XCircle,
  Plus,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface SubscriptionsViewProps {
  subscriptions: Subscription[];
  customers: Customer[];
  plans: ProductPlan[];
  onToast: (msg: string) => void;
  searchTerm?: string;
}

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({
  subscriptions,
  customers,
  plans,
  onToast,
  searchTerm = '',
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // New Subscription Form State
  const [customerId, setCustomerId] = useState('');
  const [planId, setPlanId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [discount, setDiscount] = useState(0);

  // Filter subscriptions
  const filtered = subscriptions.filter((sub) => {
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    const matchesSearch =
      sub.subscription_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.customer?.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.plan?.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleStateTransition = (targetState: SubscriptionStatus) => {
    if (!selectedSub) return;
    const res = store.transitionSubscriptionState(selectedSub.id, targetState);
    if (!res.success) {
      onToast(res.error || 'Transition failed');
    } else {
      onToast(`Subscription status transitioned to "${targetState.toUpperCase()}"`);
      // Update selected sub
      const updated = store.getSubscriptionById(selectedSub.id);
      if (updated) setSelectedSub(updated);
    }
  };

  const handleCreateDraftSubscription = (e: React.FormEvent) => {
    e.preventDefault();
    const customer = customers.find((c) => c.id === customerId);
    const plan = plans.find((p) => p.id === planId);
    if (!customer || !plan) {
      onToast('Please select a valid customer and plan');
      return;
    }

    const unitPrice = plan.unit_amount;
    const subtotal = Math.round(unitPrice * quantity * (1 - discount / 100) * 100) / 100;
    const taxAmount = Math.round(subtotal * 0.18 * 100) / 100;
    const totalAmount = subtotal + taxAmount;

    const todayStr = new Date().toISOString().split('T')[0];
    const nextMonthObj = new Date();
    nextMonthObj.setMonth(nextMonthObj.getMonth() + 1);
    const nextMonthStr = nextMonthObj.toISOString().split('T')[0];

    const newSub = store.addSubscription({
      subscription_number: `SUB-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      customer_id: customer.id,
      plan_id: plan.id,
      status: 'draft',
      billing_interval: plan.interval,
      current_period_start: todayStr,
      current_period_end: nextMonthStr,
      next_billing_date: nextMonthStr,
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
      notes: 'Initial draft created in workspace',
    });

    onToast(`Draft subscription ${newSub.subscription_number} created`);
    setIsCreateOpen(false);
    setSelectedSub(newSub);
  };

  const renderStateStepper = (currentStatus: SubscriptionStatus) => {
    const sequence: SubscriptionStatus[] = ['draft', 'quotation', 'confirmed', 'active'];
    const isPaused = currentStatus === 'paused';
    const isClosed = currentStatus === 'closed';

    return (
      <div className="bl-stepper">
        {sequence.map((step, idx) => {
          const stepIndex = sequence.indexOf(currentStatus);
          const isDone = !isClosed && (stepIndex > idx || currentStatus === 'active');
          const isCurrent = currentStatus === step;

          return (
            <React.Fragment key={step}>
              <div
                className={`bl-step-node ${isDone ? 'completed' : ''} ${
                  isCurrent ? 'current' : ''
                }`}
              >
                <div className="bl-step-circle">
                  {isDone ? <CheckCircle2 size={14} /> : idx + 1}
                </div>
                <span style={{ textTransform: 'capitalize' }}>{step}</span>
              </div>
              {idx < sequence.length - 1 && (
                <div className={`bl-step-line ${isDone ? 'active' : ''}`} />
              )}
            </React.Fragment>
          );
        })}
        {isPaused && (
          <span style={{ marginLeft: '12px' }}>
            <Badge status="paused" variant="warning" />
          </span>
        )}
        {isClosed && (
          <span style={{ marginLeft: '12px' }}>
            <Badge status="closed" variant="danger" />
          </span>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Top Action Bar & Filter Tabs */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          {['all', 'draft', 'quotation', 'confirmed', 'active', 'paused', 'closed'].map((tab) => (
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

        <button
          className="bl-btn bl-btn-primary bl-btn-sm"
          onClick={() => {
            if (customers.length > 0) setCustomerId(customers[0].id);
            if (plans.length > 0) setPlanId(plans[0].id);
            setIsCreateOpen(true);
          }}
        >
          <Plus size={15} /> New Subscription
        </button>
      </div>

      {/* Subscriptions Table */}
      <div className="bl-table-container">
        <table className="bl-table">
          <thead>
            <tr>
              <th>Subscription #</th>
              <th>Customer</th>
              <th>Plan & Frequency</th>
              <th>Status</th>
              <th>Next Billing Date</th>
              <th>Amount (Inc. 18% GST)</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                  No subscriptions match the selected filter.
                </td>
              </tr>
            ) : (
              filtered.map((sub) => (
                <tr key={sub.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedSub(sub)}>
                  <td>
                    <div className="bl-cell-primary">{sub.subscription_number}</div>
                    <div className="bl-cell-sub">Cycle: {sub.billing_interval}</div>
                  </td>
                  <td>
                    <div className="bl-cell-primary">{sub.customer?.name}</div>
                    <div className="bl-cell-sub">{sub.customer?.company}</div>
                  </td>
                  <td>
                    <div className="bl-cell-primary">{sub.plan?.name}</div>
                    <div className="bl-cell-sub">
                      ₹{Number(sub.unit_price).toLocaleString('en-IN')} × {sub.quantity} seat(s)
                    </div>
                  </td>
                  <td>
                    <Badge status={sub.status} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem' }}>
                      <Calendar size={13} color="#6366f1" />
                      <span>{sub.next_billing_date}</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 700 }}>
                    ₹{Number(sub.total_amount).toLocaleString('en-IN')}
                  </td>
                  <td>
                    <button
                      className="bl-btn bl-btn-secondary bl-btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSub(sub);
                      }}
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Subscription Lifecycle Transition Modal */}
      {selectedSub && (
        <Modal
          isOpen={Boolean(selectedSub)}
          onClose={() => setSelectedSub(null)}
          title={`Subscription ${selectedSub.subscription_number}`}
          maxWidth="700px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <button
                className="bl-btn bl-btn-secondary bl-btn-sm"
                onClick={() => setSelectedSub(null)}
              >
                Close
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                {STATE_ACTION_MAP[selectedSub.status].nextActions.map((act) => (
                  <button
                    key={act.target}
                    className={`bl-btn bl-btn-${act.variant} bl-btn-sm`}
                    onClick={() => handleStateTransition(act.target)}
                  >
                    {act.label}
                  </button>
                ))}
              </div>
            </div>
          }
        >
          {/* Stepper */}
          {renderStateStepper(selectedSub.status)}

          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '0.82rem',
              color: '#334155',
              marginBottom: '20px',
            }}
          >
            <strong>State Rule:</strong> {STATE_ACTION_MAP[selectedSub.status].description}
          </div>

          {/* Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>CUSTOMER DETAILS</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '4px' }}>
                {selectedSub.customer?.name}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#475569' }}>{selectedSub.customer?.company}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                GSTIN: <strong>{selectedSub.customer?.gstin || 'N/A'}</strong>
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>PLAN & RECURRENCE</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '4px' }}>
                {selectedSub.plan?.name}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                Interval: <strong style={{ textTransform: 'capitalize' }}>{selectedSub.billing_interval}</strong>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                Next Charge: <strong>{selectedSub.next_billing_date}</strong>
              </div>
            </div>
          </div>

          {/* Pricing & GST Breakdown Box */}
          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
              <span>Base Rate ({selectedSub.quantity} seat(s) × ₹{Number(selectedSub.unit_price).toLocaleString('en-IN')}):</span>
              <span>₹{(Number(selectedSub.unit_price) * selectedSub.quantity).toLocaleString('en-IN')}</span>
            </div>
            {selectedSub.discount_percentage > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem', color: '#059669' }}>
                <span>Discount ({selectedSub.discount_percentage}%):</span>
                <span>
                  -₹
                  {(
                    (Number(selectedSub.unit_price) *
                      selectedSub.quantity *
                      selectedSub.discount_percentage) /
                    100
                  ).toLocaleString('en-IN')}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
              <span>Taxable Subtotal:</span>
              <span style={{ fontWeight: 600 }}>₹{Number(selectedSub.subtotal).toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem', color: '#4f46e5' }}>
              <span>Goods & Services Tax (18% GST):</span>
              <span style={{ fontWeight: 600 }}>₹{Number(selectedSub.tax_amount).toLocaleString('en-IN')}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '2px dashed #cbd5e1',
                paddingTop: '10px',
                fontSize: '1.05rem',
                fontWeight: 800,
                color: '#0f172a',
              }}
            >
              <span>Total Invoiced Amount:</span>
              <span>₹{Number(selectedSub.total_amount).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </Modal>
      )}

      {/* New Subscription Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Draft New Subscription"
        maxWidth="560px"
      >
        <form onSubmit={handleCreateDraftSubscription}>
          <div className="bl-form-group">
            <label className="bl-label">Select Customer</label>
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
            <label className="bl-label">Select Plan</label>
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
              <label className="bl-label">Seats / Quantity</label>
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
              <label className="bl-label">Discount %</label>
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

          <div
            style={{
              padding: '12px',
              backgroundColor: '#f1f5f9',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '0.8rem',
              color: '#475569',
            }}
          >
            Creates an initial subscription in <strong>Draft</strong> state. Once drafted, you can issue a formal Quotation or advance directly to Order Confirmation.
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
              Create Draft Subscription
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
