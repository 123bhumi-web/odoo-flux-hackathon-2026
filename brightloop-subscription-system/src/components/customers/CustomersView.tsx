import React, { useState } from 'react';
import { Customer, Subscription, Invoice } from '../../types/database';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { store } from '../../lib/storage';
import { Users, Plus, ShieldAlert, Globe, Mail, Phone, Building2 } from 'lucide-react';

interface CustomersViewProps {
  customers: Customer[];
  subscriptions: Subscription[];
  invoices: Invoice[];
  onToast: (msg: string) => void;
  onOpenPortalAsCustomer: (customerId: string) => void;
  searchTerm?: string;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  subscriptions,
  invoices,
  onToast,
  onOpenPortalAsCustomer,
  searchTerm = '',
}) => {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [creditLimit, setCreditLimit] = useState(150000);
  const [city, setCity] = useState('Bengaluru');
  const [state, setState] = useState('Karnataka');

  const filtered = customers.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.company.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term) ||
      (c.gstin && c.gstin.toLowerCase().includes(term))
    );
  });

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const newCust = store.addCustomer({
      name,
      company,
      email,
      phone,
      gstin,
      credit_limit: creditLimit,
      default_payment_method: 'bank_transfer',
      risk_score: 12.0, // Initial default baseline score
      billing_address: {
        street: 'Suite 400',
        city,
        state,
        pincode: '560001',
        country: 'India',
      },
    });

    onToast(`Customer ${newCust.name} added successfully`);
    setIsAddOpen(false);
    setSelectedCustomer(newCust);
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
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Customer Directory</h3>
          <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Enterprise client profiles, GSTIN tax identifiers, credit limits, and risk profiles.
          </p>
        </div>

        <button
          className="bl-btn bl-btn-primary bl-btn-sm"
          onClick={() => setIsAddOpen(true)}
        >
          <Plus size={15} /> Add Customer
        </button>
      </div>

      <div className="bl-table-container">
        <table className="bl-table">
          <thead>
            <tr>
              <th>Customer & Company</th>
              <th>GSTIN</th>
              <th>Contact Info</th>
              <th>Credit Limit</th>
              <th>Default Risk Rating</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                  No customer records found.
                </td>
              </tr>
            ) : (
              filtered.map((cust) => {
                const isHighRisk = cust.risk_score >= 50;

                return (
                  <tr
                    key={cust.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedCustomer(cust)}
                  >
                    <td>
                      <div className="bl-cell-primary">{cust.name}</div>
                      <div className="bl-cell-sub">{cust.company}</div>
                    </td>
                    <td>
                      <code
                        style={{
                          fontSize: '0.8rem',
                          background: '#f1f5f9',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 600,
                        }}
                      >
                        {cust.gstin || 'Unregistered'}
                      </code>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem', color: '#334155' }}>{cust.email}</div>
                      <div className="bl-cell-sub">{cust.phone}</div>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      ₹{Number(cust.credit_limit).toLocaleString('en-IN')}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          background: isHighRisk ? '#fef2f2' : '#ecfdf5',
                          color: isHighRisk ? '#dc2626' : '#059669',
                          border: `1px solid ${isHighRisk ? '#fecaca' : '#a7f3d0'}`,
                        }}
                      >
                        {cust.risk_score}/100 {isHighRisk ? '• At Risk' : '• Healthy'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="bl-btn bl-btn-secondary bl-btn-sm"
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCustomer(cust);
                          }}
                        >
                          Profile
                        </button>
                        <button
                          className="bl-btn bl-btn-ghost bl-btn-sm"
                          style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#4f46e5' }}
                          title="Open Customer Self-Service Portal"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenPortalAsCustomer(cust.id);
                          }}
                        >
                          <Globe size={13} /> Portal
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Customer Detail Drawer Modal */}
      {selectedCustomer && (
        <Modal
          isOpen={Boolean(selectedCustomer)}
          onClose={() => setSelectedCustomer(null)}
          title={selectedCustomer.company || selectedCustomer.name}
          maxWidth="680px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <button
                className="bl-btn bl-btn-secondary bl-btn-sm"
                onClick={() => setSelectedCustomer(null)}
              >
                Close
              </button>
              <button
                className="bl-btn bl-btn-primary bl-btn-sm"
                onClick={() => {
                  const id = selectedCustomer.id;
                  setSelectedCustomer(null);
                  onOpenPortalAsCustomer(id);
                }}
              >
                <Globe size={14} /> Open Customer Self-Service View
              </button>
            </div>
          }
        >
          {/* Contact Details Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '20px',
              background: '#f8fafc',
              padding: '16px',
              borderRadius: '10px',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>
                CONTACT PERSON
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: '2px' }}>
                {selectedCustomer.name}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '4px' }}>
                {selectedCustomer.email}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#475569' }}>{selectedCustomer.phone}</div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>
                BILLING & TAX
              </div>
              <div style={{ fontSize: '0.86rem', marginTop: '2px' }}>
                GSTIN: <strong>{selectedCustomer.gstin || 'Unregistered'}</strong>
              </div>
              <div style={{ fontSize: '0.86rem', marginTop: '2px' }}>
                Credit Limit: <strong>₹{Number(selectedCustomer.credit_limit).toLocaleString('en-IN')}</strong>
              </div>
              <div style={{ fontSize: '0.86rem', marginTop: '2px' }}>
                Location: {selectedCustomer.billing_address.city}, {selectedCustomer.billing_address.state}
              </div>
            </div>
          </div>

          {/* Subscriptions for this customer */}
          <div style={{ marginBottom: '20px' }}>
            <h5 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>
              Active Subscriptions
            </h5>
            {subscriptions.filter((s) => s.customer_id === selectedCustomer.id).length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>No subscriptions found.</p>
            ) : (
              <div className="bl-table-container">
                <table className="bl-table">
                  <thead>
                    <tr>
                      <th>Subscription #</th>
                      <th>Plan</th>
                      <th>Status</th>
                      <th>Next Billing</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions
                      .filter((s) => s.customer_id === selectedCustomer.id)
                      .map((sub) => (
                        <tr key={sub.id}>
                          <td className="bl-cell-primary">{sub.subscription_number}</td>
                          <td>{sub.plan?.name}</td>
                          <td>
                            <Badge status={sub.status} />
                          </td>
                          <td>{sub.next_billing_date}</td>
                          <td style={{ fontWeight: 700 }}>
                            ₹{Number(sub.total_amount).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Invoices for this customer */}
          <div>
            <h5 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>
              Billing & Invoices
            </h5>
            {invoices.filter((i) => i.customer_id === selectedCustomer.id).length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>No invoices issued yet.</p>
            ) : (
              <div className="bl-table-container">
                <table className="bl-table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Period</th>
                      <th>Status</th>
                      <th>Balance Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices
                      .filter((i) => i.customer_id === selectedCustomer.id)
                      .map((inv) => (
                        <tr key={inv.id}>
                          <td className="bl-cell-primary">{inv.invoice_number}</td>
                          <td style={{ fontSize: '0.8rem' }}>
                            {inv.period_start} to {inv.period_end}
                          </td>
                          <td>
                            <Badge status={inv.status} />
                          </td>
                          <td style={{ fontWeight: 700, color: inv.balance_due > 0 ? '#dc2626' : '#059669' }}>
                            ₹{Number(inv.balance_due).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Add Customer Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Customer Account"
        maxWidth="560px"
      >
        <form onSubmit={handleAddCustomer}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="bl-form-group">
              <label className="bl-label">Full Name</label>
              <input
                type="text"
                className="bl-input"
                placeholder="e.g. Priya Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="bl-form-group">
              <label className="bl-label">Company Name</label>
              <input
                type="text"
                className="bl-input"
                placeholder="e.g. Acme Tech Labs"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="bl-form-group">
              <label className="bl-label">Corporate Email</label>
              <input
                type="email"
                className="bl-input"
                placeholder="billing@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="bl-form-group">
              <label className="bl-label">Phone Number</label>
              <input
                type="text"
                className="bl-input"
                placeholder="+91 98000 00000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px' }}>
            <div className="bl-form-group">
              <label className="bl-label">GSTIN (15 Digits)</label>
              <input
                type="text"
                className="bl-input"
                placeholder="27AABCN1234A1Z5"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                required
              />
            </div>
            <div className="bl-form-group">
              <label className="bl-label">Credit Limit (₹)</label>
              <input
                type="number"
                step="5000"
                className="bl-input"
                value={creditLimit}
                onChange={(e) => setCreditLimit(parseFloat(e.target.value) || 0)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="bl-form-group">
              <label className="bl-label">City</label>
              <input
                type="text"
                className="bl-input"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="bl-form-group">
              <label className="bl-label">State</label>
              <input
                type="text"
                className="bl-input"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button
              type="button"
              className="bl-btn bl-btn-secondary bl-btn-sm"
              onClick={() => setIsAddOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="bl-btn bl-btn-primary bl-btn-sm">
              Save Customer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
