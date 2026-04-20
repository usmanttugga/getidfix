# Requirements Document

## Introduction

GETIDFIX is a SaaS verification platform that allows users to submit identity and utility service requests, funded from a prepaid wallet. The platform serves two roles: Admin and User. Most services are processed manually by the Admin, who reviews submitted requests and responds with results. NIN Verification is the only identity service that calls an external API automatically. Airtime and Data purchases are also automated via a VTU API. The platform must be visually professional and easy to use, while keeping the backend logic simple.

---

## Glossary

- **GETIDFIX**: The SaaS verification platform described in this document.
- **Admin**: A privileged user who manages service requests, users, and platform configuration.
- **User**: A registered customer who funds their wallet and submits service requests.
- **NIN**: National Identification Number — a unique identifier issued to Nigerian citizens and legal residents.
- **BVN**: Bank Verification Number — a unique identifier linked to a customer's bank account(s) in Nigeria.
- **VNIN**: Virtual NIN — a tokenized, shareable version of a NIN.
- **IPE Clearance**: Identity Pre-Enrollment Clearance — a process to clear identity records before enrollment.
- **NIN Personalization**: The process of updating personal data associated with a NIN record.
- **NIN Modification**: The process of correcting NIN record data.
- **BVN Modification**: The process of correcting BVN record data.
- **BVN Retrieval**: The process of recovering a BVN using associated identity details.
- **BVN User**: A service that links or queries a BVN to a specific user profile.
- **Self Service**: A NIN-related service allowing users to perform identity actions independently.
- **VTU API**: Virtual Top-Up API — the external service used to process airtime and data purchases automatically.
- **NIMC API**: The external API provided by the National Identity Management Commission, used for NIN Verification.
- **Paystack**: The payment gateway used to process wallet funding transactions.
- **Wallet**: A prepaid virtual balance held by a User account, used to pay for service requests.
- **Service Request**: A transaction initiated by a User to consume one of the platform's services.
- **Dashboard**: The main interface presented to a user after login, tailored to their role.
- **Session**: An authenticated period of platform access initiated by a successful login.

---

## Requirements

### Requirement 1: User Registration and Authentication

**User Story:** As a visitor, I want to register and log in to GETIDFIX, so that I can access services.

#### Acceptance Criteria

1. THE Platform SHALL provide a combined login and registration page as the default entry point for unauthenticated visitors.
2. WHEN a visitor submits a valid email address, full name, phone number, and password during registration, THE Platform SHALL create a new User account and redirect the visitor to the User Dashboard.
3. WHEN a visitor submits valid login credentials (email and password), THE Platform SHALL authenticate the visitor and redirect them to their role-specific dashboard.
4. WHEN a visitor submits invalid login credentials, THE Platform SHALL display a descriptive error message and SHALL NOT grant access to any protected resource.
5. WHEN a Session remains idle for 30 minutes, THE Platform SHALL invalidate the Session and redirect the User to the login page.
6. THE Platform SHALL support password reset via a time-limited link sent to the registered email address.
7. WHEN a password reset link is older than 60 minutes, THE Platform SHALL reject the reset attempt and prompt the User to request a new link.

---

### Requirement 2: Role-Based Access

**User Story:** As a platform operator, I want distinct Admin and User roles, so that management functions are protected from regular users.

#### Acceptance Criteria

1. THE Platform SHALL assign exactly one role — Admin or User — to each registered account.
2. WHILE a User is authenticated with the Admin role, THE Platform SHALL grant access to the Admin Dashboard, user management, service request management, and service pricing configuration.
3. WHILE a User is authenticated with the User role, THE Platform SHALL restrict access to only the User Dashboard, service request forms, transaction history, and wallet management.
4. IF a User role account attempts to access an Admin-only resource, THEN THE Platform SHALL return an access-denied response.
5. THE Admin SHALL be able to suspend and reactivate User accounts from the Admin Dashboard.

---

### Requirement 3: Admin Dashboard

**User Story:** As an Admin, I want a dashboard where I can see pending requests and manage the platform, so that I can process user requests efficiently.

#### Acceptance Criteria

1. THE Admin Dashboard SHALL display a summary panel showing total registered users, total pending service requests, total service requests processed today, and total wallet credits received today.
2. THE Admin Dashboard SHALL provide navigation to: Pending Requests, All Requests, User Management, and Service Pricing.
3. WHEN the Admin navigates to Pending Requests, THE Platform SHALL display a list of all service requests with status "Pending", showing the user's name, service type, submission timestamp, and a link to view request details.
4. WHEN the Admin navigates to User Management, THE Platform SHALL display a searchable, paginated list of all registered users with their status, wallet balance, and registration date.
5. THE Admin Dashboard SHALL render correctly on desktop screen widths of 1024px and above.

---

### Requirement 4: User Dashboard

**User Story:** As a User, I want a clear dashboard, so that I can access services, view my request history, and manage my wallet.

