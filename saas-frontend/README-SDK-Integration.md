# SDK Integration Guide

This UI uses the local JavaScript SDK `@saasfactory/sdk` for core tenant and user operations, with safe HTTP fallbacks.

## Mapping: UI flows → ApiService → SDK

- Tenants
  - list: ApiService.getTenants → sdk.tenants.list(page, pageSize, { search, status }) → maps to PagedResult
  - get: ApiService.getTenant → sdk.tenants.get(id)
  - create: ApiService.createTenant → sdk.tenants.create(data)
  - update: ApiService.updateTenant → sdk.tenants.update(id, data)
  - delete: ApiService.deleteTenant → sdk.tenants.delete(id)
  - onboard: ApiService.onboardTenant → sdk.tenants.onboard({ tenant, adminUser, configuration })

- Users
  - send verification email: ApiService.sendUserVerification(userId) → HTTP POST /users/{id}/send-verification (SDK method pending)

If the SDK is unavailable at runtime, ApiService automatically uses the existing HTTP endpoints defined in `src/environments/environment.ts`.

## Standardized Tenant Fields

UI forms use the following fields end-to-end:

- name, domain, plan, status
- adminEmail, adminFirstName, adminLastName
- selectedModules (array)

For onboarding via SDK, `plan` and `status` are carried under `tenant.settings`, and admin names are placed under `adminUser`.

## Local SDK setup

- Dependency: `"@saasfactory/sdk": "file:../sdks/javascript"` in `saasfactory-ui/package.json`.
- Build the SDK: run from `saas-core-ui/sdks/javascript` → `npm run build` to populate `dist/` (done in repo).
- The UI build consumes `dist/index.js` and `dist/index.d.ts`.

## Environment

- Dev base: `environment.apiUrl` is a relative `/api/v1`; ApiService constructs an absolute URL for the SDK using `window.location.origin`.
- Tenant routes: `environment.api.endpoints.tenants` points to `/api/v2/tenants` (proxy routes locally).

## Notes

- The UI shows loading/empty/error states; SDK errors propagate through ApiService and display in the same way as HTTP errors.
- No dark mode changes were made.
