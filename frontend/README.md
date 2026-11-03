# Aviyal Eats frontend

React/Vite/JavaScript frontend integrated with Django. Public home/features/pricing-preview pages,
email/Google onboarding, owner status/account screens, and Super Admin approval screens are implemented.
There are no runtime mock accounts, fixed OTPs or simulated subscriptions.

Run npm.cmd ci then npm.cmd run dev. The API defaults to http://localhost:8000.
Set the public VITE_GOOGLE_CLIENT_ID in an ignored .env.local file to match Django's Google client.
Use localhost:5173 as an authorized Google origin. Never copy backend secrets into VITE variables.

Docker: docker compose -f docker-compose.yml -f docker-compose.frontend.yml up --build -d

Checks: npm.cmd test; npm.cmd run build; node test/backendSmoke.mjs (requires Django).

Read [integration notes](../docs/frontend-integration.md), [API map](../docs/frontend-api-map.md),
[test results](../docs/frontend-test-results.md) and [known gaps](../docs/frontend-known-gaps.md).
Owner read data and some live browser acceptance checks still require coordination/verification.