import React from 'react';
import {
  LayoutDashboard,
  Repeat,
  FileSpreadsheet,
  Receipt,
  CreditCard,
  Users,
  Package,
  Globe,
  RotateCcw,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { store } from '../../lib/storage';

export type ActiveTab =
  | 'dashboard'
  | 'subscriptions'
  | 'quotations'
  | 'invoices'
  | 'payments'
  | 'customers'
  | 'products'
  | 'portal';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  counts: {
    subscriptions: number;
    invoices: number;
    quotations: number;
  };
  onToast: (msg: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  counts,
  onToast,
}) => {
  const isConnected = isSupabaseConfigured();

  const handleResetData = () => {
    if (window.confirm('Reset all demo subscriptions, invoices, and customers to default hackathon dataset?')) {
      store.resetToSeed();
      onToast('Demo state reset to initial seed data');
    }
  };

  return (
    <aside className="bl-sidebar">
      {/* Brand & Logo */}
      <div className="bl-sidebar-brand">
        <div className="bl-logo-box">
          <Zap size={22} fill="white" />
        </div>
        <div className="bl-brand-text">
          <h1>Brightloop</h1>
          <span>Odoo x FLUX Edition</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="bl-sidebar-nav">
        <div className="bl-nav-section-title">Core Operations</div>

        <button
          className={`bl-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </button>

        <button
          className={`bl-nav-item ${activeTab === 'subscriptions' ? 'active' : ''}`}
          onClick={() => setActiveTab('subscriptions')}
        >
          <Repeat size={18} />
          <span>Subscriptions</span>
          <span className="bl-nav-badge">{counts.subscriptions}</span>
        </button>

        <button
          className={`bl-nav-item ${activeTab === 'quotations' ? 'active' : ''}`}
          onClick={() => setActiveTab('quotations')}
        >
          <FileSpreadsheet size={18} />
          <span>Quotations</span>
          <span className="bl-nav-badge">{counts.quotations}</span>
        </button>

        <div className="bl-nav-section-title">Billing & Financials</div>

        <button
          className={`bl-nav-item ${activeTab === 'invoices' ? 'active' : ''}`}
          onClick={() => setActiveTab('invoices')}
        >
          <Receipt size={18} />
          <span>Invoices</span>
          <span className="bl-nav-badge">{counts.invoices}</span>
        </button>

        <button
          className={`bl-nav-item ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          <CreditCard size={18} />
          <span>Payments</span>
        </button>

        <div className="bl-nav-section-title">Catalog & Clients</div>

        <button
          className={`bl-nav-item ${activeTab === 'customers' ? 'active' : ''}`}
          onClick={() => setActiveTab('customers')}
        >
          <Users size={18} />
          <span>Customers</span>
        </button>

        <button
          className={`bl-nav-item ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          <Package size={18} />
          <span>Products & Plans</span>
        </button>
      </nav>

      {/* Footer & Self-Service Portal Launcher */}
      <div className="bl-sidebar-footer">
        <button
          type="button"
          className="bl-portal-switch-card"
          onClick={() => setActiveTab(activeTab === 'portal' ? 'dashboard' : 'portal')}
        >
          <div className="bl-portal-switch-heading">
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e0e7ff', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Globe size={14} color="#818cf8" />
              {activeTab === 'portal' ? 'Back to Admin' : 'Customer Portal'}
            </span>
            <ExternalLink size={12} color="#a5b4fc" />
          </div>
          <span className="bl-portal-description">
            {activeTab === 'portal' ? 'Return to billing operator workspace' : 'Preview self-service client interface'}
          </span>
        </button>

        {/* Backend Connectivity Status */}
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: isConnected ? '#10b981' : '#38bdf8',
                boxShadow: isConnected ? '0 0 8px #10b981' : '0 0 8px #38bdf8',
              }}
            />
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              {isConnected ? 'Supabase Live' : 'Reactive Engine'}
            </span>
          </div>

          <button
            onClick={handleResetData}
            title="Reset Mock Database Seed"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.7rem',
            }}
          >
            <RotateCcw size={11} /> Reset
          </button>
        </div>
      </div>
    </aside>
  );
};
