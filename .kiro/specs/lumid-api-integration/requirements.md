# Requirements Document

## Introduction

This feature replaces the existing VerifyMe API integration with the LumiID API for NIN verification, and introduces a new live BVN verification flow that currently relies on manual admin handling. A shared `lumiid.service.ts` will encapsulate all LumiID HTTP calls, and the environment configuration will be updated to use `LUMIID_API_KEY` in place of `VERIFYME_API_KEY`. LumiID response fields will be mapped to the existing internal result shape so that downstream consumers (wallet debiting, service request records, notifications, frontend display) require no structural changes.

---

## Glossary

- **LumiID_Service**: The shared backend service module (`lumiid.service.ts`) responsible for all HTTP communication with the LumiID API.
- **NIN_Router**: The Express router (`nin.router.ts`) that handles NIN verification requests from authenticated users.
- **BVN_Router**: The new Express router (`bvn.router.ts`) that handles live BVN verification requests from authenticated users.
- **BVN_Verification_Page**: The Next.js page at `/dashboard/bvn/verification` that presents the BVN verification form to users.
- **Internal_Result**: The normalised verification result object stored in `ServiceRequest.adminResponse` and returned to the frontend, containing fields: `fullName`, `firstName`, `lastName`, `middleName`, `dob`, `gender`, `phone`, `photo`, `nin` (NIN only), `bvn` (BVN only).
- **Env_Config**: The Zod-validated environment configuration module (`env.ts`).
- **ServiceRequest**: The Prisma model that records a completed or pending verification transaction.
- **Wallet**: The Prisma model representing a user's balance.
- **LumiID_NIN_Endpoint**: `POST https://api.lumiid.com/api/v1/ng/nin-basic/`
- **LumiID_BVN_Endpoint**: `POST https://api.lumiid.com/v1/ng/bvn-basic/`

---

## Requirements

### Requirement 1: Shared LumiID Service Module

**User Story:** As a backend developer, I want a single shared service module for all LumiID API calls, so that authentication headers, base URLs, and error handling are defined in one place and reused by both NIN and BVN routers.

#### Acceptance Criteria

1. THE LumiID_Service SHALL export a `verifyNin(idNumber: string)` function that sends a POST request to the LumiID_NIN_Endpoint with body `{ "id_number": idNumber }` and an `Authorization: Bearer <LUMIID_API_KEY>` header.
2. THE LumiID_Service SHALL export a `verifyBvn(idNumber: string)` function that sends a POST request to the LumiID_BVN_Endpoint with body `{ "id_number": idNumber }` and an `Authorization: Bearer <LUMIID_API_KEY>` header.
3. WHEN the LumiID API returns a response where `success` is `true`, THE LumiID_Service SHALL return the `data` payload to the caller.
4. WHEN the LumiID API returns a response where `success` is `false`, THE LumiID_Service SHALL throw an `AppError` with HTTP status 502, error code `EXTERNAL_API_ERROR`, and the `message` field from the LumiID error response.
5. WHEN the LumiID API call times out or the network is unreachable, THE LumiID_Service SHALL throw an `AppError` with HTTP status 502 and error code `EXTERNAL_API_ERROR`.
6. THE LumiID_Service SHALL read the API key exclusively from the `LUMIID_API_KEY` environment variable via `Env_Config`.

---

### Requirement 2: Environment Configuration Update

**User Story:** As a backend developer, I want the environment configuration to declare `LUMIID_API_KEY` and remove `VERIFYME_API_KEY`, so that the application fails fast at startup if the new key is missing and no stale references to the old key remain.

#### Acceptance Criteria

1. THE Env_Config SHALL declare `LUMIID_API_KEY` as a required string with a minimum length of 1.
2. WHEN the application starts and `LUMIID_API_KEY` is absent from the environment, THE Env_Config SHALL throw a validation error that prevents the application from starting.
3. THE Env_Config SHALL contain no reference to `VERIFYME_API_KEY`.
4. THE NIN_Router SHALL contain no reference to `VERIFYME_API_KEY` or the VerifyMe base URL.

---

### Requirement 3: NIN Verification — Replace VerifyMe with LumiID

**User Story:** As a user, I want my NIN verification to be processed through the LumiID API, so that I receive accurate identity data without any change to the verification flow I already use.

#### Acceptance Criteria

