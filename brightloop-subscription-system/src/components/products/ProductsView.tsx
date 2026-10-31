import React, { useState } from 'react';
import { ProductPlan, Subscription } from '../../types/database';
import { Modal } from '../common/Modal';
import { store } from '../../lib/storage';
import { Package, Plus, Check, Zap, Layers, Sparkles } from 'lucide-react';

interface ProductsViewProps {
  plans: ProductPlan[];
  subscriptions: Subscription[];
  onToast: (msg: string) => void;
  searchTerm?: string;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  plans,
  subscriptions,
  onToast,
  searchTerm = '',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [interval, setInterval] = useState<'monthly' | 'quarterly' | 'annually'>('monthly');
  const [amount, setAmount] = useState<number>(9999);
  const [featuresStr, setFeaturesStr] = useState('Automated GST Invoicing, Gravity AI Risk Scoring, Customer Self-Service Portal');

  const filtered = plans.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.code.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term)
    );
  });

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    const features = featuresStr
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);

    const newPlan = store.addPlan({
      name,
      code: code.toUpperCase(),
      description,
      interval,
      unit_amount: amount,
      currency: 'INR',
      gst_rate: 0.18,
      is_active: true,
      features,
    });

    onToast(`Plan "${newPlan.name}" added to catalog`);
    setIsModalOpen(false);
    setName('');
    setCode('');
    setDescription('');
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Products & Pricing Plans</h3>
          <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Subscription tiers, billing cycles, features, and recurring GST charge schedules.
          </p>
        </div>

        <button
          className="bl-btn bl-btn-primary bl-btn-sm"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus size={15} /> Create Plan
        </button>
      </div>

      {/* Grid of Plans */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
        }}
      >
        {filtered.map((plan) => {
          const subscriberCount = subscriptions.filter(
            (s) => s.plan_id === plan.id && s.status === 'active'
          ).length;

          return (
            <div
              key={plan.id}
              className="bl-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '12px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontFamily: 'monospace',
                      background: '#f1f5f9',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      color: '#475569',
                    }}
                  >
                    {plan.code}
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#6366f1',
                      background: '#e0e7ff',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      textTransform: 'capitalize',
                    }}
                  >
                    {plan.interval}
                  </span>
                </div>

                <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                  {plan.name}
                </h4>

                <p style={{ fontSize: '0.82rem', color: '#64748b', minHeight: '36px', marginBottom: '16px' }}>
                  {plan.description}
                </p>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0f172a' }}>
                      ₹{Number(plan.unit_amount).toLocaleString('en-IN')}
                    </span>
                    <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                      /{plan.interval === 'monthly' ? 'mo' : plan.interval === 'quarterly' ? 'qtr' : 'yr'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    + 18% GST (₹{Math.round(plan.unit_amount * 0.18).toLocaleString('en-IN')})
                  </div>
                </div>

                {/* Features */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '10px' }}>
                    INCLUDED CAPABILITIES:
                  </div>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {plan.features.map((feat, idx) => (
                      <li
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '0.8rem',
                          color: '#334155',
                        }}
                      >
                        <Check size={14} color="#10b981" style={{ flexShrink: 0 }} />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Footer info */}
              <div
                style={{
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.78rem',
                  color: '#64748b',
                }}
              >
                <span>Active Subscribers:</span>
                <strong style={{ color: '#0f172a' }}>{subscriberCount} accounts</strong>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Plan Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Subscription Plan"
        maxWidth="540px"
      >
        <form onSubmit={handleCreatePlan}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px' }}>
            <div className="bl-form-group">
              <label className="bl-label">Plan Name</label>
              <input
                type="text"
                className="bl-input"
                placeholder="e.g. Enterprise AI Suite"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="bl-form-group">
              <label className="bl-label">Plan Code</label>
              <input
                type="text"
                className="bl-input"
                placeholder="PLAN-AI-PRO"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="bl-form-group">
            <label className="bl-label">Description</label>
            <input
              type="text"
              className="bl-input"
              placeholder="Short description of audience and tier"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="bl-form-group">
              <label className="bl-label">Billing Interval</label>
              <select
                className="bl-select"
                value={interval}
                onChange={(e) => setInterval(e.target.value as any)}
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
              </select>
            </div>
            <div className="bl-form-group">
              <label className="bl-label">Base Rate (₹ excl. GST)</label>
              <input
                type="number"
                step="100"
                className="bl-input"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                required
              />
            </div>
          </div>

          <div className="bl-form-group">
            <label className="bl-label">Features (comma-separated)</label>
            <textarea
              className="bl-textarea"
              rows={3}
              value={featuresStr}
              onChange={(e) => setFeaturesStr(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button
              type="button"
              className="bl-btn bl-btn-secondary bl-btn-sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="bl-btn bl-btn-primary bl-btn-sm">
              Publish Plan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
