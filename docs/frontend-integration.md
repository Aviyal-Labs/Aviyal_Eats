# Frontend integration

Updated 4 November 2026. The supplied implementation guide has been reread in full. The frontend
uses the existing React/Vite/JavaScript stack and verified Django APIs, without runtime mocks,
fixture accounts, fixed OTPs or simulated subscriptions. No dependencies or backend source were changed.

## Run

From the repository root:

```powershell
docker compose -f docker-compose.yml -f docker-compose.frontend.yml up --build -d
```

Open http://localhost:5173/. The local override aligns DB_NAME with Compose's Aviyal_Eats database.
Existing migrations are applied. Do not delete database volumes or restore historical dumps for frontend tests.
For local Vite instead, run npm.cmd ci and npm.cmd run dev in frontend.

Public configuration is documented in frontend/.env.example. The matching backend public Google
OAuth client ID was copied into ignored frontend/.env.local. Only public VITE values belong there.
No Google client secret, SMTP credential or backend secret was copied. The Docker build includes
this public local configuration; recreating it on another developer machine requires their public Google ID.

## Page inventory

| Route | Implementation |
| --- | --- |
| / | Public home, navigation, onboarding explanation, current capabilities, CTA/footer |
| /features | Available capabilities separated from planned modules |
| /pricing | Starter/Growth/Pro preview, no prices, checkout, trial or live selection |
| /register | Real email registration, public plan-preview context, Google option |
| /login | Email/password and Google option; verified role/status destination |
| /verify-email | Six-digit OTP, timers, resend, actual verification, then sign in |
| /forgot-password | Generic reset request acknowledgement |
| /reset-password | Six-digit OTP and new password, clear/broadcast logout on success |
| /owner/pending | Authenticated identity and manual status refresh |
| /owner/rejected | Rejection screen; genuine reason only when available; email guidance otherwise |
| /owner/restaurant/edit | Allowed name/phone/city fields, save then resubmit, conflict handling |
| /owner/dashboard | Approved owner identity, no metrics, disabled future subscription slot |
| /r/:restaurantSlug/dashboard | Approved dashboard alias; slug must match authenticated restaurant |
| /owner/profile | Current authenticated owner and restaurant identity |
| /owner/settings | Shared account session controls, sign out all devices |
| /admin | Counts from real filtered server list results |
| /admin/restaurants/pending | Pending queue, 300ms search, 20/page |
| /admin/restaurants | Server search/status filter/pagination, newest-first |
| /admin/restaurants/:id | Nested detail DTO, embedded newest-first history, approve/reject confirmations |
| /admin/settings | Shared session controls |
| /loading, /forbidden, unknown routes | Loading, forbidden, not-found states |

## Authentication behavior

Access JWTs stay in memory; Django owns HttpOnly refresh cookies. Bootstrap runs CSRF, refresh, me.
Concurrent refreshes share a promise. Only reads automatically retry once; writes require explicit retry.
Logout sends bearer and CSRF before clearing state. Cross-tab logout clears bearer/context.
Bootstrap connectivity failures remain retryable. Late refresh/restore responses cannot overwrite a newer session.
Unknown roles/statuses fail closed. Slug is never sent as authority to owner APIs.

Registration sends exact serializer fields, excluding password confirmation and plan-preview context.
Verification creates a pending restaurant without fabricating a login session.
The owner edit endpoint supports name/phone/city only. A successful save remains in context if resubmit fails.
Unavailable phone/city start blank because there is no owner read endpoint; the user enters current details.

## Google flow

GoogleSignInButton loads the official Identity Services script, initializes once, and renders Google's button.
Login/register share GoogleAuthSection. Only the verified Google login 404 response opens onboarding.
The credential stays in a component ref, never browser storage or router state; it is cleared on unmount,
cancel, success, expiry and a five-minute local retention limit.
GoogleOnboardingForm collects mobile, restaurant_name, restaurant_phone, city and requested_slug.
A 401 asks for fresh Google verification; conflicts retain form input and never auto-link password accounts.
Success establishes the real session and follows role/approval routing. The backend remains identity authority.

Google configuration reference: https://developers.google.com/identity/gsi/web/reference/js-reference
The OAuth client must authorize http://localhost:5173 and match Django's GOOGLE_OAUTH_CLIENT_ID.
Real Google login is not claimed as browser-verified until the owner completes the account chooser.

## Future subscriptions

PlanCard/PlanFeatureList consume data objects. The three fixed identities are previews; prices, allocations
and numerical limits are not invented. A preview query may be acknowledged in registration but is never
sent as a server-side plan selection. Owner subscription management is visibly disabled.
PlanEditorPreview, FeatureToggle and UsageLimitInput are unlinked, disabled design components for a future
backend-controlled draft/publish workflow. No subscription URLs or plan-name entitlement checks exist.

## Checks and handoff

```powershell
cd frontend
npm.cmd test
npm.cmd run build
node test/backendSmoke.mjs
```

The smoke script requires running Django; it creates no accounts and sends no mail.
Transport tests use test-only adapter responses that are not bundled as app data.
See frontend-test-results.md for actual results and frontend-known-gaps.md for unresolved backend/manual checks.