1. WHEN a POST request is made to `/nin/verify` with a valid NIN, THE NIN_Router SHALL call `LumiID_Service.verifyNin` with the provided NIN number.
2. WHEN `LumiID_Service.verifyNin` returns successfully, THE NIN_Router SHALL map the LumiID response fields to the Internal_Result shape as follows: `firstname` → `firstName`, `lastname` → `lastName`, `birthdate` → `dob`, `photo` → `photo`, and SHALL set `middleName` to an empty string if absent, `gender` to an empty string if absent, `phone` to an empty string if absent, and `nin` to the submitted NIN number.
3. WHEN `LumiID_Service.verifyNin` returns successfully, THE NIN_Router SHALL debit the user's Wallet, create a completed ServiceRequest record, send a notification, and return the Internal_Result to the caller — identical to the existing post-verification flow.
4. WHEN `LumiID_Service.verifyNin` throws an `AppError`, THE NIN_Router SHALL propagate the error to the Express error handler without debiting the Wallet.
5. THE NIN_Router SHALL preserve all existing request validation (11-digit numeric NIN, method enum, slipType enum) unchanged.

---

### Requirement 4: BVN Verification — New Live API Flow

**User Story:** As a user, I want to verify my BVN instantly through a live API, so that I receive my BVN identity data immediately instead of waiting for manual admin processing.

#### Acceptance Criteria

1. THE BVN_Router SHALL expose a `POST /bvn/verify` endpoint protected by the `authenticate` middleware.
2. WHEN a POST request is made to `/bvn/verify`, THE BVN_Router SHALL validate that the request body contains an `bvn` field matching exactly 11 numeric digits.
3. WHEN the request body is invalid, THE BVN_Router SHALL return a 422 response with error code `VALIDATION_ERROR` before calling the LumiID API or debiting the Wallet.
4. WHEN a valid POST request is made to `/bvn/verify`, THE BVN_Router SHALL look up the service record with slug `bvn-verification` and throw a `SERVICE_NOT_FOUND` error if it does not exist.
5. WHEN the `bvn-verification` service is disabled, THE BVN_Router SHALL return a 400 response with error code `SERVICE_DISABLED` without calling the LumiID API or debiting the Wallet.
6. WHEN the user's Wallet balance is less than the service price, THE BVN_Router SHALL return a 400 response with error code `INSUFFICIENT_BALANCE` without calling the LumiID API.
7. WHEN all pre-checks pass, THE BVN_Router SHALL call `LumiID_Service.verifyBvn` with the submitted BVN number.
8. WHEN `LumiID_Service.verifyBvn` returns successfully, THE BVN_Router SHALL map the LumiID response fields to the Internal_Result shape as follows: `firstname` → `firstName`, `lastname` → `lastName`, `birthdate` → `dob`, `phone` → `phone`, and SHALL set `fullName` to the concatenation of `firstName` and `lastName`, `middleName` to an empty string, `gender` to an empty string, `photo` to `null`, and `bvn` to the submitted BVN number.
9. WHEN `LumiID_Service.verifyBvn` returns successfully, THE BVN_Router SHALL debit the user's Wallet, create a completed ServiceRequest record with status `COMPLETED`, send a notification, and return the Internal_Result with the transaction reference and amount.
10. WHEN `LumiID_Service.verifyBvn` throws an `AppError`, THE BVN_Router SHALL propagate the error to the Express error handler without debiting the Wallet.

---

### Requirement 5: BVN Verification Page — Live API Integration

**User Story:** As a user, I want the BVN verification page to call the live backend API and display my verified BVN data, so that I get an immediate result instead of submitting a manual service request.

#### Acceptance Criteria

1. THE BVN_Verification_Page SHALL replace the `ServiceRequestForm` component with a dedicated form that submits to the `POST /bvn/verify` backend endpoint.
2. WHEN the user submits a BVN that does not match 11 numeric digits, THE BVN_Verification_Page SHALL display a validation error message before making any API call.
3. WHEN the API call is in progress, THE BVN_Verification_Page SHALL display a loading indicator and disable the submit button.
4. WHEN the API returns a successful response, THE BVN_Verification_Page SHALL display the verified identity data including first name, last name, and date of birth.
5. WHEN the API returns an error response, THE BVN_Verification_Page SHALL display the error message returned by the API.
6. WHEN the API returns an `INSUFFICIENT_BALANCE` error, THE BVN_Verification_Page SHALL display a message indicating the user has insufficient balance and provide a link to the wallet top-up page.

---

### Requirement 6: Backward Compatibility of Internal Result Shape

**User Story:** As a backend developer, I want the Internal_Result shape produced by LumiID to be identical to the shape previously produced by VerifyMe, so that no changes are required to ServiceRequest storage, admin views, or any other downstream consumer.

#### Acceptance Criteria

1. THE LumiID_Service SHALL produce an Internal_Result object that contains all of the following fields: `fullName` (string), `firstName` (string), `lastName` (string), `middleName` (string), `dob` (string), `gender` (string), `phone` (string), `photo` (string or null).
2. WHEN a LumiID response field is absent or null, THE LumiID_Service SHALL substitute an empty string for string fields and `null` for the `photo` field, so that the Internal_Result never contains `undefined` values.
3. THE NIN_Router SHALL store the Internal_Result in `ServiceRequest.adminResponse.result` using the same structure as the previous VerifyMe integration.
