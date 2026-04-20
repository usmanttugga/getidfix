# Implementation Tasks: GETIDFIX SaaS Verification Platform

## Overview

Simplified, focused task list targeting a working app as fast as possible. The monorepo scaffold, tooling, and testing infrastructure are already in place. Tasks start from database reset and build up through backend, then frontend.

---

## Tasks

- [x] 1. Reset Prisma schema and seed data
  - Replace `apps/backend/prisma/schema.prisma` with the simplified 7-model schema: `User`, `Wallet`, `Service`, `ServiceRequest`, `WalletTransaction`, `Notification`, `PasswordResetToken`
  - Define enums: `Role`, `UserStatus`, `ServiceCategory`, `RequestStatus`, `WalletTransactionType`
  - Delete the existing migration folder and create a new initial migration SQL
  - Replace `apps/backend/prisma/seed.ts` with a script that creates one admin user and seeds all 13 services with default prices
  - _Requirements: 1.1, 5.1, 6.4, 13.1_

- [x] 2. Implement JWT utilities and auth middleware
  - Update `apps/backend/src/utils/jwt.ts`: `signAccessToken(userId, role)` (15-min HS256), `verifyAccessToken(token)`, `generateRefreshToken()` (UUID stored in Redis with 7-day TTL), `revokeRefreshToken(token)`
  - Update `apps/backend/src/middleware/auth.ts`: `authenticate` middleware (Bearer token → `req.user`), `requireAdmin` middleware (403 if not ADMIN role)
  - _Requirements: 1.3, 2.1, 2.2, 2.3, 2.4_

- [x] 3. Implement auth routes
  - Create `apps/backend/src/routes/auth.router.ts` and wire into `src/index.ts` at `/api/v1/auth`
  - `POST /auth/register` — validate email/name/phone/password, hash password, create User + Wallet in one transaction, return access + refresh tokens
  - `POST /auth/login` — bcrypt compare, issue tokens, set refresh token in Redis
  - `POST /auth/logout` — delete refresh token from Redis
  - `POST /auth/refresh` — validate refresh token from Redis, issue new access token
  - `POST /auth/forgot-password` — generate token, hash and store in `PasswordResetToken`, send email via `email.service.ts`
  - `POST /auth/reset-password` — validate token hash + expiry + `used` flag, update password, mark token used
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 1.7_

