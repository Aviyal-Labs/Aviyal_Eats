# Frontend test results

4 November 2026, after implementing the remaining guide pages and Google onboarding.

| Check | Actual result |
| --- | --- |
| npm.cmd test | 104 passed, 0 failed |
| npm.cmd run build | Passed; existing Zod annotation and bundle-size advisories |
| node test/backendSmoke.mjs | Passed against running localhost:8000 |
| Django pytest tests/ -q | 65 passed in 18.34 seconds |
| Django manage.py check | No issues |
| /api/schema/ | HTTP 200; both Google routes confirmed |
| /, /features, /pricing and five auth routes | HTTP 200 |
| PlanEditorPreview (unlinked future UI) | JSX transform passed |
| Public Google configuration | Matches backend public ID in ignored .env.local |
| SMTP delivery check | 1 message accepted; user confirmed mailbox arrival |
| Runtime source scan | No mock/fixture/demo data, fixed OTPs or browser token storage |
| Backend source diff | No changes |

Session tests cover shared refresh, bearer/CSRF logout ordering, empty 204, no write replay,
cross-tab clear vs late response, at-most-one retry and old refresh failure vs newer login.
Google transport tests cover exact fields (requested_slug), no client identity/role claims,
specific unregistered-account detection, phone/slug validation and fail-closed routing.
Schema, OTP model and utility tests remain. Test-only transport responses are not app fixtures.

The smoke script checks CSRF cookie/bootstrap and credentialed CORS, refresh 403 without CSRF,
refresh 401 without a session, anonymous me/admin 401 and invalid registration 400.
It does not create accounts or send email. The separate SMTP check was explicitly requested
for the user's mailbox and did not create an account.

## Verification limits

The browser access host reports unavailable. Screenshots, responsive layouts, keyboard/dialog
walkthrough, browser console, real Google account login and authenticated end-to-end behavior
were not verified. HTTP 200 and passing unit/build checks do not establish those outcomes.

An optional Vite server-render experiment could not run due to CommonJS router interop in the
Node SSR loader. This application remains a client-rendered SPA; no SSR configuration or library
changes were made to compensate. The production client build succeeds.

Real registration/reset OTP and approval-worker delivery remain pending. SMTP delivery confirmation
alone is not proof of those flows. The missing owner read DTO and unsupported oldest-first sort
are documented in frontend-known-gaps.md for backend coordination.

Docker serves the frontend with the local integration Compose override. No existing database
volumes were removed and no backend source/security/model changes were made.