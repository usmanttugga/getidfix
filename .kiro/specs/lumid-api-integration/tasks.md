# Implementation Plan: LumiID API Integration

## Overview

Replace the VerifyMe integration with LumiID for NIN verification, introduce a new live BVN verification backend route, and upgrade the BVN verification frontend page to call the live API and display results immediately.

## Tasks

- [x] 1. Update environment configuration
  - Add `LUMIID_API_KEY: z.string().min(1, 'LUMIID_API_KEY is required')` to the Zod schema in `apps/backend/src/config/env.ts`
  - Remove `VERIFYME_API_KEY` from the schema
  - Update `.env.example` to replace `VERIFYME_API_KEY` with `LUMIID_API_KEY`
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2. Create the shared LumiID service module
  - [x] 2.1 Implement `apps/backend/src/services/lumiid.service.ts`
    - Export `verifyNin(idNumber: string)` — POST to `https://api.lumiid.com/api/v1/ng/nin-basic/` with `{ id_number: idNumber }` and `Authorization: Bearer <LUMIID_API_KEY>` header
    - Export `verifyBvn(idNumber: string)` — POST to `https://api.lumiid.com/v1/ng/bvn-basic/` with the same auth header
    - Return `response.data.data` when `success: true`
    - Throw `AppError.externalApiError(response.data.message)` when `success: false`
    - Catch network/timeout errors and throw `AppError.externalApiError('LumiID API is unreachable. Please try again.')`
    - Read API key via `getEnv().LUMIID_API_KEY`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ]* 2.2 Write property test for success response passthrough (Property 1)
    - **Property 1: Success response passthrough**
    - Generate random `data` objects; mock axios to return `{ success: true, data }`. Assert returned value deep-equals `data` for both `verifyNin` and `verifyBvn`
    - File: `apps/backend/src/__tests__/unit/lumiid.service.pbt.test.ts`
    - **Validates: Requirements 1.3**

  - [ ]* 2.3 Write property test for error message propagation (Property 2)
    - **Property 2: Error message propagation**
    - Generate random error message strings; mock axios to return `{ success: false, message }`. Assert thrown `AppError` has `statusCode === 502`, `code === EXTERNAL_API_ERROR`, and message matches
    - File: `apps/backend/src/__tests__/unit/lumiid.service.pbt.test.ts`
    - **Validates: Requirements 1.4**

- [x] 3. Refactor NIN router to use LumiID
  - [x] 3.1 Update `apps/backend/src/routes/nin.router.ts`
    - Remove `VERIFYME_BASE`, `verifyMeHeaders()`, and `callNimcApi()` functions
    - Remove the `axios` import (no longer needed directly)
    - Import `verifyNin` from `../services/lumiid.service`
    - Replace the `callNimcApi` call with `await verifyNin(body.nin)`
    - Map LumiID response to `Internal_Result`: `firstname → firstName`, `lastname → lastName`, `birthdate → dob`, `photo → photo`, `middleName: ''`, `gender: ''`, `phone: ''`, `nin: body.nin || ''`
    - Preserve all existing Zod validation, service lookup, wallet guard, transaction, and notification logic unchanged
    - _Requirements: 2.4, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 3.2 Write property test for NIN response mapping completeness (Property 3)
    - **Property 3: NIN response mapping completeness**
    - Generate random partial LumiID NIN data objects using `fc.record` with optional fields. Apply the mapping. Assert no `undefined` values, string fields default to `""`, `photo` defaults to `null`
    - File: `apps/backend/src/__tests__/unit/nin.router.pbt.test.ts`
    - **Validates: Requirements 3.2, 6.1, 6.2**

  - [ ]* 3.3 Write property test for wallet never debited on NIN API failure (Property 5)
    - **Property 5: Wallet never debited on API failure (NIN)**
    - Mock `verifyNin` to throw an `AppError`. Assert `debitWallet` is never called
    - File: `apps/backend/src/__tests__/unit/nin.router.pbt.test.ts`
    - **Validates: Requirements 3.4**

  - [ ]* 3.4 Write property test for invalid NIN inputs always rejected (Property 6)
    - **Property 6: Invalid NIN inputs are always rejected**
    - Use `invalidNinArbitrary` from `pbt.helpers.ts`. POST to `/nin/verify`. Assert 422 response with `VALIDATION_ERROR` and `verifyNin` not called
    - File: `apps/backend/src/__tests__/unit/nin.router.pbt.test.ts`
    - **Validates: Requirements 3.5**

