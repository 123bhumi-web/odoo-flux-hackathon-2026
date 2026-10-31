// ====================================================================
// Brightloop SQL Database Standalone HTTP Server
// Port: 3001 (or process.env.PORT)
// ====================================================================

import http from 'http';
import { sqlDb } from './database/db.js';

const PORT = process.env.PORT || 3001;

function parseBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  const url = req.url?.split('?')[0];
  res.setHeader('Content-Type', 'application/json');

  try {
    if (url === '/api/customers' && req.method === 'GET') {
      return res.end(JSON.stringify(sqlDb.getCustomers()));
    }
    if (url === '/api/customers' && req.method === 'POST') {
      const body = await parseBody(req);
      return res.end(JSON.stringify(sqlDb.addCustomer(body)));
    }
    if (url === '/api/plans' && req.method === 'GET') {
      return res.end(JSON.stringify(sqlDb.getPlans()));
    }
    if (url === '/api/plans' && req.method === 'POST') {
      const body = await parseBody(req);
      return res.end(JSON.stringify(sqlDb.addPlan(body)));
    }
    if (url === '/api/subscriptions' && req.method === 'GET') {
      return res.end(JSON.stringify(sqlDb.getSubscriptions()));
    }
    if (url === '/api/subscriptions' && req.method === 'POST') {
      const body = await parseBody(req);
      return res.end(JSON.stringify(sqlDb.addSubscription(body)));
    }
    if (url?.match(/\/api\/subscriptions\/([^/]+)\/transition/) && req.method === 'POST') {
      const id = url.split('/')[3];
      const body = await parseBody(req);
      return res.end(JSON.stringify(sqlDb.transitionSubscriptionState(id, body.targetState)));
    }
    if (url === '/api/invoices' && req.method === 'GET') {
      return res.end(JSON.stringify(sqlDb.getInvoices()));
    }
    if (url === '/api/invoices' && req.method === 'POST') {
      const body = await parseBody(req);
      return res.end(JSON.stringify(sqlDb.addInvoice(body)));
    }
    if (url === '/api/payments' && req.method === 'GET') {
      return res.end(JSON.stringify(sqlDb.getPayments()));
    }
    if (url === '/api/payments' && req.method === 'POST') {
      const body = await parseBody(req);
      return res.end(JSON.stringify(sqlDb.recordPayment(body)));
    }
    if (url === '/api/billing/run' && req.method === 'POST') {
      const body = await parseBody(req);
      return res.end(JSON.stringify(sqlDb.runScheduledBilling(body.run_date)));
    }
    if (url === '/api/gravity/log' && req.method === 'POST') {
      const body = await parseBody(req);
      sqlDb.logGravityRisk(body);
      return res.end(JSON.stringify({ success: true }));
    }
    if (url === '/api/sql/execute' && req.method === 'POST') {
      const body = await parseBody(req);
      return res.end(JSON.stringify(sqlDb.executeRawSql(body.query)));
    }

    res.statusCode = 404;
    return res.end(JSON.stringify({ error: 'Endpoint not found' }));
  } catch (err) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`⚡ [Brightloop SQL Server] Listening on http://localhost:${PORT}`);
});
