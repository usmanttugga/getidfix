# Price Zero & Availability Bug — Bugfix Design

## Overview

This document formalizes the fix for a multi-root-cause bug where setting a service price to `0`
silently fails end-to-end. The backend rejects zero prices with a Zod validation error
(`z.number().min(0.01)`), the frontend `handleSaveAll` swallows that error and shows a false
success state, and a latent Redis cache-invalidation gap means any future caching layer would
serve stale data after price or availability changes. A fourth concern — whether
`request.service.ts` blocks zero-price service requests at submission time — is also addressed.

The fix is intentionally minimal: change the validation floor, surface errors in the UI, add
cache invalidation to both admin PATCH endpoints, and guard the wallet debit path against
zero-amount debits.

---

## Glossary

- **Bug_Condition (C)**: The condition that triggers the primary bug — an admin submits a price
  update where `price === 0`.
- **Property (P)**: The desired outcome when the bug condition holds — the backend accepts the
  value, persists `0.00`, and the frontend reflects success.
- **Preservation**: All existing behaviors for `price > 0` updates, availability toggles, and
  service request submissions that must remain unchanged by this fix.
- **`updateServiceSchema`**: The Zod schema in `apps/backend/src/routes/admin.router.ts` that
  validates the body of `PATCH /admin/services/:id`. Currently uses `z.number().min(0.01)`.
- **`handleSaveAll`**: The async function in `apps/frontend/app/admin/pricing/page.tsx` that
  fans out price-update mutations. Currently uses `Promise.all` without per-mutation error
  handling.
- **`submitRequest`**: The function in `apps/backend/src/services/request.service.ts` that
  debits the user's wallet and creates a `ServiceRequest`. Contains a balance check
  (`wallet.balance.lessThan(price)`) that is safe for zero prices (0 is never less than 0),
  but the `debitWallet` call with `amount = 0` must be guarded to avoid creating a spurious
  zero-amount transaction.
- **`SERVICES_CACHE`**: The Redis key `cache:services` defined in
  `apps/backend/src/config/redisKeys.ts`. Currently defined but never written to or
  invalidated anywhere in the codebase.

---

## Bug Details

### Bug Condition

The primary bug manifests when an admin enters `0` as a service price and clicks **Save All
Pricing**. The `updateServiceSchema` Zod validator rejects the value before the database is
touched, the backend returns a `400` error, and `handleSaveAll` discards that error — clearing
the dirty state and briefly showing "All prices saved".

**Formal Specification:**

```
FUNCTION isBugCondition(X)
  INPUT:  X of type ServicePriceUpdate { serviceId: string, price: number }
  OUTPUT: boolean

  RETURN X.price = 0
END FUNCTION
```

### Examples

- Admin sets NIN Basic Verification price to `0` → backend returns `400 "Price must be greater
  than 0"` → frontend shows "✓ All prices saved" → database still holds the old price.
- Admin sets BVN Retrieval price to `0` → same silent failure; user is still charged the old
  price on next submission.
- Admin sets a price to `500` (positive) → succeeds today and must continue to succeed after
  the fix (preservation).
- Admin toggles `isEnabled` on a service → must continue to work and must not touch the price
  (preservation).

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- `PATCH /admin/services/:id` with `price > 0` MUST continue to accept the update, persist it,
  and return the updated service record.
- `PATCH /admin/services/:id/availability` MUST continue to update only `isEnabled` and MUST
  NOT modify the service price.
- `submitRequest` for a service with `price > 0` and sufficient balance MUST continue to debit
  the wallet atomically and create a `PENDING` `ServiceRequest`.
- `submitRequest` for a disabled service MUST continue to reject with `SERVICE_DISABLED`
  regardless of price.
- `submitRequest` for a service with `price > 0` and insufficient balance MUST continue to
  reject with `INSUFFICIENT_BALANCE`.
- The frontend dirty-state indicator (blue dot, "Save All Pricing (N changes)" button) MUST
  continue to work correctly for positive-price edits.

**Scope:**

All inputs where `price > 0`, all availability toggles, and all service request submissions
that do not involve a zero-price service are completely unaffected by this fix.

---

## Hypothesized Root Cause