- [x] 4. Implement wallet service and routes
  - Create `apps/backend/src/services/wallet.service.ts` with:
    - `debitWallet(userId, amount, description, reference)` — atomic: check balance, update `Wallet.balance`, create `WalletTransaction` (DEBIT), throw `INSUFFICIENT_BALANCE` if low
    - `creditWallet(userId, amount, description, reference)` — atomic: update balance, create `WalletTransaction` (CREDIT)
    - `refundWallet(userId, amount, description, reference)` — atomic: update balance, create `WalletTransaction` (REFUND)
  - Create `apps/backend/src/routes/wallet.router.ts`:
    - `GET /wallet` — return balance + last 20 `WalletTransaction` records
    - `POST /wallet/fund` — validate amount (₦100–₦1,000,000), call Paystack API, return checkout URL
    - `POST /wallet/webhook` — verify HMAC-SHA512 signature, credit wallet on `charge.success`, idempotency via Redis
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 5. Implement service request service and routes
  - Create `apps/backend/src/services/request.service.ts` with:
    - `submitRequest(userId, serviceSlug, formData)` — validate service enabled, check balance, debit wallet + create `ServiceRequest` (PENDING) in one transaction, return `{ id, reference, status }`
    - `listRequests(userId, page, limit)` — paginated, scoped to user
    - `getRequest(userId, requestId)` — single request detail
  - Create `apps/backend/src/routes/requests.router.ts`:
    - `POST /requests` — calls `submitRequest`, then dispatches to automated handler if applicable
    - `GET /requests` — paginated history
    - `GET /requests/:id` — single detail
  - Create `apps/backend/src/routes/services.router.ts`:
    - `GET /services` — list all enabled services
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 6. Implement notification service and routes
  - Create `apps/backend/src/services/notification.service.ts` with `createNotification(userId, title, body)`
  - Create `apps/backend/src/routes/notifications.router.ts`:
    - `GET /notifications` — list notifications for authenticated user, unread first
    - `PATCH /notifications/:id/read` — mark as read
  - Wire notification creation into wallet credit/debit and request status updates
  - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [x] 7. Implement automated service routes (NIN, Airtime, Data)
  - Create `apps/backend/src/routes/nin.router.ts`:
    - `POST /nin/verify` — validate 11-digit NIN, call NIMC API stub (return mock identity record), debit wallet, create COMPLETED `ServiceRequest`, return result
    - On NIMC API failure: do NOT debit wallet, return `EXTERNAL_API_ERROR`
  - Create `apps/backend/src/routes/airtime.router.ts`:
    - `POST /airtime/purchase` — validate 11-digit Nigerian phone, network (MTN/Airtel/Glo/9mobile), amount (₦50–₦50,000), call VTU stub, debit wallet on success only
  - Create `apps/backend/src/routes/data.router.ts`:
    - `GET /data/plans` — return static bundle plans per network
    - `POST /data/purchase` — validate phone, network, planId, call VTU stub, debit wallet on success only
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 10.1, 10.2, 10.3, 10.4, 10.5, 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 8. Implement admin routes
  - Create `apps/backend/src/routes/admin.router.ts` (all routes require `requireAdmin` middleware):
    - `GET /admin/dashboard` — counts: total users, pending requests, today's requests, today's wallet credits
    - `GET /admin/requests` — all requests, filterable by `status`/`serviceId`/`date`, paginated; include user name + service name
    - `GET /admin/requests/:id` — full detail with user info and `formData`
    - `PATCH /admin/requests/:id` — accept `{ action: "complete" | "reject", responseText, fileUrl? }`; on complete: set COMPLETED + store `adminResponse`; on reject: set REJECTED + refund wallet + create notification
    - `GET /admin/users` — paginated, searchable by name/email; include status + wallet balance
    - `PATCH /admin/users/:id` — set `status` to ACTIVE or SUSPENDED
    - `GET /admin/services` — all 13 services with price + enabled
    - `PATCH /admin/services/:id` — update `price` and/or `isEnabled`
  - _Requirements: 2.2, 2.5, 3.1, 3.2, 3.3, 3.4, 12.1, 12.2, 12.3, 12.4, 12.5, 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 9. Checkpoint — backend complete
  - Ensure all routes are wired in `src/index.ts`
  - Verify `npm run build` passes in `apps/backend`
  - Confirm seed script runs and creates admin + 13 services
  - Ask the user if questions arise before proceeding to frontend.

- [x] 10. Implement auth state and API client (frontend)
  - Create `apps/frontend/lib/api.ts` — Axios instance pointing to `NEXT_PUBLIC_API_URL`, attaches `Authorization: Bearer <token>` header, intercepts 401 to call `/auth/refresh` once then retries
  - Create `apps/frontend/lib/auth.ts` — token storage helpers (access token in memory, refresh token in httpOnly cookie)
  - Create `apps/frontend/contexts/AuthContext.tsx` — React Context with `user`, `accessToken`, `login`, `logout`, `isLoading`
  - Create `apps/frontend/components/auth/ProtectedRoute.tsx` — redirects unauthenticated users to `/login`
  - _Requirements: 1.3, 1.5, 2.3, 2.4_

- [x] 11. Build auth pages (Login + Register + Password Reset)
  - Create `apps/frontend/app/(auth)/login/page.tsx` — centered card with GETIDFIX logo, Login tab and Register tab; Login form: email + password; Register form: first name, last name, email, phone, password; `react-hook-form` + `zod` validation; on success redirect to role-specific dashboard
  - Create `apps/frontend/app/(auth)/forgot-password/page.tsx` — email input, success message on submit
  - Create `apps/frontend/app/(auth)/reset-password/page.tsx` — new password + confirm, reads token from URL query param, handles expired token error
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 1.7_

