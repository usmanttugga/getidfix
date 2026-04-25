# Implementation Plan: NIN Verification Download Slip

## Overview

Implement the "Download Slip" button on the NIN Verification success screen. The work spans two layers: (1) extend the backend `POST /nin/verify` route to extract and return `slipUrl` from the VerifyMe API response, and (2) add a shared `downloadSlip` utility, a `useDownloadSlip` hook, and a `DownloadSlipButton` component to the frontend, then wire the button into all four verification pages.

## Tasks

- [ ] 1. Extend backend `callNimcApi` to return `slipUrl`
  - In `apps/backend/src/routes/nin.router.ts`, update the return object of `callNimcApi` to include `slipUrl: string | null` extracted from `response.data?.data?.slip_url ?? null`
  - Update the `POST /nin/verify` route response to hoist `slipUrl` into `res.json({ status: 'success', data: { result: nimcResult, reference, amount: price, slipUrl: nimcResult.slipUrl } })`
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ]* 1.1 Write unit test — backend returns `slipUrl: null` when VerifyMe returns no slip URL
  - In `apps/backend/src/__tests__/unit/`, create `nin.verify.test.ts`
  - Mock axios to return a VerifyMe response without `slip_url`; call the route handler; assert `response.data.slipUrl === null`
  - _Requirements: 5.4_

- [ ]* 1.2 Write unit test — backend returns `slipUrl` string for `basic` slip type
  - In the same test file, mock axios to return `slip_url: "https://example.com/slip.pdf"`; assert `response.data.slipUrl` equals that URL
  - _Requirements: 5.2_

- [ ]* 1.3 Write property test — backend response always contains `slipUrl` field
  - In `apps/backend/src/__tests__/unit/nin.verify.pbt.test.ts`
  - **Property 4: Backend response always contains slipUrl field**
  - **Validates: Requirements 5.1, 5.2, 5.3**
  - Use `fc.constantFrom('basic', 'premium', 'regular', 'standard', 'vnin')` to drive slip type; mock VerifyMe with and without `slip_url`; assert `response.data` has a `slipUrl` key that is `string | null`

- [ ] 2. Create `downloadSlip` utility
  - Create `apps/frontend/lib/downloadSlip.ts`
  - Export `buildFilename(slipType: SlipType, reference: string): string` — returns `VNIN-Slip-{reference}.pdf` when `slipType === 'vnin'`, otherwise `NIN-Slip-{reference}.pdf`
  - Export `async function downloadSlip(slipUrl: string, filename: string): Promise<void>` — fetches the URL as a blob, creates an object URL, programmatically clicks a hidden `<a>` element, then revokes the object URL; throws on non-OK HTTP status
  - _Requirements: 2.1, 2.2, 3.1, 3.2_

- [ ]* 2.1 Write property test — NIN slip filename matches reference
  - In `apps/frontend/__tests__/downloadSlip.pbt.test.ts` (create `__tests__` dir if absent)
  - **Property 2: NIN slip filename matches reference**
  - **Validates: Requirements 3.1**
  - `fc.assert(fc.property(fc.string({ minLength: 1 }), fc.constantFrom('basic', 'premium', 'regular', 'standard'), (reference, slipType) => buildFilename(slipType, reference) === \`NIN-Slip-\${reference}.pdf\`))`

- [ ]* 2.2 Write property test — VNIN slip filename matches reference
  - In the same test file
  - **Property 3: VNIN slip filename matches reference**
  - **Validates: Requirements 3.2**
  - `fc.assert(fc.property(fc.string({ minLength: 1 }), (reference) => buildFilename('vnin', reference) === \`VNIN-Slip-\${reference}.pdf\`))`

- [ ]* 2.3 Write property test — download uses the slipUrl from the result
  - In the same test file
  - **Property 1: Download uses the slipUrl from the result**
  - **Validates: Requirements 2.2**
  - Mock `fetch`; `fc.assert(fc.asyncProperty(fc.webUrl(), fc.string({ minLength: 1 }), async (slipUrl, filename) => { await downloadSlip(slipUrl, filename); expect(fetch).toHaveBeenCalledWith(slipUrl); }))`