- [x] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Create the BVN router
  - [x] 5.1 Implement `apps/backend/src/routes/bvn.router.ts`
    - Protect with `authenticate` middleware
    - Zod validation: `bvn` must match `/^\d{11}$/`; return 422 with `VALIDATION_ERROR` on failure
    - Look up service by slug `bvn-verification`; throw `SERVICE_NOT_FOUND` if absent
    - Return 400 with `SERVICE_DISABLED` if service is disabled
    - Check wallet balance against service price; return 400 with `INSUFFICIENT_BALANCE` if insufficient
    - Call `verifyBvn(body.bvn)` from `lumiid.service`
    - Map response to `Internal_Result`: `firstname → firstName`, `lastname → lastName`, `birthdate → dob`, `phone → phone`, `fullName: firstName + ' ' + lastName`, `middleName: ''`, `gender: ''`, `photo: null`, `bvn: body.bvn`
    - Prisma `$transaction`: `debitWallet` + `createServiceRequest` (status `COMPLETED`) + `createNotification`
    - Return `{ result, reference, amount }`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10_

  - [ ]* 5.2 Write property test for BVN response mapping completeness (Property 4)
    - **Property 4: BVN response mapping completeness**
    - Generate random partial LumiID BVN data objects. Apply the mapping. Assert no `undefined` values, `photo === null`, string fields default to `""`
    - File: `apps/backend/src/__tests__/unit/bvn.router.pbt.test.ts`
    - **Validates: Requirements 4.8, 6.1, 6.2**

  - [ ]* 5.3 Write property test for wallet never debited on BVN API failure (Property 5)
    - **Property 5: Wallet never debited on API failure (BVN)**
    - Mock `verifyBvn` to throw an `AppError`. Assert `debitWallet` is never called
    - File: `apps/backend/src/__tests__/unit/bvn.router.pbt.test.ts`
    - **Validates: Requirements 4.10**

  - [ ]* 5.4 Write property test for invalid BVN inputs always rejected (Property 7)
    - **Property 7: Invalid BVN inputs are always rejected**
    - Use `invalidBvnArbitrary` from `pbt.helpers.ts`. POST to `/bvn/verify`. Assert 422 response with `VALIDATION_ERROR` and `verifyBvn` not called
    - File: `apps/backend/src/__tests__/unit/bvn.router.pbt.test.ts`
    - **Validates: Requirements 4.2, 4.3**

  - [ ]* 5.5 Write property test for insufficient balance guard (Property 8)
    - **Property 8: Insufficient balance guard**
    - Generate `(balance, price)` pairs where `balance < price`. Assert `INSUFFICIENT_BALANCE` error returned and `verifyBvn` not called
    - File: `apps/backend/src/__tests__/unit/bvn.router.pbt.test.ts`
    - **Validates: Requirements 4.6**

- [x] 6. Register BVN router in the Express app
  - In `apps/backend/src/index.ts`, import `bvnRouter` from `./routes/bvn.router` and mount it at `/api/v1/bvn`
  - _Requirements: 4.1_

- [x] 7. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Upgrade the BVN verification frontend page
  - [x] 8.1 Create `apps/frontend/app/dashboard/bvn/verification/BvnVerificationForm.tsx`
    - Client component (`'use client'`) with a controlled input for the 11-digit BVN
    - Client-side validation: reject inputs not matching `/^\d{11}$/` and display an error message without making an API call
    - On valid submit: call `POST /api/v1/bvn/verify` via `fetch`, show loading spinner and disable submit button during the request
    - On success: render a result card displaying `firstName`, `lastName`, and `dob`
    - On error: display the error message from the API response
    - On `INSUFFICIENT_BALANCE` error: display a specific message with a link to `/dashboard/wallet`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 8.2 Update `apps/frontend/app/dashboard/bvn/verification/page.tsx`
    - Replace the `ServiceRequestForm` usage with the new `BvnVerificationForm` component
    - _Requirements: 5.1_

  - [ ]* 8.3 Write property test for frontend validation rejects invalid BVN (Property 9)
    - **Property 9: Frontend validation rejects invalid BVN before API call**
    - Use `invalidBvnArbitrary`. Simulate form submission. Assert validation error shown and `fetch` not called
    - File: `apps/frontend/app/dashboard/bvn/verification/BvnVerificationForm.pbt.test.tsx`
    - **Validates: Requirements 5.2**

  - [ ]* 8.4 Write property test for frontend displays all identity fields (Property 10)
    - **Property 10: Frontend displays all identity fields from API response**
    - Generate random `{ firstName, lastName, dob }` objects. Mock `fetch` to return them. Assert all three values appear in the rendered output
    - File: `apps/frontend/app/dashboard/bvn/verification/BvnVerificationForm.pbt.test.tsx`
    - **Validates: Requirements 5.4**

  - [ ]* 8.5 Write property test for frontend displays API error messages (Property 11)
    - **Property 11: Frontend displays API error messages**
    - Generate random error message strings. Mock `fetch` to return error responses. Assert the message string appears in the rendered output
    - File: `apps/frontend/app/dashboard/bvn/verification/BvnVerificationForm.pbt.test.tsx`
    - **Validates: Requirements 5.5**

- [x] 9. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` (already installed in the project)
- The `Internal_Result` shape is preserved exactly — no changes needed to admin views, `ServiceRequest` storage, or notification logic
- The `.env` and `.env.example` files must both be updated with `LUMIID_API_KEY`
