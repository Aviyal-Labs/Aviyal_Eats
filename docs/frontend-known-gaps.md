# Known gaps and backend coordination

Updated 4 November 2026. Public pages, Google onboarding UI and subscription previews are implemented.
No runtime mock data or invented endpoints were introduced.

## Required backend coordination

1. Owner read data: GET auth/me returns restaurant id/name/slug/status only. There is no GET owner/restaurant/
   (the view defines PATCH only), owner/profile/ or owner/dashboard/. A rejected owner cannot read the
   saved phone/city/rejection_reason after reload. The edit form leaves unavailable fields blank and
   displays only genuine available information. Request: provide an owner-scoped read DTO including
   name,phone,city,slug,status,rejection_reason,approved_at,created_at,updated_at. The backend developer
   must choose the route or extend me; do not silently change Django to satisfy the frontend.
2. Approved dashboard: the frontend displays authenticated identity behind an approval guard. There is
   no separate protected dashboard API. Request: define APPROVED-only backend dashboard permission/DTO
   when operational dashboard data is delivered.
3. Admin ordering: the server fixes newest-first and ignores ordering. The frontend does not offer a
   fake oldest option. Request: define a supported ordering parameter if oldest-first remains required.
4. Error metadata: DRF mostly returns detail/field objects. APIException.default_code and X-Request-ID
   are not guaranteed by current middleware. The frontend supports request IDs when present.

No backend source, cookies, serializer, models or security settings were changed.

## Manual acceptance still required

- Real Google account login/signup and authorized-origin behavior. The public ID is configured locally;
  this is configuration evidence, not proof of successful Google authentication.
- Real registration/reset OTP arrival and submission through the browser.
- Authenticated owner/admin browser transitions, rejected editing, approval/rejection and email worker delivery.
- Visual screenshots, mobile/tablet/desktop layout, keyboard focus/dialog walkthrough and browser console.
  The browser access host is unavailable in this environment. HTTP route checks do not replace these checks.
- The approved-owner slug alias checks the authenticated slug. API tenant isolation is server-side; manual
  URL tampering walkthrough remains pending.

SMTP accepted one user-requested delivery-check email, and the user confirmed inbox receipt.
The check did not create an account or prove OTP/approval-worker delivery.

## Explicit future dependencies

No plans/prices/subscriptions/payments/entitlements APIs exist. Plan editing is an unlinked disabled preview;
pricing has no actual numbers, checkout or promises of feature allocation. Backend publication/versioning,
payment provider, trial policy and existing-subscriber migration remain future decisions.

The original Week 1 specification files and docs/api-contract.md are absent in this checkout.
The supplied Downloads guide identifies itself as implementation.md; frontend-api-map.md records the verified source.