#### Acceptance Criteria

1. THE User Dashboard SHALL display the User's current wallet balance, a panel of all available services grouped by category, and a summary of the User's 5 most recent service requests.
2. THE User Dashboard SHALL provide navigation to: NIN Services, BVN Services, Airtime & Data, Transaction History, and Wallet.
3. THE User Dashboard SHALL render correctly on screen widths from 375px (mobile) to 1440px (desktop).
4. WHEN a User selects a service, THE Platform SHALL navigate the User to the corresponding service request form.

---

### Requirement 5: Wallet Funding

**User Story:** As a User, I want to fund my wallet via Paystack, so that I can pay for services.

#### Acceptance Criteria

1. THE Platform SHALL provide each registered User account with a wallet with an initial balance of ₦0.00.
2. WHEN a User initiates a wallet funding request with an amount between ₦100 and ₦1,000,000, THE Wallet_Service SHALL redirect the User to Paystack to complete the payment.
3. WHEN Paystack sends a successful payment webhook, THE Wallet_Service SHALL credit the User's wallet with the funded amount and record the transaction.
4. IF a Paystack transaction fails or is cancelled, THEN THE Wallet_Service SHALL NOT credit the User's wallet and SHALL display a failure message to the User.
5. THE Wallet_Service SHALL verify the authenticity of all incoming Paystack webhooks before processing them.
6. IF a User's wallet balance is insufficient for a requested service, THEN THE Platform SHALL reject the service request, display an insufficient-balance message, and prompt the User to fund their wallet.

---

### Requirement 6: Service Request Submission

**User Story:** As a User, I want to submit a service request by filling a form and paying from my wallet, so that I can access the platform's services.

#### Acceptance Criteria

1. WHEN a User selects a service and submits the required form fields, THE Platform SHALL validate that all required fields are present before processing the request.
2. WHEN a service request is submitted and the User's wallet balance is sufficient, THE Platform SHALL deduct the service cost from the User's wallet atomically and create a Service Request record with status "Pending".
3. WHEN a service request is created, THE Platform SHALL display a confirmation to the User with the request reference number and current status.
4. THE Platform SHALL display the price of each service to the User before the User confirms the submission.
5. WHEN a User views their transaction history, THE Platform SHALL display all service requests with their service type, status, submission timestamp, cost, and reference number.

---

### Requirement 7: NIN Verification (Automated)

**User Story:** As a User, I want to verify a NIN instantly, so that I can confirm an individual's identity against official records.

#### Acceptance Criteria

1. WHEN a User submits a valid 11-digit NIN for verification, THE NIN_Service SHALL call the NIMC API and return the associated identity record — including full name, date of birth, gender, and photo — to the User.
2. WHEN the NIMC API returns a not-found response, THE NIN_Service SHALL display a descriptive not-found message to the User.
3. IF the NIMC API is unavailable, THEN THE Platform SHALL display a service-unavailable message and SHALL NOT deduct wallet balance for the failed request.
4. THE NIN_Service SHALL validate that the submitted NIN consists of exactly 11 numeric digits before calling the NIMC API.
5. WHEN a NIN Verification request is completed, THE Platform SHALL record the transaction in the User's transaction history with the service type, timestamp, status, and cost.

---

### Requirement 8: Manually Processed NIN Services

**User Story:** As a User, I want to submit NIN service requests (other than NIN Verification), so that the Admin can process them and return results to me.

#### Acceptance Criteria

1. THE Platform SHALL provide service request forms for the following NIN services: NIN Validation, NIN Modification, IPE Clearance, VNIN Slip, Self Services, and NIN Personalization.
2. WHEN a User submits any of these NIN service request forms, THE Platform SHALL create a Service Request record with status "Pending" and deduct the service cost from the User's wallet.
3. WHEN the Admin opens a pending NIN service request, THE Platform SHALL display the submitted form data and provide options to approve, reject, or respond with a result.
4. WHEN the Admin submits a response to a NIN service request, THE Platform SHALL update the request status to "Completed" or "Rejected" and store the Admin's response.
5. WHEN a NIN service request status is updated by the Admin, THE Platform SHALL display the updated status and Admin response in the User's transaction history.

---

### Requirement 9: Manually Processed BVN Services

**User Story:** As a User, I want to submit BVN service requests, so that the Admin can process them and return results to me.

#### Acceptance Criteria

1. THE Platform SHALL provide service request forms for the following BVN services: BVN Verification, BVN Retrieval, BVN Modification, and BVN User.
2. WHEN a User submits any BVN service request form, THE Platform SHALL create a Service Request record with status "Pending" and deduct the service cost from the User's wallet.
3. WHEN the Admin opens a pending BVN service request, THE Platform SHALL display the submitted form data and provide options to approve, reject, or respond with a result.
4. WHEN the Admin submits a response to a BVN service request, THE Platform SHALL update the request status to "Completed" or "Rejected" and store the Admin's response.
5. WHEN a BVN service request status is updated by the Admin, THE Platform SHALL display the updated status and Admin response in the User's transaction history.

