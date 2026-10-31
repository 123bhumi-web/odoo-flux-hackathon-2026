import React, { useState } from 'react';
import { PlayCircle, Search, Calendar, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { BillingEngine } from '../../services/billingEngine';
import { ScheduledBillingRunResult } from '../../types/models';

interface HeaderProps {
  title: string;
  subtitle: string;
  onBillingRunComplete: (result: ScheduledBillingRunResult) => void;
  onSearch: (term: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onBillingRunComplete,
  onSearch,
}) => {
  const [isRunningBilling, setIsRunningBilling] = useState(false);
  const [todayStr] = useState(() => new Date().toISOString().split('T')[0]);

  const handleExecuteBilling = async () => {
    setIsRunningBilling(true);
    try {
      const result = await BillingEngine.runScheduledBilling(todayStr);
      onBillingRunComplete(result);
    } catch (err) {
      console.error('Scheduled billing execution failed:', err);
    } finally {
      setIsRunningBilling(false);
    }
  };

  return (
    <header className="bl-header">
      <div className="bl-header-left">
        <div className="bl-page-title">
          <h2>{title}</h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{subtitle}</span>
        </div>
      </div>

      <div className="bl-header-right">
        {/* Quick Search */}
        <div style={{ position: 'relative', width: '220px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
            }}
          />
          <input
            type="text"
            placeholder="Search records..."
            className="bl-input"
            style={{ paddingLeft: '36px', height: '38px', fontSize: '0.82rem' }}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>

        {/* Workspace Tag */}
        <div
          style={{
            background: '#f1f5f9',
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            fontSize: '0.78rem',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#6366f1' }} />
          <span>India GST Entity (18% Tax)</span>
        </div>

        {/* Global Billing Trigger Button */}
        <button
          className="bl-btn bl-btn-primary bl-btn-sm"
          onClick={handleExecuteBilling}
          disabled={isRunningBilling}
          title="Executes stored procedure run_scheduled_billing to scan subscriptions and generate GST invoices"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '38px' }}
        >
          {isRunningBilling ? (
            <RefreshCw size={15} className="bl-spin" />
          ) : (
            <PlayCircle size={15} />
          )}
          <span>{isRunningBilling ? 'Generating Invoices...' : 'Run Automated Billing'}</span>
        </button>
      </div>
    </header>
  );
};