### Root Cause 1 — Backend Validation Floor (Confirmed)

`updateServiceSchema` in `admin.router.ts` uses `z.number().min(0.01)`. This is the direct
cause of the `400` rejection. The fix is to change the minimum to `z.number().min(0)`.

**File:** `apps/backend/src/routes/admin.router.ts`
**Line:** `const updateServiceSchema = z.object({ price: z.number().min(0.01, ...) })`

### Root Cause 2 — Frontend Error Swallowing (Confirmed)

`handleSaveAll` in `pricing/page.tsx` calls `Promise.all(promises)` without a try/catch and
without inspecting per-mutation results. When any `mutateAsync` rejects, `Promise.all` rejects
the whole batch, but the rejection is unhandled — the `await` result is discarded and execution
falls through to `setPriceEdits({})` and `setSaved(true)`, giving a false success signal.

**File:** `apps/frontend/app/admin/pricing/page.tsx`
**Function:** `handleSaveAll`

### Root Cause 3 — Latent Cache Invalidation Gap (Confirmed)

`REDIS_KEYS.SERVICES_CACHE` is defined with a 5-minute TTL comment but is never written to or
deleted anywhere. Both `PATCH /admin/services/:id` and `PATCH /admin/services/:id/availability`
update the database without touching Redis. If the cache is ever wired in, stale data will be
served for up to 5 minutes after an admin change.

**File:** `apps/backend/src/routes/admin.router.ts` (both PATCH handlers)
**File:** `apps/backend/src/config/redisKeys.ts` (key definition, no change needed)

### Root Cause 4 — Zero-Price Wallet Debit (Latent, Needs Guard)

`submitRequest` in `request.service.ts` checks `wallet.balance.lessThan(price)`. For
`price = 0`, `0 < 0` is false, so the balance check passes correctly. However, `debitWallet`
is then called with `amount = 0`, which may create a spurious `₦0` wallet transaction. The fix
is to skip the debit call entirely when `price === 0`.

**File:** `apps/backend/src/services/request.service.ts`
**Function:** `submitRequest`

---

## Correctness Properties

Property 1: Bug Condition — Zero Price Accepted End-to-End

_For any_ `ServicePriceUpdate` input where `isBugCondition` returns true (i.e., `price === 0`),
the fixed `PATCH /admin/services/:id` endpoint SHALL return HTTP 200 with the updated service
record showing `price: 0`, and the frontend SHALL display a success state only after receiving
that 200 response.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation — Positive Price Updates Unchanged

_For any_ `ServicePriceUpdate` input where `isBugCondition` returns false (i.e., `price > 0`),
the fixed endpoint SHALL produce exactly the same HTTP response and database outcome as the
original endpoint, preserving all existing positive-price update behavior.

**Validates: Requirements 3.1**

Property 3: Preservation — Zero-Price Service Request Submission

_For any_ service request submission where the service's price is `0` and the service is
enabled, the fixed `submitRequest` function SHALL create a `PENDING` `ServiceRequest` without
debiting the wallet and without creating a zero-amount wallet transaction.

**Validates: Requirements 2.3**

Property 4: Preservation — Non-Zero Service Request Submission Unchanged

_For any_ service request submission where the service's price is `> 0`, the fixed
`submitRequest` function SHALL produce exactly the same behavior as the original — debiting the
wallet atomically and creating a `PENDING` `ServiceRequest`.

**Validates: Requirements 3.3, 3.5**

---

## Fix Implementation

### Changes Required

#### File 1: `apps/backend/src/routes/admin.router.ts`

**Change 1 — Relax price validation floor**

```diff
- price: z.number().min(0.01, 'Price must be greater than 0'),
+ price: z.number().min(0, 'Price must be 0 or greater'),
```

**Change 2 — Invalidate services cache after price update**

After `prisma.service.update` in `PATCH /admin/services/:id`, add:

```typescript
import { getRedisClient } from '../config/redis';
import { REDIS_KEYS } from '../config/redisKeys';

// inside the route handler, after the DB update:
try {
  await getRedisClient().del(REDIS_KEYS.SERVICES_CACHE());
} catch {
  // cache invalidation is best-effort; do not fail the request
}
```

