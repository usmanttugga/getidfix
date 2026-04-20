# Bugfix Requirements Document

## Introduction

When an admin sets a service price to `0` (zero) via the Service Pricing page, the operation silently fails. The backend rejects the value with a validation error (`price must be greater than 0`), but the frontend swallows the error and shows a success state. As a result, the service retains its old price and continues to behave as if the price was never changed — users are still charged the previous amount when submitting requests for that service.

The intended use case for a zero price is to make a service free (no wallet debit required). This is a legitimate admin action that the platform must support.

A secondary concern is that a `SERVICES_CACHE` Redis key is defined in `redisKeys.ts` but is never written to or invalidated anywhere in the codebase. If caching is ever wired in, stale cached service data would prevent price or availability changes from taking effect immediately. This document covers both the primary pricing bug and the latent cache-invalidation gap.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN an admin enters `0` as the price for a service and saves, THEN the backend rejects the request with a `400` validation error (`Price must be greater than 0`) and the price is not updated in the database.

1.2 WHEN the backend returns a validation error for a price update, THEN the frontend `handleSaveAll` function does not surface the error to the admin — the UI clears the dirty state and may briefly show a "saved" confirmation, leaving the admin unaware the change was rejected.

1.3 WHEN a service price is set to `0` and the request is rejected, THEN the service continues to charge users the old price on subsequent service request submissions, because the database record was never updated.

1.4 WHEN the `SERVICES_CACHE` Redis key is populated (if caching is wired in), THEN updating a service price or availability via `PATCH /admin/services/:id` or `PATCH /admin/services/:id/availability` does not invalidate the cache, so the stale cached value continues to be served until the TTL expires (5 minutes).

### Expected Behavior (Correct)

2.1 WHEN an admin enters `0` as the price for a service and saves, THEN the backend SHALL accept the value, update the service's price to `0.00` in the database, and return the updated service record.

2.2 WHEN a price update request fails (for any reason), THEN the frontend SHALL display a visible error message to the admin identifying which service failed and why, and SHALL NOT clear the dirty/unsaved state for that service.

2.3 WHEN a service's price is successfully set to `0`, THEN subsequent service request submissions for that service SHALL debit `₦0` from the user's wallet (i.e., the request proceeds without a balance check failure and no debit transaction is created for a zero amount).

2.4 WHEN a service price or availability is updated via the admin API, THEN the system SHALL delete the `cache:services` Redis key (if it exists) so that the next read reflects the updated value immediately.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN an admin sets a service price to a positive value (e.g., `₦500`), THEN the system SHALL CONTINUE TO accept the update, persist it to the database, and charge users that exact amount on subsequent requests.

3.2 WHEN an admin toggles a service's `isEnabled` flag via `PATCH /admin/services/:id/availability`, THEN the system SHALL CONTINUE TO update only the `isEnabled` field and SHALL NOT modify the service price.

3.3 WHEN a user submits a service request for a service with a positive price and sufficient wallet balance, THEN the system SHALL CONTINUE TO debit the wallet atomically and create a `ServiceRequest` record with status `PENDING`.

3.4 WHEN a user submits a service request for a disabled service, THEN the system SHALL CONTINUE TO reject the request with a `SERVICE_DISABLED` error regardless of the service price.

3.5 WHEN a user submits a service request for a service with a positive price and insufficient wallet balance, THEN the system SHALL CONTINUE TO reject the request with an `INSUFFICIENT_BALANCE` error.

---

## Bug Condition

### Bug Condition Function

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type ServicePriceUpdate { serviceId: string, price: number }
  OUTPUT: boolean

  // Returns true when the admin is attempting to set a price of exactly zero
  RETURN X.price = 0
END FUNCTION
```

### Property: Fix Checking

```pascal
// Property: Fix Checking — Zero Price Accepted
FOR ALL X WHERE isBugCondition(X) DO
  result ← updateServicePrice'(X)
  ASSERT result.status = "success"
    AND result.data.price = 0
    AND no_validation_error(result)
END FOR
```

### Property: Preservation Checking

```pascal
// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition(X) DO
  // X.price > 0
  ASSERT updateServicePrice(X) = updateServicePrice'(X)
END FOR
```