- [x] 12. Build brand and layout components
  - Create `apps/frontend/components/brand/GetIdfixLogo.tsx` — SVG shield (navy `#0F4C81`, green checkmark `#00C896`) + wordmark "GET**[ID]**FIX"; props: `iconOnly?: boolean`, `className?: string`
  - Create `apps/frontend/components/layout/DashboardSidebar.tsx` — user nav links: Overview, NIN Services (expandable), BVN Services (expandable), Airtime, Data, Wallet, Requests, Notifications
  - Create `apps/frontend/components/layout/AdminSidebar.tsx` — admin nav links: Dashboard, Requests, Users, Services
  - Create `apps/frontend/components/layout/TopBar.tsx` — logo, user display name, notification bell with unread count badge, logout button
  - Create `apps/frontend/app/dashboard/layout.tsx` — wraps user pages with `DashboardSidebar` + `TopBar`; requires auth
  - Create `apps/frontend/app/admin/layout.tsx` — wraps admin pages with `AdminSidebar` + `TopBar`; requires ADMIN role
  - _Requirements: 4.2, 15.1, 15.2, 15.3_

- [x] 13. Build user overview page and wallet components
  - Create `apps/frontend/app/dashboard/page.tsx` — wallet balance card, service grid grouped by category (NIN / BVN / Airtime / Data), recent 5 requests table
  - Create `apps/frontend/components/wallet/WalletCard.tsx` — displays balance in ₦, "Fund Wallet" button
  - Create `apps/frontend/components/wallet/FundWalletModal.tsx` — amount input (₦100–₦1,000,000), calls `POST /wallet/fund`, redirects to Paystack checkout URL
  - Create `apps/frontend/components/services/ServiceGrid.tsx` — renders service cards grouped by category; each card shows name, price, navigates to service page on click
  - _Requirements: 4.1, 4.3, 4.4, 5.2, 5.6_

- [x] 14. Build generic service request form and NIN pages
  - Create `apps/frontend/components/services/ServiceRequestForm.tsx` — renders form fields from a config object (label, name, type, validation), shows service price + current wallet balance, disabled submit if balance insufficient, calls `POST /requests` on submit, shows reference on success
  - Create `apps/frontend/app/dashboard/nin/verify/page.tsx` — NIN input (11-digit), calls `POST /nin/verify` directly, displays result card (name, DOB, gender, photo placeholder)
  - Create remaining 6 NIN pages using `ServiceRequestForm`: `validation`, `modification`, `ipe-clearance`, `vnin-slip`, `self-service`, `personalization` — each with appropriate field config
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.4, 8.1, 8.2_

- [x] 15. Build BVN, Airtime, and Data pages
  - Create 4 BVN pages using `ServiceRequestForm`: `apps/frontend/app/dashboard/bvn/verification`, `retrieval`, `modification`, `user` — each with appropriate field config
  - Create `apps/frontend/app/dashboard/airtime/page.tsx` — network selector (MTN/Airtel/Glo/9mobile), phone input, amount input, wallet balance preview, submit
  - Create `apps/frontend/app/dashboard/data/page.tsx` — network selector, phone input, fetch plans from `GET /data/plans`, display bundle grid, select plan, submit
  - _Requirements: 9.1, 9.2, 10.1, 10.4, 10.5, 11.1, 11.4, 11.5_

- [x] 16. Build wallet page, requests history, and notifications pages
  - Create `apps/frontend/app/dashboard/wallet/page.tsx` — balance display, fund wallet button (opens `FundWalletModal`), paginated `WalletTransaction` history table
  - Create `apps/frontend/app/dashboard/requests/page.tsx` — paginated table of all user requests: service name, status badge, amount, date, reference; click row to expand detail
  - Create `apps/frontend/app/dashboard/notifications/page.tsx` — list of notifications, unread highlighted, click to mark read, "Mark all read" button; unread count updates `TopBar` bell badge
  - _Requirements: 5.3, 5.4, 6.5, 14.1, 14.2, 14.3, 14.4_

