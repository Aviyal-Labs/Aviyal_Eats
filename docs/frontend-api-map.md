# Frontend API map

Audited 4 November 2026 against this checkout. **Source verified; live responses not yet verified.**
The supplied Downloads guide identifies itself as implementation.md; no implementation.md or original Week 1 guides exist in this checkout.

Sources: backend/config/urls.py; accounts/{urls,views,serializers,services,tokens,authentication,google_services}.py;
restaurants/{urls,views,serializers,services}.py; approvals/{urls,views,serializers,pagination,services}.py;
config/settings/base.py; tests/test_auth_sessions.py and other backend/tests.

All routes below start with /api/v1/. Successful JSON uses
`{success,message,data}`. Logout returns 204 with no body.
DRF errors generally use `{detail}` or field-to-array objects, **not** the guide's proposed error envelope.
Refresh has an explicit INVALID_REFRESH_SESSION envelope. X-Request-ID is not established by the inspected source.

## Authentication (authApi.js)

| Method and route | Request | Success data/status |
| --- | --- | --- |
| POST auth/register/ | owner_full_name,email,mobile,password,restaurant_name,restaurant_phone,city,slug | verification_required,otp_expires_in_seconds,resend_after_seconds; 202 |
| POST auth/register/verify-otp/ | email,otp (six digits) | restaurant:{id,name,slug,status}; 201; **no session** |
| POST auth/register/resend-otp/ | email | verification timing; 200; generic acknowledgement also during cooldown |
| POST auth/login/ | email,password | access_token,access_expires_in,user,restaurant; 200 + refresh cookie |
| GET auth/csrf/ | none | csrf_token; 200 + CSRF cookie |
| POST auth/refresh/ | empty, refresh cookie, X-CSRFToken | access_token,access_expires_in; 200 + rotated cookie |
| GET auth/me/ | bearer | user,restaurant; 200 |
| POST auth/logout/ | bearer + X-CSRFToken + cookies | 204; revoke current session, delete cookie |
| POST auth/logout-all/ | bearer + X-CSRFToken + cookies | 204; revoke all sessions, delete cookie |
| POST auth/password-reset/request/ | email | null; generic message; 200 |
| POST auth/password-reset/confirm/ | email,otp,new_password | null; 200; revokes existing sessions |
| POST auth/google/login/ | credential | access_token,access_expires_in,user,restaurant; 200 + cookie |
| POST auth/google/signup/ | credential,mobile,restaurant_name,restaurant_phone,city,requested_slug | same session; 201 + cookie |

Email registration uses **slug**; Google signup uses **requested_slug**.
Email user DTO: id,full_name,email,mobile,role,email_verified_at.
Google session user DTO omits mobile/email_verified_at; GET me provides them.
Restaurant session DTO: id,name,slug,status only; **no rejection reason, phone or city**.

Registration errors: 400 fields/OTP, 409 conflicts, 410 expired OTP, 503 delivery.
Resend intentionally returns generic 200 for cooldown/unknown addresses.
Login: 401 invalid credentials, 423 lockout, 429 throttling.
Google: 404 unregistered identity on login, 409 signup conflict, 400 validation, 403 forbidden identity.
DRF does not necessarily serialize APIException.default_code into a code field.

Session rules: access JWT in memory; refresh_token HttpOnly cookie, path /api/v1/auth/,
SameSite Lax by default, Secure from backend environment; 30-minute access, 30-day absolute session.
CSRF protection explicitly decorates refresh/logout/logout-all; bearer required for me and logout.
CORS credentials and http://localhost:5173 are configured in base settings.

## Owner (ownerApi.js)

| Method and route | Request/permissions | Success |
| --- | --- | --- |
| PATCH owner/restaurant/ | bearer OWNER, REJECTED only; name,phone,city (partial, at least one) | 200 restaurant |
| POST owner/restaurant/resubmit/ | bearer OWNER, REJECTED only | 200 restaurant |

Restaurant mutation DTO: id,name,phone,city,slug,status,rejection_reason,approved_at,created_at,updated_at.
The slug is **not editable**. Status conflicts are 409; invalid fields 400; role failures 403.

**Missing:** GET owner/restaurant/ (405), GET owner/profile/ (404), GET owner/dashboard/ (404).
Do not manufacture these endpoints. Profile/basic dashboard can display the verified me DTO;
rejected edit prefill and rejection reason require backend coordination.

## Super Admin (adminApi.js)

All require bearer + SUPER_ADMIN; OWNER cannot access these APIs.

| Method and route | Request | Success |
| --- | --- | --- |
| GET admin/restaurants/ | status,search,page,page_size | 200 {count,next,previous,results} |
| GET admin/restaurants/{uuid}/ | none | 200 {restaurant,approval_history} |
| POST admin/restaurants/{uuid}/approve/ | empty | 200 restaurant mutation DTO |
| POST admin/restaurants/{uuid}/reject/ | reason (required, trimmed, max 2000) | 200 restaurant mutation DTO |

List DTO: id,name,slug,phone,city,status,rejection_reason,owner_email,owner_name,approved_at,created_at,updated_at.
History DTO: id,action,previous_status,new_status,reason,actor_email,created_at.
History is included newest first in details; **no /history/ endpoint exists**.
Search covers name,city,slug,owner email/full name. Fixed ordering: -created_at,-id.
Pagination defaults to 10; page_size=20 is supported (maximum 100).
The ordering query parameter is ignored; oldest-first needs a backend change.
Errors: 400 invalid filter/reason, 403 role, 404 missing UUID/page, 409 status conflict.

## Not implemented

Plans, pricing, subscriptions, checkout, entitlements and admin plan publication have no routes.
No frontend request should assume them.

## Latest verification and frontend adapters

4 November 2026: live /api/schema/ confirms both Google routes. Browser account authentication is
not yet verified. authApi.googleLogin and authApi.googleSignup use the exact serializer fields above;
GoogleAuthSection checks the login path, 404 and verified detail/code before showing onboarding.
No credential is placed in router state, browser storage or logs.

backendSmoke.mjs passed against localhost:8000: CSRF bootstrap, credentialed CORS, missing-CSRF 403,
invalid-refresh-session 401, anonymous me/admin 401, empty registration field validation 400.
All eight public/auth HTTP routes return 200 from the running frontend; this is HTTP readiness,
not evidence of visual or authenticated browser correctness.
The existing Django regression suite passes all 65 tests. The user confirmed receipt of a direct
SMTP delivery check; this does not establish actual registration/reset/approval-worker delivery.

Frontend route /r/:restaurantSlug/dashboard is an alias guarded by OWNER, APPROVED and an exact
match to authenticated me.restaurant.slug. It does not introduce a backend endpoint or send slug
as authorization. Owner data APIs remain scoped to request.user.