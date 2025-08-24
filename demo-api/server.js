const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'SaaS Gateway',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.get('/api/status', (req, res) => {
  res.json({
    message: 'SaaS Platform API is running',
    version: '1.0.0',
    services: ['auth', 'tenant', 'notifications', 'rbac'],
    database: process.env.COSMOS_ENDPOINT ? 'connected' : 'disconnected'
  });
});

app.get('/api/tenants', (req, res) => {
  res.json({
    tenants: [
      { id: 1, name: 'Demo Tenant 1', status: 'active' },
      { id: 2, name: 'Demo Tenant 2', status: 'active' }
    ]
  });
});

app.get('/api/auth/status', (req, res) => {
  res.json({
    message: 'Authentication service is running',
    smtp_configured: !!process.env.SMTP_HOST
  });
});

// Catch all
app.get('*', (req, res) => {
  res.json({
    message: 'SaaS Platform Gateway',
    endpoints: ['/health', '/api/status', '/api/tenants', '/api/auth/status']
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 SaaS Gateway running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Cosmos DB: ${process.env.COSMOS_ENDPOINT ? 'configured' : 'not configured'}`);
  console.log(`SMTP: ${process.env.SMTP_HOST ? 'configured' : 'not configured'}`);
});
