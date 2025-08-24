# Dev proxy configuration

This app uses a dynamic proxy configuration (proxy.conf.js) to route API calls during development.

Why JS instead of JSON?

- We must split /api/v2/tenants traffic between two backends:
  - Orchestrator (7008) handles: /api/v2/tenants/onboard and /api/v2/tenants/:id/modules/**
  - Config API (7017) handles all other /api/v2/tenants/** routes
- Angular's JSON proxy cannot express conditional routing on a single context, so a small JS router is used.

Production builds still use relative URLs and rely on the server-side gateway/proxy in that environment.
