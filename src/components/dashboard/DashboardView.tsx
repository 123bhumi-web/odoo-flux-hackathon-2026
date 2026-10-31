import React, { useState } from 'react';
import { Customer, Invoice, Subscription, Payment } from '../../types/database';
import { StatCard } from '../common/StatCard';
import { Badge } from '../common/Badge';
import { RiskModal } from '../common/RiskModal';
import { GravityRiskAssessment } from '../../types/models';
import { GravityService, getDaysOverdue } from '../../services/gravityService';
import type { ActiveTab } from '../layout/Sidebar';
import {
  TrendingUp,
  Repeat,
  AlertTriangle,
  ShieldAlert,
  Zap,
  ArrowRight,
  Clock,
  Sparkles,
  CheckCircle2,
  Calendar,
  Users,
} from 'lucide-react';

interface DashboardViewProps {
  subscriptions: Subscription[];
  invoices: Invoice[];
  customers: Customer[];
  payments: Payment[];
  onNavigateTab: (tab: ActiveTab) => void;
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

  const openInvoices = invoices.filter((i) => Number(i.balance_due) > 0);
  const overdueInvoices = openInvoices.filter(
    (invoice) => invoice.status === 'overdue' || getDaysOverdue(invoice.due_date) > 0
  );
  const totalOverdueAmount = overdueInvoices.reduce((acc, i) => acc + Number(i.balance_due), 0);

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

  return (
    <div className="bl-dashboard">
      <section className="bl-dashboard-heading">
        <div>
          <span className="bl-eyebrow">OVERVIEW</span>
          <h1>Your business at a glance</h1>
          <p>Track recurring revenue, customer health, and billing activity in one place.</p>
        </div>
        <div className="bl-dashboard-actions">
          <button className="bl-btn bl-btn-secondary" onClick={() => onNavigateTab('customers')}>
            View customers <ArrowRight size={15} />
          </button>
          <button className="bl-btn bl-btn-primary" onClick={() => onNavigateTab('subscriptions')}>
            Manage subscriptions
          </button>
        </div>
      </section>

      {/* Metrics Row */}
      <div className="bl-stats-grid">
        <StatCard
          title="Monthly Recurring Revenue"
          value={`₹${Math.round(mrr).toLocaleString('en-IN')}`}
          subtitle={`Annualized Run Rate: ₹${Math.round(arr).toLocaleString('en-IN')}`}
          icon={<TrendingUp size={20} />}
          onClick={() => onNavigateTab('subscriptions')}
        />
        <StatCard
          title="Active Subscriptions"
          value={activeSubs.length}
          subtitle={`${subscriptions.length} total across all tiers`}
          icon={<Repeat size={20} />}
          onClick={() => onNavigateTab('subscriptions')}
        />
        <StatCard
          title="Customers"
          value={customers.length}
          subtitle="Across all accounts"
          icon={<Users size={20} />}
          onClick={() => onNavigateTab('customers')}
        />
        <StatCard
          title="Overdue balance"
          value={`₹${Math.round(totalOverdueAmount).toLocaleString('en-IN')}`}
          subtitle={`${overdueInvoices.length} invoices need attention`}
          icon={<AlertTriangle size={20} />}
          onClick={() => onNavigateTab('invoices')}
        />
        <StatCard
          title="Average customer risk"
          value={`${avgRisk}/100`}
          subtitle="Based on account history"
          icon={<ShieldAlert size={20} />}
          onClick={() => onNavigateTab('customers')}
        />
      </div>

      {/* Main Grid: Overdue Risk Actions & Scheduled Automation */}
      <div className="bl-dashboard-primary-grid">
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
                    const riskScore = Number(cust?.risk_score ?? 0);
                    const riskLevel = riskScore >= 75
                      ? 'severe'
                      : riskScore >= 50
                      ? 'high'
                      : riskScore >= 25
                      ? 'medium'
                      : 'low';
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
                          <span className="bl-risk-score">
                            <Badge status={riskLevel} />
                            <span>{riskScore}/100</span>
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

          <div className="bl-billing-summary">
            <div className="bl-billing-summary-icon"><Calendar size={18} /></div>
            <div>
              <strong>Billing overview</strong>
              <p>{activeSubs.length} active subscriptions · {openInvoices.length} open invoices</p>
            </div>
          </div>
          <button
            className="bl-btn bl-btn-secondary bl-billing-link"
            onClick={() => onNavigateTab('invoices')}
          >
            Review invoices <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Recent Subscriptions & Recent Payments */}
      <div className="bl-dashboard-secondary-grid">
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
                {subscriptions.length === 0 ? (
                  <tr><td colSpan={4} className="bl-table-empty">No subscriptions yet.</td></tr>
                ) : subscriptions.slice(0, 5).map((sub) => (
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
                {payments.length === 0 ? (
                  <tr><td colSpan={4} className="bl-table-empty">No payments recorded yet.</td></tr>
                ) : payments.slice(0, 5).map((p) => (
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
