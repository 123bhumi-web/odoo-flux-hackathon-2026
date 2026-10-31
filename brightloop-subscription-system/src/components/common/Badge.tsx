import React from 'react';
import { SubscriptionStatus, InvoiceStatus, RiskLevel } from '../../types/database';

interface BadgeProps {
  status: SubscriptionStatus | InvoiceStatus | RiskLevel | string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
}

export const Badge: React.FC<BadgeProps> = ({ status, variant }) => {
  let badgeClass = 'bl-badge-neutral';

  const s = status.toLowerCase();

  if (variant) {
    badgeClass = `bl-badge-${variant}`;
  } else if (['active', 'paid', 'completed', 'low', 'confirmed'].includes(s)) {
    badgeClass = 'bl-badge-success';
  } else if (['paused', 'quotation', 'medium', 'pending'].includes(s)) {
    badgeClass = 'bl-badge-warning';
  } else if (['overdue', 'closed', 'severe', 'failed', 'high'].includes(s)) {
    badgeClass = 'bl-badge-danger';
  } else if (['draft', 'posted'].includes(s)) {
    badgeClass = 'bl-badge-info';
  }

  return (
    <span className={`bl-badge ${badgeClass}`}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: 'currentColor',
          display: 'inline-block',
        }}
      />
      {status}
    </span>
  );
};