**Change 3 — Invalidate services cache after availability update**

Same pattern added to `PATCH /admin/services/:id/availability` after `prisma.service.update`.

---

#### File 2: `apps/frontend/app/admin/pricing/page.tsx`

**Change 4 — Surface per-mutation errors in `handleSaveAll`**

Replace the current fire-and-forget `Promise.all` with `Promise.allSettled`, collect failures,
keep dirty state for failed services, and display an error message:

```typescript
const handleSaveAll = async () => {
  const entries = Object.entries(priceEdits);
  if (entries.length === 0) return;

  const mutations = entries
    .map(([id, raw]) => {
      const newPrice = parseFloat(raw);
      if (!isNaN(newPrice) && newPrice >= 0) {
        return { id, promise: updateService.mutateAsync({ id, price: newPrice }) };
      }
      return null;
    })
    .filter(Boolean) as { id: string; promise: Promise<unknown> }[];

  const results = await Promise.allSettled(mutations.map((m) => m.promise));

  const failedIds = new Set<string>();
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      failedIds.add(mutations[i].id);
    }
  });

  // Clear only the successfully saved entries
  setPriceEdits((prev) => {
    const next = { ...prev };
    mutations.forEach((m, i) => {
      if (results[i].status === 'fulfilled') delete next[m.id];
    });
    return next;
  });

  if (failedIds.size === 0) {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  } else {
    // Surface error — caller can display via a new `saveError` state
    setSaveError(`Failed to save ${failedIds.size} service(s). Check the highlighted rows.`);
  }
};
```

Add a `saveError` state (`useState<string | null>(null)`) and render it in the UI near the
save button.

---

#### File 3: `apps/backend/src/services/request.service.ts`

**Change 5 — Skip wallet debit for zero-price services**

```diff
  const price = Number(service.price);
- if (wallet.balance.lessThan(price)) {
+ if (price > 0 && wallet.balance.lessThan(price)) {
    throw new AppError('Insufficient wallet balance.', 400, ERROR_CODES.INSUFFICIENT_BALANCE);
  }

  const reference = uuidv4();

  const serviceRequest = await prisma.$transaction(async (tx) => {
-   await debitWallet(
-     tx as unknown as Parameters<typeof debitWallet>[0],
-     userId,
-     price,
-     `Payment for ${service.name}`,
-     `debit-${reference}`
-   );
+   if (price > 0) {
+     await debitWallet(
+       tx as unknown as Parameters<typeof debitWallet>[0],
+       userId,
+       price,
+       `Payment for ${service.name}`,
+       `debit-${reference}`
+     );
+   }

    return tx.serviceRequest.create({ ... });
  });
```

---

## Testing Strategy

### Validation Approach

Testing follows a two-phase approach: first run exploratory tests against the **unfixed** code
to confirm the bug manifests as expected and to validate the root cause analysis; then run fix
and preservation tests against the **fixed** code.

---

### Exploratory Bug Condition Checking

**Goal:** Surface counterexamples that demonstrate the bug on unfixed code. Confirm or refute
each root cause hypothesis.

**Test Plan:** Send `PATCH /admin/services/:id` with `{ price: 0 }` to the unfixed backend and
assert the response is `400`. Observe the Zod error message. Simulate `handleSaveAll` with a
zero-price mutation and assert that the dirty state is incorrectly cleared.

**Test Cases:**

1. **Backend Rejects Zero Price**: `PATCH /admin/services/:id` with `{ price: 0 }` → expect
   `400` with Zod validation error on unfixed code (confirms Root Cause 1).
2. **Frontend Clears Dirty State on Error**: Simulate `handleSaveAll` where `mutateAsync`
   rejects → assert `priceEdits` is cleared and `saved` is set to `true` on unfixed code
   (confirms Root Cause 2).
3. **Cache Not Invalidated**: After a successful price update, assert that
   `cache:services` key is NOT deleted from Redis on unfixed code (confirms Root Cause 3).
4. **Zero-Price Debit Called**: Submit a request for a zero-price service and assert that
   `debitWallet` is called with `amount = 0` on unfixed code (confirms Root Cause 4).

**Expected Counterexamples:**