- [ ] 3. Create `useDownloadSlip` hook
  - Create `apps/frontend/hooks/useDownloadSlip.ts`
  - Accept `{ slipUrl: string | null, reference: string, slipType: SlipType }`
  - Manage `downloading: boolean` and `downloadError: string | null` state
  - `handleDownload` builds the filename via `buildFilename`, calls `downloadSlip`, sets loading state before and after, catches errors and sets `downloadError` to `"Download failed. Please try again."`
  - _Requirements: 2.1, 2.3, 2.4, 4.1, 4.2_

- [ ]* 3.1 Write unit tests for `useDownloadSlip`
  - In `apps/frontend/__tests__/useDownloadSlip.test.ts`
  - Test: `downloading` is `true` while download is in progress, `false` after completion
  - Test: `downloadError` is set to `"Download failed. Please try again."` when `downloadSlip` throws
  - Test: `downloadError` is `null` after a successful download
  - _Requirements: 2.3, 2.4, 4.1, 4.2_

- [ ] 4. Create `DownloadSlipButton` component
  - Create `apps/frontend/components/nin/DownloadSlipButton.tsx`
  - Accept props `{ slipUrl: string | null, reference: string, slipType: SlipType }`
  - When `slipUrl` is `null`: render nothing and show `<p>Slip not available for download.</p>` instead
  - When `slipUrl` is present: render a primary button that calls `handleDownload` from `useDownloadSlip`
  - Loading state: button is `disabled`, shows a spinner, `aria-label="Downloading slip, please wait."`
  - Default state: `aria-label="Download Slip"`, enabled
  - Inline error: render `<p>Download failed. Please try again.</p>` below the button when `downloadError` is set
  - Button is keyboard-focusable (standard `<button>` element handles Enter/Space natively)
  - _Requirements: 1.1, 1.2, 2.3, 2.4, 4.1, 4.2, 4.3, 6.1, 6.2, 6.3_

- [ ]* 4.1 Write unit tests for `DownloadSlipButton`
  - In `apps/frontend/__tests__/DownloadSlipButton.test.tsx`
  - Test: renders button with `aria-label="Download Slip"` when `slipUrl` is present
  - Test: renders "Slip not available for download." and no button when `slipUrl` is `null`
  - Test: button is disabled and `aria-label="Downloading slip, please wait."` while downloading
  - Test: button re-enables after successful download
  - Test: shows inline error "Download failed. Please try again." on fetch failure
  - _Requirements: 1.1, 1.2, 4.1, 4.2, 4.3, 6.1, 6.2_

- [ ] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Wire `DownloadSlipButton` into all four verification pages
  - In each of the four success result cards, import `DownloadSlipButton` and pass `slipUrl={result.slipUrl ?? null}`, `reference={String(result.reference)}`, `slipType={slipType!}`
  - Place the button below the result details grid and above the "Verify Another" button
  - Pages to update:
    - `apps/frontend/app/dashboard/nin/verify/by-nin/page.tsx`
    - `apps/frontend/app/dashboard/nin/verify/by-phone/page.tsx`
    - `apps/frontend/app/dashboard/nin/verify/by-dob/page.tsx`
    - `apps/frontend/app/dashboard/nin/verify/by-vnin/page.tsx`
  - _Requirements: 1.1, 1.3, 1.4_

- [ ]* 6.1 Write unit tests — `DownloadSlipButton` present on all four pages after success
  - In `apps/frontend/__tests__/nin.verify.pages.test.tsx`
  - For each page, render with a mocked successful result that includes a `slipUrl`; assert `DownloadSlipButton` is rendered
  - Assert the button appears below the result details and above the "Verify Another" button
  - _Requirements: 1.3, 1.4_

- [ ] 7. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- `SlipType` is already defined in `apps/frontend/components/SlipTypeModal.tsx` — import from there
- The `buildFilename` function should be exported separately from `downloadSlip` so property tests can call it directly without mocking fetch
- Property tests use **fast-check** (`fc`) which is already in the project's test setup