---

### Requirement 10: Airtime Purchase (Automated)

**User Story:** As a User, I want to buy airtime for any Nigerian mobile network, so that I can top up a phone number directly from the platform.

#### Acceptance Criteria

1. WHEN a User submits a valid Nigerian phone number, a network provider, and an airtime amount between ₦50 and ₦50,000, THE Airtime_Service SHALL call the VTU API to process the purchase and return a success confirmation with a transaction reference.
2. WHEN an airtime purchase is successful, THE Platform SHALL deduct the corresponding amount from the User's wallet balance.
3. WHEN an airtime purchase fails after submission to the VTU API, THE Platform SHALL NOT deduct wallet balance and SHALL return a descriptive error message.
4. THE Airtime_Service SHALL support the following network providers: MTN, Airtel, Glo, and 9mobile.
5. THE Airtime_Service SHALL validate that the submitted phone number is a valid 11-digit Nigerian mobile number before calling the VTU API.
6. WHEN an airtime purchase is completed, THE Platform SHALL record the transaction in the User's transaction history.

---

### Requirement 11: Data Purchase (Automated)

**User Story:** As a User, I want to buy a data bundle for any Nigerian mobile network, so that I can activate internet data on a phone number directly from the platform.

#### Acceptance Criteria

1. WHEN a User selects a network provider, a data bundle plan, and a valid Nigerian phone number, THE Data_Service SHALL call the VTU API to process the purchase and return a success confirmation with a transaction reference.
2. WHEN a data purchase is successful, THE Platform SHALL deduct the bundle price from the User's wallet balance.
3. WHEN a data purchase fails after submission to the VTU API, THE Platform SHALL NOT deduct wallet balance and SHALL return a descriptive error message.
4. THE Data_Service SHALL support the following network providers: MTN, Airtel, Glo, and 9mobile.
5. THE Data_Service SHALL display available bundle plans with their sizes and prices before the User confirms the purchase.
6. WHEN a data purchase is completed, THE Platform SHALL record the transaction in the User's transaction history.

---

### Requirement 12: Admin Request Processing

**User Story:** As an Admin, I want to review and respond to pending service requests, so that users receive their results.

#### Acceptance Criteria

1. WHEN the Admin views a pending service request, THE Platform SHALL display the requesting user's name, the service type, all submitted form fields, the submission timestamp, and the amount charged.
2. WHEN the Admin submits a response (result text, file, or rejection reason) for a service request, THE Platform SHALL update the request status and store the response.
3. THE Admin SHALL be able to set the status of a service request to "Completed" or "Rejected".
4. WHEN a service request is rejected by the Admin, THE Platform SHALL refund the service cost to the User's wallet.
5. THE Platform SHALL display the count of pending requests prominently on the Admin Dashboard so the Admin is aware of outstanding work.

---

### Requirement 13: Service Pricing Configuration

**User Story:** As an Admin, I want to set and update the price for each service, so that I can control service costs.

#### Acceptance Criteria

1. THE Admin SHALL be able to view the current price for every service from the Service Pricing section of the Admin Dashboard.
2. THE Admin SHALL be able to update the price for any individual service.
3. WHEN the Admin updates a service price, THE Platform SHALL apply the new price to all subsequent service requests and SHALL NOT retroactively alter completed transactions.
4. THE Admin SHALL be able to enable or disable any individual service.
5. WHEN a service is disabled by the Admin, THE Platform SHALL hide the service from the User Dashboard and reject any direct service requests for that service.

---

### Requirement 14: Notifications

**User Story:** As a User, I want to receive in-app notifications for important events, so that I can stay informed about my requests and wallet.

#### Acceptance Criteria

1. WHEN a service request status is updated by the Admin, THE Platform SHALL send an in-app notification to the User with the new status and a link to the request.
2. WHEN a User's wallet is credited or debited, THE Platform SHALL send an in-app notification with the amount and updated balance.
3. THE Platform SHALL display the unread notification count in the navigation bar.
4. WHEN a User marks a notification as read, THE Platform SHALL update the unread count immediately.

---

### Requirement 15: Platform UI and Branding

**User Story:** As a platform operator, I want GETIDFIX to have a professional and consistent visual identity, so that users trust the platform and find it easy to use.

#### Acceptance Criteria

1. THE Platform SHALL display the GETIDFIX logo on the login page, dashboard header, and all downloadable documents.
2. THE Platform SHALL apply a consistent color scheme, typography, and component style across all pages.
3. THE Platform SHALL render all core views without horizontal scrolling on screen widths from 375px to 1440px.
4. THE Platform SHALL display loading indicators for all operations expected to take longer than 500ms.
5. THE Platform SHALL display empty-state messages when a list or data section has no content to show.