- Backend returns `{ error: "Price must be greater than 0" }` for `price: 0`.
- Frontend `priceEdits` is `{}` and `saved` is `true` even though the mutation rejected.
- Redis `cache:services` key persists after a price update.
- A `WalletTransaction` record with `amount = 0` is created for a zero-price service request.

---

### Fix Checking

**Goal:** Verify that for all inputs where the bug condition holds, the fixed code produces the
expected behavior.

**Pseudocode:**

```
FOR ALL X WHERE isBugCondition(X) DO
  result := PATCH /admin/services/:id { price: 0 }
  ASSERT result.status = 200
    AND result.data.price = 0
    AND cache:services key is deleted from Redis
END FOR
```

**Test Cases:**

1. `PATCH /admin/services/:id` with `{ price: 0 }` → expect `200` and `data.price === 0`.
2. After the above, assert `getRedisClient().exists('cache:services')` returns `0`.
3. Submit a service request for a zero-price service → expect `201`, no wallet debit, no
   zero-amount `WalletTransaction`.
4. Frontend `handleSaveAll` with a zero-price mutation that now succeeds → assert `priceEdits`
   is cleared and `saved` is `true`.

---

### Preservation Checking

**Goal:** Verify that for all inputs where the bug condition does NOT hold, the fixed code
produces the same result as the original.

**Pseudocode:**

```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT original_handler(X) = fixed_handler(X)
END FOR
```

**Testing Approach:** Property-based testing is recommended for preservation checking because
it generates many random `price > 0` values and service IDs, catching edge cases that manual
tests miss.

**Test Cases:**

1. **Positive Price Update Preserved**: `PATCH /admin/services/:id` with random `price > 0`
   values → expect same `200` response and DB outcome as before the fix.
2. **Availability Toggle Preserved**: `PATCH /admin/services/:id/availability` with
   `{ isEnabled: true/false }` → expect same behavior; price field unchanged.
3. **Positive-Price Request Submission Preserved**: `submitRequest` for a service with
   `price > 0` and sufficient balance → wallet debited, `ServiceRequest` created as before.
4. **Insufficient Balance Still Rejected**: `submitRequest` for `price > 0` with insufficient
   balance → still returns `INSUFFICIENT_BALANCE`.
5. **Disabled Service Still Rejected**: `submitRequest` for a disabled service with `price = 0`
   → still returns `SERVICE_DISABLED`.
6. **Frontend Error Display Preserved**: `handleSaveAll` with a positive-price mutation that
   succeeds → dirty state cleared, success banner shown as before.

---

### Unit Tests

- Test `updateServiceSchema` accepts `0`, `0.01`, `500`, and rejects `-1`, `NaN`, `null`.
- Test `submitRequest` with `price = 0`: no `debitWallet` call, `ServiceRequest` created.
- Test `submitRequest` with `price > 0` and sufficient balance: `debitWallet` called once.
- Test `submitRequest` with `price > 0` and insufficient balance: throws `INSUFFICIENT_BALANCE`.
- Test `handleSaveAll` with all mutations succeeding: dirty state cleared, success shown.
- Test `handleSaveAll` with one mutation failing: failed service stays dirty, error message shown.

### Property-Based Tests

- Generate random `price >= 0` values and assert `PATCH /admin/services/:id` returns `200`
  (fix checking — Property 1 and 2).
- Generate random `price > 0` values and assert the fixed handler produces the same DB outcome
  as the original handler (preservation — Property 2).
- Generate random service request inputs with `price = 0` and assert no wallet transaction is
  created (Property 3).
- Generate random service request inputs with `price > 0` and sufficient balance and assert
  wallet is debited exactly once (Property 4).

### Integration Tests

- Full flow: admin sets price to `0` → user submits request → request created with `amount = 0`,
  wallet balance unchanged.
- Full flow: admin sets price to `0` → admin sets price back to `500` → user submits request →
  wallet debited `₦500`.
- Cache invalidation: price updated → `cache:services` key absent → next read hits DB.
- Availability toggle: `isEnabled` toggled → `cache:services` key absent → next read hits DB.
- Frontend error display: backend returns `400` for any reason → error message visible, dirty
  indicator still shown for the affected service.
