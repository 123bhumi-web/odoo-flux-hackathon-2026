import React from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  CircleDollarSign,
  CreditCard,
  FileCheck2,
  FileText,
  Globe,
  Layers3,
  Package,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import type { ActiveTab } from './Sidebar';

interface LandingPageProps {
  onNavigate: (tab: ActiveTab) => void;
}

const showcaseMetrics = [
  { label: 'Monthly recurring revenue', value: '₹24.8L', change: '+12.8%', icon: CircleDollarSign },
  { label: 'Active subscriptions', value: '1,284', change: '+8.2%', icon: Layers3 },
  { label: 'Revenue collected', value: '98.6%', change: '+2.4%', icon: BarChart3 },
];

const platformLinks: { title: string; description: string; tab: ActiveTab; icon: typeof Layers3 }[] = [
  { title: 'Subscriptions', description: 'Manage plans, renewals, and lifecycle changes.', tab: 'subscriptions', icon: Layers3 },
  { title: 'Quotations', description: 'Review proposals and turn approved quotes into subscriptions.', tab: 'quotations', icon: FileText },
  { title: 'Invoices', description: 'Review billing activity and outstanding balances.', tab: 'invoices', icon: FileCheck2 },
  { title: 'Payments', description: 'Track settlements and reconcile customer payments.', tab: 'payments', icon: CreditCard },
  { title: 'Customers', description: 'Explore customer accounts and subscription health.', tab: 'customers', icon: ShieldCheck },
  { title: 'Products & plans', description: 'Browse recurring plans, pricing, and product features.', tab: 'products', icon: Package },
  { title: 'Customer portal', description: 'Preview the self-service billing experience.', tab: 'portal', icon: Globe },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => (
  <div className="bl-landing">
    <header className="bl-landing-nav">
      <button className="bl-landing-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <span className="bl-landing-logo"><Zap size={19} fill="currentColor" /></span>
        <span>Brightloop</span>
      </button>
      <nav className="bl-landing-links" aria-label="Main navigation">
        <a href="#platform">Platform</a>
        <a href="#metrics">Overview</a>
      </nav>
      <div className="bl-landing-nav-actions">
        <button className="bl-landing-signin" onClick={() => onNavigate('dashboard')}>Explore app</button>
        <button className="bl-btn bl-btn-primary bl-btn-sm" onClick={() => onNavigate('dashboard')}>
          Open dashboard <ArrowUpRight size={15} />
        </button>
      </div>
    </header>

    <main>
      <section className="bl-landing-hero">
        <div className="bl-landing-hero-copy">
          <div className="bl-landing-pill"><Sparkles size={14} /> SUBSCRIPTION OPERATIONS, SIMPLIFIED</div>
          <h1>Recurring revenue,<br /><span>without the busywork.</span></h1>
          <p>
            One clear workspace for subscriptions, customer billing, and payment health.
            Spend less time chasing spreadsheets and more time growing your business.
          </p>
          <div className="bl-landing-hero-actions">
            <button className="bl-btn bl-btn-primary bl-btn-lg" onClick={() => onNavigate('dashboard')}>
              Explore the dashboard <ArrowRight size={17} />
            </button>
            <a className="bl-landing-text-link" href="#platform">See what you can manage</a>
          </div>
          <div className="bl-landing-proof">
            <span><Check size={14} /> Subscription lifecycle</span>
            <span><Check size={14} /> Recurring billing</span>
            <span><Check size={14} /> Customer insights</span>
          </div>
        </div>

        <div className="bl-showcase-wrap" aria-label="Illustrative subscription dashboard preview">
          <div className="bl-showcase-glow" />
          <div className="bl-showcase-window">
            <div className="bl-showcase-topbar">
              <div className="bl-showcase-brand">
                <span className="bl-showcase-mark"><Zap size={13} fill="currentColor" /></span>
                <strong>Brightloop</strong>
              </div>
              <span className="bl-showcase-period">Illustrative data</span>
            </div>
            <div className="bl-showcase-content">
              <div className="bl-showcase-heading">
                <div><small>SAMPLE DASHBOARD</small><h2>Good morning, Alex</h2></div>
                <span className="bl-showcase-status"><i /> Demo workspace</span>
              </div>
              <div className="bl-showcase-metrics" id="metrics">
                {showcaseMetrics.map(({ label, value, change, icon: Icon }) => (
                  <div className="bl-showcase-metric" key={label}>
                    <span className="bl-showcase-metric-icon"><Icon size={15} /></span>
                    <small>{label}</small>
                    <strong>{value}</strong>
                    <span className="bl-showcase-change">{change} this month</span>
                  </div>
                ))}
              </div>
              <div className="bl-showcase-chart">
                <div className="bl-showcase-chart-title"><div><strong>Revenue growth</strong><small>Monthly recurring revenue</small></div><b>+18.4%</b></div>
                <div className="bl-chart-area">
                  <div className="bl-chart-y-labels"><span>₹30L</span><span>₹20L</span><span>₹10L</span><span>₹0</span></div>
                  <svg viewBox="0 0 540 150" role="img" aria-label="Illustrative upward recurring revenue trend">
                    <defs>
                      <linearGradient id="revenue-fill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity=".22" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0 126 C45 119 48 110 86 113 S134 104 164 108 S210 91 245 95 S292 77 326 83 S366 68 402 72 S454 48 484 54 S515 35 540 25 V150 H0Z" fill="url(#revenue-fill)" />
                    <path d="M0 126 C45 119 48 110 86 113 S134 104 164 108 S210 91 245 95 S292 77 326 83 S366 68 402 72 S454 48 484 54 S515 35 540 25" fill="none" stroke="#5b5ce2" strokeWidth="3" strokeLinecap="round" />
                    {[0, 40, 80, 120].map((y) => <line key={y} x1="0" x2="540" y1={y} y2={y} stroke="#e9edf5" strokeDasharray="4 5" />)}
                  </svg>
                  <div className="bl-chart-x-labels"><span>Oct 01</span><span>Oct 08</span><span>Oct 15</span><span>Oct 22</span><span>Oct 30</span></div>
                </div>
              </div>
              <div className="bl-showcase-bottom">
                <span><span className="bl-showcase-dot" /> Active subscriptions</span>
                <strong>1,284 <small>+34 this month</small></strong>
                <div className="bl-showcase-avatars"><i>JD</i><i>AM</i><i>SK</i><b>+31</b></div>
              </div>
            </div>
          </div>
          <div className="bl-showcase-float"><span><Check size={14} /></span><div><strong>Payment received</strong><small>Acme Studio · ₹48,500</small></div></div>
        </div>
      </section>

      <section className="bl-landing-trust">
        <span>BUILT FOR THE DETAILS OF RECURRING REVENUE</span>
        <div><span>SUBSCRIPTIONS</span><i /><span>INVOICING</span><i /><span>PAYMENTS</span><i /><span>INSIGHTS</span></div>
      </section>

      <section className="bl-platform-section" id="platform">
        <div className="bl-landing-section-heading">
          <span className="bl-landing-pill"><Layers3 size={14} /> ONE CONNECTED WORKSPACE</span>
          <h2>Every moving part,<br />working together.</h2>
          <p>Browse the tools your team needs to manage the full subscription journey.</p>
        </div>
        <div className="bl-platform-cards">
          {platformLinks.map(({ title, description, tab, icon: Icon }) => (
            <button className="bl-platform-card" key={title} onClick={() => onNavigate(tab)}>
              <span className="bl-platform-icon"><Icon size={20} /></span>
              <span className="bl-platform-card-title">{title}<ArrowUpRight size={16} /></span>
              <span className="bl-platform-card-description">{description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="bl-landing-cta">
        <div><span className="bl-eyebrow">YOUR WORKSPACE IS READY</span><h2>See your subscription business clearly.</h2><p>Explore the interactive dashboard and discover the workflow.</p></div>
        <button className="bl-btn bl-btn-primary bl-btn-lg" onClick={() => onNavigate('dashboard')}>Go to dashboard <ArrowRight size={17} /></button>
      </section>
    </main>

    <footer className="bl-landing-footer">
      <button className="bl-landing-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <span className="bl-landing-logo"><Zap size={16} fill="currentColor" /></span><span>Brightloop</span>
      </button>
      <span>Subscription management, made clearer.</span>
      <span>© {new Date().getFullYear()} Brightloop · Showcase preview</span>
    </footer>
  </div>
);
