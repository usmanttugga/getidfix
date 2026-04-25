# Requirements Document

## Introduction

This feature adds a "Download" button to the NIN Verification success screen. After a user submits a verification form (via any of the four methods: by NIN, by Phone, by Bio Data, or by VNIN) and the verification succeeds, the success result card SHALL display a "Download Slip" button. Clicking it triggers a download of the verification slip as a PDF or image file, using the slip data returned by the backend API.

## Glossary

- **Verification_Page**: Any of the four NIN verification pages — Verify by NIN (`/dashboard/nin/verify/by-nin`), Verify by Phone (`/dashboard/nin/verify/by-phone`), Verify by Bio Data (`/dashboard/nin/verify/by-dob`), and Verify by VNIN (`/dashboard/nin/verify/by-vnin`).
- **Verification_Result**: The data object returned by the backend `POST /nin/verify` endpoint upon a successful verification, containing fields such as `fullName`, `dob`, `gender`, `reference`, `amount`, and optionally `slipUrl` or `slipData`.
- **Download_Button**: The UI control rendered on the success screen that initiates the slip download.
- **Slip**: The formatted verification document (PDF or image) representing the NIN verification result, corresponding to the slip type selected by the user (basic, premium, regular, standard, or vnin).
- **Slip_Type**: The format variant of the slip chosen by the user before verification, one of: `basic`, `premium`, `regular`, `standard`, or `vnin`.
- **SlipTypeModal**: The modal component shown before the verification form that allows the user to select a Slip_Type.
- **Backend_API**: The Express.js backend service exposing the `POST /nin/verify` endpoint.
- **Download_Service**: The frontend utility responsible for initiating the file download from a URL or blob.

---

## Requirements

### Requirement 1: Display Download Button on Successful Verification

**User Story:** As a user, I want to see a "Download Slip" button after a successful NIN verification, so that I can save the verification slip to my device.

#### Acceptance Criteria

1. WHEN a NIN verification request succeeds, THE Verification_Page SHALL display a "Download Slip" button within the success result card.
2. WHEN a NIN verification request fails, THE Verification_Page SHALL NOT display the Download_Button.
3. THE Download_Button SHALL be visible on all four Verification_Pages (by NIN, by Phone, by Bio Data, by VNIN) after a successful verification.
4. THE Download_Button SHALL be rendered below the verification result details and above the "Verify Another" button.

---

### Requirement 2: Initiate Slip Download on Button Click

**User Story:** As a user, I want clicking the "Download Slip" button to immediately start downloading the slip file, so that I receive the document without navigating away from the page.

#### Acceptance Criteria

1. WHEN the user clicks the Download_Button, THE Download_Service SHALL initiate a file download to the user's device without navigating away from the current page.
2. WHEN the slip is available as a URL in the Verification_Result, THE Download_Service SHALL fetch the file from that URL and trigger a browser download.
3. WHEN the slip download is in progress, THE Download_Button SHALL display a loading indicator and SHALL be disabled to prevent duplicate download requests.
4. WHEN the slip download completes successfully, THE Download_Button SHALL return to its default enabled state.

---

### Requirement 3: Downloaded File Naming

**User Story:** As a user, I want the downloaded slip file to have a meaningful filename, so that I can identify it easily in my downloads folder.

#### Acceptance Criteria

1. THE Download_Service SHALL name the downloaded file using the pattern `NIN-Slip-{reference}.pdf` where `{reference}` is the verification reference from the Verification_Result.
2. WHERE the Slip_Type is `vnin`, THE Download_Service SHALL name the file `VNIN-Slip-{reference}.pdf`.

---

### Requirement 4: Handle Download Errors

**User Story:** As a user, I want to see a clear error message if the slip download fails, so that I know something went wrong and can try again.

#### Acceptance Criteria

1. IF the slip download request fails, THEN THE Verification_Page SHALL display an inline error message below the Download_Button stating "Download failed. Please try again."
2. IF the slip download request fails, THEN THE Download_Button SHALL remain visible and enabled so the user can retry.
3. IF the Verification_Result does not contain a downloadable slip URL or data, THEN THE Download_Button SHALL be hidden and THE Verification_Page SHALL display a message stating "Slip not available for download."

---

### Requirement 5: Backend Slip URL in Verification Response

**User Story:** As a developer, I want the backend to include a slip download URL in the verification response, so that the frontend can use it to trigger the download.

#### Acceptance Criteria

1. WHEN a NIN verification succeeds, THE Backend_API SHALL include a `slipUrl` field in the response `data` object containing a valid, accessible URL to the generated slip file.
2. WHEN the Slip_Type is `basic`, THE Backend_API SHALL include a `slipUrl` pointing to the basic slip file.
3. WHEN the Slip_Type is `premium`, `regular`, `standard`, or `vnin`, THE Backend_API SHALL include a `slipUrl` pointing to the corresponding slip file.
4. IF the external VerifyMe API does not return a slip URL, THEN THE Backend_API SHALL return a `slipUrl` value of `null` in the response.

---

### Requirement 6: Accessibility of the Download Button

**User Story:** As a user relying on assistive technology, I want the Download Slip button to be accessible, so that I can use it with a keyboard or screen reader.

#### Acceptance Criteria

1. THE Download_Button SHALL have an accessible label of "Download Slip" readable by screen readers via an `aria-label` attribute.
2. WHEN the Download_Button is in a loading state, THE Download_Button SHALL update its `aria-label` to "Downloading slip, please wait."
3. THE Download_Button SHALL be focusable and activatable via keyboard (Enter and Space keys).
