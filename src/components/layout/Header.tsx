import React, { useState } from 'react';
import { PlayCircle, Search, RefreshCw } from 'lucide-react';
import { BillingEngine } from '../../services/billingEngine';
import { ScheduledBillingRunResult } from '../../types/models';

interface HeaderProps {
  title: string;
  subtitle: string;
  onBillingRunComplete: (result: ScheduledBillingRunResult) => void;
  onSearch: (term: string) => void;
  onError: (message: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onBillingRunComplete,
  onSearch,
  onError,
}) => {
  const [isRunningBilling, setIsRunningBilling] = useState(false);

  const handleExecuteBilling = async () => {
    setIsRunningBilling(true);
    try {
      const result = await BillingEngine.runScheduledBilling();
      onBillingRunComplete(result);
    } catch (err) {
      console.error('Scheduled billing execution failed:', err);
      onError('Could not run scheduled billing. Please try again.');
    } finally {
      setIsRunningBilling(false);
    }
  };

  return (
    <header className="bl-header">
      <div className="bl-header-left">
        <div className="bl-page-title">
          <h2>{title}</h2>
          <span>{subtitle}</span>
        </div>
      </div>

      <div className="bl-header-right">
        <label className="bl-header-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="text"
            placeholder="Search records..."
            aria-label="Search records"
            onChange={(e) => onSearch(e.target.value)}
          />
        </label>

        <div className="bl-workspace-tag">
          <span aria-hidden="true" />
          India GST · 18%
        </div>

        <button
          className="bl-btn bl-btn-primary bl-btn-sm"
          onClick={handleExecuteBilling}
          disabled={isRunningBilling}
          title="Executes stored procedure run_scheduled_billing to scan subscriptions and generate GST invoices"
        >
          {isRunningBilling ? (
            <RefreshCw size={15} className="bl-spin" />
          ) : (
            <PlayCircle size={15} />
          )}
          <span>{isRunningBilling ? 'Running…' : 'Run billing'}</span>
        </button>
      </div>
    </header>
  );
};
