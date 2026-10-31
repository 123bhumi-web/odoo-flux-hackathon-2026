import React, { useState } from 'react';
import { Customer, Invoice, Subscription, Payment } from '../../types/database';
import { StatCard } from '../common/StatCard';
import { Badge } from '../common/Badge';
import { RiskModal } from '../common/RiskModal';
import { GravityRiskAssessment, ScheduledBillingRunResult } from '../../types/models';
import { GravityService, getDaysOverdue } from '../../services/gravityService';
import { BillingEngine } from '../../services/billingEngine';
import {
  TrendingUp,
  CreditCard,
  Repeat,
  AlertTriangle,
  ShieldAlert,
  Zap,
  ArrowRight,
  Clock,
  Sparkles,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

interface DashboardViewProps {
  subscriptions: Subscription[];
  invoices: Invoice[];
  customers: Customer[];
  payments: Payment[];
  onNavigateTab: (tab: any) => void;
  onToast: (msg: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  subscriptions,
  invoices,
  customers,
  payments,
  onNavigateTab,
  onToast,
}) => {
  const [selectedAssessment, setSelectedAssessment] = useState<GravityRiskAssessment | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<string | null>(null);
  const [isBilling, setIsBilling] = useState(false);

  // Financial Metrics:
  const activeSubs = subscriptions.filter((s) => s.status === 'active');
  const mrr = activeSubs.reduce((acc, s) => {
    const monthlyRate =
      s.billing_interval === 'annually'
        ? s.total_amount / 12
        : s.billing_interval === 'quarterly'
        ? s.total_amount / 3
        : s.total_amount;
    return acc + monthlyRate;
  }, 0);

  const arr = mrr * 12;

  const overdueInvoices = invoices.filter((i) => i.status === 'overdue');
  const totalOverdueAmount = overdueInvoices.reduce((acc, i) => acc + Number(i.balance_due), 0);

  const pendingPayments = invoices.filter((i) => i.status === 'posted');
  const totalPendingAmount = pendingPayments.reduce((acc, i) => acc + Number(i.balance_due), 0);

  const avgRisk = customers.length
    ? Math.round(customers.reduce((acc, c) => acc + Number(c.risk_score), 0) / customers.length)
    : 0;

  // Handle Gravity AI evaluation
  const handleEvaluateRisk = async (invoice: Invoice) => {
    setIsEvaluating(invoice.id);
    try {
      const customer = customers.find((c) => c.id === invoice.customer_id);
      if (!customer) {
        onToast('Customer not found for this invoice');
        return;
      }
      const assessment = await GravityService.evaluateInvoiceDefaultRisk(invoice, customer);
      setSelectedAssessment(assessment);
    } catch (err) {
      console.error(err);
      onToast('Failed to evaluate default risk');
    } finally {
      setIsEvaluating(null);
    }
  };

  const handleRunBillingNow = async () => {
    setIsBilling(true);
    try {
      const res = await BillingEngine.runScheduledBilling();
      onToast(res.message || 'Billing cycle executed');
    } catch (err) {
      onToast('Error executing billing cycle');
    } finally {
      setIsBilling(false);
    }
  };

  return (
    <div>
      {/* Metrics Row */}
      <div className="bl-stats-grid">
        <StatCard
          title="Monthly Recurring Revenue"
          value={`₹${Math.round(mrr).toLocaleString('en-IN')}`}
          subtitle={`Annualized Run Rate: ₹${Math.round(arr).toLocaleString('en-IN')}`}
          icon={<TrendingUp size={20} />}
          trend={{ value: '+14.2%', isPositive: true }}
          onClick={() => onNavigateTab('subscriptions')}
        />
        <StatCard
          title="Active Subscriptions"
          value={activeSubs.length}
          subtitle={`${subscriptions.length} total across all tiers`}
          icon={<Repeat size={20} />}
          trend={{ value: '+3 this month', isPositive: true }}
          onClick={() => onNavigateTab('subscriptions')}
        />
        <StatCard
          title="Delinquent / Overdue"
          value={`₹${Math.round(totalOverdueAmount).toLocaleString('en-IN')}`}
          subtitle={`${overdueInvoices.length} invoices requiring dunning`}
          icon={<AlertTriangle size={20} />}
          trend={{ value: `${overdueInvoices.length} overdue`, isPositive: false }}
          onClick={() => onNavigateTab('invoices')}
        />
        <StatCard
          title="Average Default Risk"
          value={`${avgRisk}/100`}
          subtitle="Monitored by Gravity AI"
          icon={<ShieldAlert size={20} />}
          onClick={() => onNavigateTab('customers')}
        />
      </div>

      {/* Main Grid: Overdue Risk Actions & Scheduled Automation */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px', marginBottom: '28px' }}>
        {/* Left Column: Overdue Risk Matrix */}
        <div className="bl-card">
          <div className="bl-card-header">
            <div>
              <h3 className="bl-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="#6366f1" />
                Gravity AI — Default Risk & Recovery Desk
              </h3>
              <p className="bl-card-subtitle">
                Intelligent behavioral scoring & automated payment recovery communications
              </p>
            </div>
            <button
              className="bl-btn bl-btn-ghost bl-btn-sm"
              onClick={() => onNavigateTab('invoices')}
            >
              View Invoices <ArrowRight size={14} />
            </button>
          </div>

          {overdueInvoices.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
              <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 8px' }} />
              <p style={{ fontWeight: 600 }}>Zero Overdue Invoices</p>
              <p style={{ fontSize: '0.82rem' }}>All accounts are settled and in good standing.</p>
            </div>
          ) : (
            <div className="bl-table-container">
              <table className="bl-table">
                <thead>
                  <tr>
                    <th>Invoice & Customer</th>
                    <th>Days Overdue</th>
                    <th>Balance Due</th>
                    <th>Risk Score</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueInvoices.map((inv) => {
                    const days = getDaysOverdue(inv.due_date);
                    const cust = customers.find((c) => c.id === inv.customer_id);
                    return (
                      <tr key={inv.id}>
                        <td>
                          <div className="bl-cell-primary">{inv.invoice_number}</div>
                          <div className="bl-cell-sub">{cust?.company || cust?.name}</div>
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: '#dc2626',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                            }}
                          >
                            <Clock size={13} /> {days} days past due
                          </span>
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          ₹{Number(inv.balance_due).toLocaleString('en-IN')}
                        </td>
                        <td>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: '#fef2f2',
                              color: '#dc2626',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              border: '1px solid #fecaca',
                            }}
                          >
                            High ({cust?.risk_score || 75}/100)
                          </span>
                        </td>
                        <td>
                          <button
                            className="bl-btn bl-btn-primary bl-btn-sm"
                            style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                            disabled={isEvaluating === inv.id}
                            onClick={() => handleEvaluateRisk(inv)}
                          >
                            {isEvaluating === inv.id ? (
                              'Evaluating...'
                            ) : (
                              <>
                                <Zap size={13} /> Evaluate Risk
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Billing Automation & Next Cycles */}
        <div className="bl-card">
          <div className="bl-card-header">
            <div>
              <h3 className="bl-card-title">Scheduled Billing Engine</h3>
              <p className="bl-card-subtitle">Automated recurrent billing procedure</p>
            </div>
          </div>

          <div
            style={{
              padding: '16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Calendar size={16} color="#6366f1" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Stored SQL Procedure:</span>
            </div>
            <code
              style={{
                display: 'block',
                background: '#0f172a',
                color: '#38bdf8',
                padding: '10px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontFamily: 'monospace',
                marginBottom: '10px',
              }}
            >
              run_scheduled_billing(CURRENT_DATE)
            </code>
            <ul style={{ fontSize: '0.78rem', color: '#475569', paddingLeft: '18px', lineHeight: 1.6 }}>
              <li>Scans active subscriptions due on or before today</li>
              <li>Calculates line items & 18% GST (CGST/SGST)</li>
              <li>Prevents duplicate billing period collisions</li>
              <li>Advances next_billing_date automatically</li>
            </ul>
          </div>

          <button
            className="bl-btn bl-btn-primary"
            style={{ width: '100%', padding: '12px' }}
            disabled={isBilling}
            onClick={handleRunBillingNow}
          >
            {isBilling ? 'Processing Invoices...' : 'Run Scheduled Billing Now'}
          </button>
        </div>
      </div>

      {/* Recent Subscriptions & Recent Payments */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Subscriptions */}
        <div className="bl-card">
          <div className="bl-card-header">
            <h3 className="bl-card-title">Active & Recent Subscriptions</h3>
            <button
              className="bl-btn bl-btn-ghost bl-btn-sm"
              onClick={() => onNavigateTab('subscriptions')}
            >
              View All
            </button>
          </div>
          <div className="bl-table-container">
            <table className="bl-table">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.slice(0, 5).map((sub) => (
                  <tr key={sub.id}>
                    <td className="bl-cell-primary">{sub.subscription_number}</td>
                    <td>{sub.customer?.name}</td>
                    <td>
                      <Badge status={sub.status} />
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      ₹{Number(sub.total_amount).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payments */}
        <div className="bl-card">
          <div className="bl-card-header">
            <h3 className="bl-card-title">Latest Settled Payments</h3>
            <button
              className="bl-btn bl-btn-ghost bl-btn-sm"
              onClick={() => onNavigateTab('payments')}
            >
              View All
            </button>
          </div>
          <div className="bl-table-container">
            <table className="bl-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Customer</th>
                  <th>Method</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.slice(0, 5).map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="bl-cell-primary">{p.payment_number}</div>
                      <div className="bl-cell-sub">{p.transaction_reference}</div>
                    </td>
                    <td>{p.customer?.name}</td>
                    <td style={{ textTransform: 'uppercase', fontSize: '0.78rem', fontWeight: 600 }}>
                      {p.payment_method.replace('_', ' ')}
                    </td>
                    <td style={{ fontWeight: 700, color: '#059669' }}>
                      ₹{Number(p.amount).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Gravity AI Modal */}
      <RiskModal
        isOpen={Boolean(selectedAssessment)}
        onClose={() => setSelectedAssessment(null)}
        assessment={selectedAssessment}
        onDispatched={() => onToast('Payment recovery message transmitted successfully')}
      />
    </div>
  );
};
