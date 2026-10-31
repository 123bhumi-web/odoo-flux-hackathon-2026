import React, { useState } from 'react';
import { SqlClient, SqlQueryResult } from '../../lib/sqlClient';
import { Database, Play, CheckCircle2, AlertCircle, Copy, Terminal, RefreshCw } from 'lucide-react';

export const SqlConsoleView: React.FC = () => {
  const [query, setQuery] = useState('SELECT subscription_number, status, billing_interval, unit_price, tax_amount, total_amount FROM subscriptions;');
  const [result, setResult] = useState<SqlQueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const sampleQueries = [
    {
      label: 'All Active Subscriptions',
      sql: "SELECT subscription_number, customer_id, status, total_amount, next_billing_date FROM subscriptions WHERE status = 'active';",
    },
    {
      label: 'Overdue Invoices & Balance Due',
      sql: "SELECT invoice_number, customer_id, due_date, total_amount, amount_paid, balance_due FROM invoices WHERE status = 'overdue';",
    },
    {
      label: '18% GST Revenue Summary by Tier',
      sql: "SELECT p.name as plan, COUNT(s.id) as subscriber_count, SUM(s.subtotal) as subtotal_sum, SUM(s.tax_amount) as gst_18_pct_sum, SUM(s.total_amount) as gross_revenue FROM subscriptions s JOIN products_plans p ON s.plan_id = p.id GROUP BY p.name;",
    },
    {
      label: 'Customer Risk & Credit Ratings',
      sql: 'SELECT name, company, gstin, credit_limit, risk_score FROM customers ORDER BY risk_score DESC;',
    },
    {
      label: 'Payments Reconciled vs Invoices',
      sql: 'SELECT p.payment_number, p.amount, p.payment_method, p.payment_date, i.invoice_number, i.status as invoice_status FROM payments p JOIN invoices i ON p.invoice_id = i.id;',
    },
  ];

  const handleExecute = async (sqlToRun = query) => {
    setIsExecuting(true);
    try {
      const res = await SqlClient.executeRawSql(sqlToRun);
      setResult(res);
    } catch (err: any) {
      setResult({ success: false, error: err.message || 'Execution failed' });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={18} color="#6366f1" />
          SQL Workbench & Database Query Console
        </h3>
        <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
          Execute direct standard SQL queries against the local <strong>brightloop.db</strong> engine.
        </p>
      </div>

      {/* Query Presets */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
        <span style={{ fontSize: '0.78rem', color: '#64748b', alignSelf: 'center', fontWeight: 600 }}>
          Sample SQL Queries:
        </span>
        {sampleQueries.map((item, idx) => (
          <button
            key={idx}
            className="bl-btn bl-btn-secondary bl-btn-sm"
            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
            onClick={() => {
              setQuery(item.sql);
              handleExecute(item.sql);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* SQL Editor Area */}
      <div className="bl-card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ position: 'relative' }}>
          <textarea
            className="bl-textarea"
            style={{
              fontFamily: 'monospace',
              fontSize: '0.86rem',
              backgroundColor: '#0f172a',
              color: '#38bdf8',
              lineHeight: 1.5,
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #1e293b',
              minHeight: '110px',
            }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Terminal size={14} /> Database: <strong>brightloop.db</strong> (Standard SQL)
          </span>

          <button
            className="bl-btn bl-btn-primary bl-btn-sm"
            onClick={() => handleExecute(query)}
            disabled={isExecuting}
          >
            {isExecuting ? <RefreshCw size={14} className="bl-spin" /> : <Play size={14} />}
            <span>Execute SQL Query</span>
          </button>
        </div>
      </div>

      {/* Query Results */}
      {result && (
        <div className="bl-card">
          <div className="bl-card-header" style={{ marginBottom: '14px' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {result.success ? (
                <>
                  <CheckCircle2 size={16} color="#10b981" />
                  <span>Query Executed Successfully</span>
                </>
              ) : (
                <>
                  <AlertCircle size={16} color="#dc2626" />
                  <span style={{ color: '#dc2626' }}>SQL Execution Error</span>
                </>
              )}
            </h4>

            {result.rows && (
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Rows returned: <strong>{result.count}</strong>
              </span>
            )}
          </div>

          {result.error && (
            <div
              style={{
                padding: '12px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#dc2626',
                fontFamily: 'monospace',
                fontSize: '0.82rem',
              }}
            >
              {result.error}
            </div>
          )}

          {result.rows && result.rows.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
              Query returned 0 matching records.
            </div>
          )}

          {result.rows && result.rows.length > 0 && (
            <div className="bl-table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="bl-table">
                <thead>
                  <tr>
                    {Object.keys(result.rows[0]).map((col) => (
                      <th key={col} style={{ fontSize: '0.74rem' }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {Object.keys(result.rows![0]).map((col) => (
                        <td key={col} style={{ fontSize: '0.82rem' }}>
                          {row[col] !== null && typeof row[col] === 'object'
                            ? JSON.stringify(row[col])
                            : String(row[col] ?? 'NULL')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