- [x] 17. Build admin dashboard and requests pages
  - Create `apps/frontend/app/admin/page.tsx` — 4 stat cards: pending requests, today's requests, today's credits, total users; data from `GET /admin/dashboard`
  - Create `apps/frontend/app/admin/requests/page.tsx` — filterable table (status, service, date range), paginated; data from `GET /admin/requests`
  - Create `apps/frontend/app/admin/requests/[id]/page.tsx` — shows user info, service name, submitted `formData` fields, amount, timestamp; respond form: textarea for response text, optional file URL input, "Complete" and "Reject" buttons; calls `PATCH /admin/requests/:id`
  - _Requirements: 3.1, 3.2, 3.3, 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 18. Build admin users and services pages
  - Create `apps/frontend/app/admin/users/page.tsx` — searchable, paginated user table: name, email, status badge, wallet balance, registration date; "Suspend" / "Reactivate" action buttons with confirmation
  - Create `apps/frontend/app/admin/services/page.tsx` — table of all 13 services: name, category, price (inline editable), enabled toggle; save on blur/Enter for price; toggle calls `PATCH /admin/services/:id`
  - _Requirements: 2.5, 3.4, 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 19. Checkpoint — frontend complete
  - Verify `npm run build` passes in `apps/frontend`
  - Confirm all pages render without horizontal scroll at 375px and 1440px
  - Confirm loading spinners appear for async operations and empty states show on empty lists
  - Ask the user if questions arise before proceeding to tests.

- [x] 20. Write unit and integration tests
  - [x] 20.1 Unit tests for `wallet.service.ts`: debit throws on insufficient balance, credit increases balance, refund restores balance, all operations create a `WalletTransaction` record
    - _Requirements: 5.3, 5.6, 12.4_
  - [ ]* 20.2 Unit tests for `request.service.ts`: submit deducts wallet and creates PENDING request atomically, disabled service is rejected
    - _Requirements: 6.1, 6.2, 13.5_
  - [ ]* 20.3 Unit tests for NIN validation: accepts exactly 11 numeric digits, rejects anything else
    - _Requirements: 7.4_
  - [ ]* 20.4 Unit tests for auth service: register creates user + wallet, login returns tokens, refresh issues new access token, reset-password enforces expiry
    - _Requirements: 1.2, 1.3, 1.6, 1.7_
  - [ ]* 20.5 Integration test: register → login → submit service request → admin respond (complete) → verify request status and wallet unchanged
    - _Requirements: 6.2, 12.2, 12.3_
  - [ ]* 20.6 Integration test: admin reject → verify wallet refunded and notification created
    - _Requirements: 12.4, 14.1_

- [x] 21. Write Playwright E2E tests
  - [ ]* 21.1 E2E: visit `/login`, register new user, verify redirect to user dashboard
    - _Requirements: 1.1, 1.2_
  - [ ]* 21.2 E2E: login as user, navigate to a manual service (e.g. BVN Verification), submit form, verify request appears in Requests history with PENDING status
    - _Requirements: 6.2, 6.3, 6.5_
  - [ ]* 21.3 E2E: login as admin, open pending request, submit response, verify status changes to COMPLETED
    - _Requirements: 12.1, 12.2, 12.3_

- [x] 22. Final build verification
  - Run `npm run build` in both `apps/backend` and `apps/frontend` and confirm zero errors
  - Confirm all 13 services are seeded and visible in the user service grid
  - Confirm GETIDFIX logo appears on login page and dashboard header
  - _Requirements: 15.1, 15.2_

---

## Notes

- Sub-tasks marked with `*` are optional and can be skipped for a faster MVP
- All wallet mutations (debit, credit, refund) must use Prisma transactions — never update balance without a corresponding `WalletTransaction` record
- Automated services (NIN Verify, Airtime, Data) use stub/mock API clients during development; swap for real clients via environment config
- Paystack webhook endpoint is public (no auth middleware) but must verify HMAC-SHA512 signature before processing
- Admin role is assigned manually in the database (seed script); no self-registration as admin
