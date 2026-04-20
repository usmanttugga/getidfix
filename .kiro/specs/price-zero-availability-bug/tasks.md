# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Zero Price Rejected End-to-End
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to the concrete failing case (`price = 0`) to ensure reproducibility
  - Test 1 — Backend rejects zero price: send `PATCH /admin/services/:id` with `{ price: 0 }` to the **unfixed** backend; assert the response is `400` with a Zod validation error (confirms Root Cause 1 from design)
  - Test 2 — Frontend clears dirty state on error: simulate `handleSaveAll` where `updateService.mutateAsync` rejects; assert `priceEdits` is cleared (`{}`) and `saved` is `true` even though the mutation failed (confirms Root Cause 2 from design)
  - Test 3 — Cache not invalidated: after a successful price update on unfixed code, assert `cache:services` key is NOT deleted from Redis (confirms Root Cause 3 from design)
  - Test 4 — Zero-price debit called: submit a request for a zero-price service on unfixed code; assert `debitWallet` is called with `amount = 0` (confirms Root Cause 4 from design)
  - Run all tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bugs exist)
  - Document counterexamples found (e.g., backend returns `{ error: "Price must be greater than 0" }` for `price: 0`; frontend `priceEdits` is `{}` and `saved` is `true` despite rejection)
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Positive Price Updates and Non-Zero Request Submissions Unchanged
  - **IMPORTANT**: Follow observation-first methodology — run UNFIXED code with non-buggy inputs first, observe outputs, then write tests that assert those outputs
  - Observe: `PATCH /admin/services/:id` with `price = 500` returns `200` and `data.price === 500` on unfixed code
  - Observe: `PATCH /admin/services/:id/availability` with `{ isEnabled: false }` returns `200` and does not change `price` on unfixed code
  - Observe: `submitRequest` for a service with `price > 0` and sufficient balance creates a `PENDING` `ServiceRequest` and debits the wallet on unfixed code
  - Observe: `submitRequest` for a service with `price > 0` and insufficient balance throws `INSUFFICIENT_BALANCE` on unfixed code
  - Observe: `submitRequest` for a disabled service throws `SERVICE_DISABLED` regardless of price on unfixed code
  - Write property-based test: for all `price > 0` values (generated randomly), `PATCH /admin/services/:id` returns `200` and persists the correct price (from Preservation Requirements in design)
  - Write property-based test: for all `price > 0` values with sufficient balance, `submitRequest` debits the wallet exactly once and creates a `PENDING` `ServiceRequest`
  - Verify all preservation tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 3. Fix: zero price rejected and availability cache not invalidated

  - [ ] 3.1 Relax price validation floor in `admin.router.ts`
    - In `apps/backend/src/routes/admin.router.ts`, change `updateServiceSchema` from `z.number().min(0.01, 'Price must be greater than 0')` to `z.number().min(0, 'Price must be 0 or greater')`
    - _Bug_Condition: isBugCondition(X) where X.price = 0_
    - _Expected_Behavior: PATCH /admin/services/:id with price = 0 returns HTTP 200 and persists price: 0.00_
    - _Preservation: PATCH with price > 0 must continue to return 200 and persist the correct value_
    - _Requirements: 2.1, 3.1_

  - [ ] 3.2 Add Redis cache invalidation to the price PATCH handler
    - In `apps/backend/src/routes/admin.router.ts`, import `getRedisClient` from `../config/redis` and `REDIS_KEYS` from `../config/redisKeys`
    - After `prisma.service.update` in `PATCH /admin/services/:id`, add a best-effort `try/catch` block that calls `await getRedisClient().del(REDIS_KEYS.SERVICES_CACHE())`
    - Cache invalidation errors must NOT fail the HTTP request
    - _Bug_Condition: cache:services key persists after a price update_
    - _Expected_Behavior: cache:services key is deleted after every successful price update_
    - _Preservation: PATCH /admin/services/:id/availability behavior is unchanged by this sub-task_
    - _Requirements: 2.4_

  - [ ] 3.3 Add Redis cache invalidation to the availability PATCH handler
    - In `apps/backend/src/routes/admin.router.ts`, apply the same best-effort cache invalidation pattern after `prisma.service.update` in `PATCH /admin/services/:id/availability`
    - _Bug_Condition: cache:services key persists after an availability toggle_
    - _Expected_Behavior: cache:services key is deleted after every successful availability update_
    - _Preservation: PATCH /admin/services/:id price behavior is unchanged by this sub-task_
    - _Requirements: 2.4, 3.2_

  - [ ] 3.4 Fix `handleSaveAll` in `pricing/page.tsx` to use `Promise.allSettled`
    - In `apps/frontend/app/admin/pricing/page.tsx`, add a `saveError` state: `const [saveError, setSaveError] = useState<string | null>(null)`
    - Replace `Promise.all(promises)` with `Promise.allSettled(mutations.map((m) => m.promise))`
    - After settling, collect failed service IDs into a `Set<string>`
    - Call `setPriceEdits` to remove only the successfully saved entries, keeping failed entries dirty
    - If all succeeded: call `setSaved(true)` and `setTimeout(() => setSaved(false), 3000)` as before
    - If any failed: call `setSaveError(\`Failed to save ${failedIds.size} service(s). Check the highlighted rows.\`)` instead of setting `saved`
    - Render the `saveError` message in the UI near the save button (e.g., a red alert banner)
    - _Bug_Condition: handleSaveAll clears dirty state and shows success even when mutateAsync rejects_
    - _Expected_Behavior: failed services remain dirty; error message is displayed; only successful saves are cleared_
    - _Preservation: when all mutations succeed, dirty state is cleared and success banner is shown as before_
    - _Requirements: 2.2, 3.1_

  - [ ] 3.5 Guard `debitWallet` call for zero-price services in `request.service.ts`
    - In `apps/backend/src/services/request.service.ts`, change the balance check from `if (wallet.balance.lessThan(price))` to `if (price > 0 && wallet.balance.lessThan(price))`
    - Inside `prisma.$transaction`, wrap the `debitWallet` call in `if (price > 0) { ... }` so it is skipped entirely when `price === 0`
    - The `tx.serviceRequest.create` call remains unconditional — a `ServiceRequest` is always created
    - _Bug_Condition: debitWallet is called with amount = 0 for zero-price services_
    - _Expected_Behavior: zero-price service requests create a PENDING ServiceRequest without any wallet transaction_
    - _Preservation: price > 0 service requests continue to debit the wallet atomically and create a PENDING ServiceRequest_
    - _Requirements: 2.3, 3.3, 3.5_

  - [ ] 3.6 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Zero Price Accepted End-to-End
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - The tests from task 1 encode the expected behavior; passing now confirms the bugs are fixed
    - Run all four bug condition tests from step 1 against the fixed code
    - **EXPECTED OUTCOME**: All tests PASS (confirms all four root causes are resolved)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - Positive Price Updates and Non-Zero Request Submissions Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run all preservation property tests from step 2 against the fixed code
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions introduced by the fix)
    - Confirm all tests still pass after fix
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 4. Checkpoint — Ensure all tests pass
  - Run the full backend test suite (`jest` in `apps/backend`) and confirm no failures
  - Run the full frontend test suite (if applicable) and confirm no failures
  - Manually verify end-to-end: admin sets a service price to `0` → frontend shows success → database shows `price: 0.00` → user submits request → `ServiceRequest` created with no wallet debit
  - Manually verify preservation: admin sets a service price to `500` → frontend shows success → user submits request → wallet debited `₦500`
  - Ensure all tests pass; ask the user if questions arise
