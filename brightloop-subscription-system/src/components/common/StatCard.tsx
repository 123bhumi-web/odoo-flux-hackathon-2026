import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  onClick,
}) => {
  return (
    <div
      className="bl-stat-card"
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <div className="bl-stat-header">
        <span className="bl-stat-title">{title}</span>
        <div className="bl-stat-icon">{icon}</div>
      </div>
      <div className="bl-stat-value">{value}</div>
      {(subtitle || trend) && (
        <div className="bl-stat-footer">
          {trend && (
            <span className={`bl-stat-trend ${trend.isPositive ? 'up' : 'down'}`}>
              {trend.isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {trend.value}
            </span>
          )}
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
