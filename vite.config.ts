import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

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

function sqlApiPlugin() {
  return {
    name: 'sql-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0];

        if (!url?.startsWith('/api/')) {
          return next();
        }

        res.setHeader('Content-Type', 'application/json');

        try {
          const databaseModule = pathToFileURL(path.resolve('database', 'db.js')).href;
          const { sqlDb } = await import(databaseModule);

          // Customers
          if (url === '/api/customers' && req.method === 'GET') {
            return res.end(JSON.stringify(sqlDb.getCustomers()));
          }
          if (url === '/api/customers' && req.method === 'POST') {
            const body = await parseBody(req);
            return res.end(JSON.stringify(sqlDb.addCustomer(body)));
          }

          // Plans
          if (url === '/api/plans' && req.method === 'GET') {
            return res.end(JSON.stringify(sqlDb.getPlans()));
          }
          if (url === '/api/plans' && req.method === 'POST') {
            const body = await parseBody(req);
            return res.end(JSON.stringify(sqlDb.addPlan(body)));
          }

          // Subscriptions
          if (url === '/api/subscriptions' && req.method === 'GET') {
            return res.end(JSON.stringify(sqlDb.getSubscriptions()));
          }
          if (url === '/api/subscriptions' && req.method === 'POST') {
            const body = await parseBody(req);
            return res.end(JSON.stringify(sqlDb.addSubscription(body)));
          }
          if (url.match(/\/api\/subscriptions\/([^/]+)\/transition/) && req.method === 'POST') {
            const id = url.split('/')[3];
            const body = await parseBody(req);
            return res.end(JSON.stringify(sqlDb.transitionSubscriptionState(id, body.targetState)));
          }

          // Invoices
          if (url === '/api/invoices' && req.method === 'GET') {
            return res.end(JSON.stringify(sqlDb.getInvoices()));
          }
          if (url === '/api/invoices' && req.method === 'POST') {
            const body = await parseBody(req);
            return res.end(JSON.stringify(sqlDb.addInvoice(body)));
          }

          // Payments
          if (url === '/api/payments' && req.method === 'GET') {
            return res.end(JSON.stringify(sqlDb.getPayments()));
          }
          if (url === '/api/payments' && req.method === 'POST') {
            const body = await parseBody(req);
            return res.end(JSON.stringify(sqlDb.recordPayment(body)));
          }

          // Scheduled Billing Procedure
          if (url === '/api/billing/run' && req.method === 'POST') {
            const body = await parseBody(req);
            return res.end(JSON.stringify(sqlDb.runScheduledBilling(body.run_date)));
          }

          // Gravity AI Risk Logging
          if (url === '/api/gravity/log' && req.method === 'POST') {
            const body = await parseBody(req);
            sqlDb.logGravityRisk(body);
            return res.end(JSON.stringify({ success: true }));
          }

          // Raw SQL Console Executor
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
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), sqlApiPlugin()],
  server: {
    port: 5173,
    host: true,
  },
});
