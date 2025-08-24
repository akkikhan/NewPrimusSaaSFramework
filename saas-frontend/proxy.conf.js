// Dynamic proxy config to route specific v2 tenant paths correctly
// - /api/v2/tenants/:id/modules/** and /api/v2/tenants/onboard -> Orchestrator (7008)
// - other /api/v2/tenants/** -> Config API (7017)
// - /api/v2/** fallback -> Orchestrator (7008)
// - /api/v1/** -> Config API (7017)

const toGateway = 'http://localhost:8080';

/** @type {import('http-proxy-middleware').Options | import('http-proxy-middleware').Options[]} */
module.exports = [
  {
    context: ['/api', '/orchestrator'],
    target: toGateway,
    changeOrigin: true,
    secure: false,
    logLevel: 'debug',
  }
];
