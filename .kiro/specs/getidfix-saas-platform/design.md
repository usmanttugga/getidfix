# Design Document — GETIDFIX SaaS Verification Platform

## Overview

GETIDFIX is a prepaid SaaS platform for identity verification and utility services in Nigeria. Users register, fund a wallet, and submit service request forms. Most services are processed manually by an Admin who reviews submissions and responds with results. Three service types are automated: NIN Verification (calls NIMC API), and Airtime/Data purchases (call VTU API).

The platform has two roles:
- **User** — registers, funds wallet, submits requests, views history
- **Admin** — reviews pending requests, responds, manages users and service pricing

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Node.js + Express (TypeScript) |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT (access + refresh tokens), bcrypt |
| Email | Nodemailer (password reset only) |
| Payment | Paystack (wallet funding via webhooks) |
| Caching | Redis (session/token blacklist only) |
| Testing | Jest (unit + integration) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Next.js Frontend                      │
│   /login  /dashboard/*  /admin/*                            │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP (REST)
┌────────────────────────▼────────────────────────────────────┐
│                    Express API  :3001                        │
│                                                             │
│  Auth Routes      User Routes       Admin Routes            │
│  /api/v1/auth/*   /api/v1/*         /api/v1/admin/*         │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │  Auth    │  │ Request  │  │  Wallet  │  │  Notif.   │  │
│  │ Service  │  │ Service  │  │ Service  │  │  Service  │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────┘  │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │   NIN    │  │ Airtime  │  │   Data   │                  │
│  │ Service  │  │ Service  │  │ Service  │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└──────┬──────────────┬──────────────┬───────────────────────┘
       │              │              │
┌──────▼──────┐ ┌─────▼──────┐ ┌────▼──────────────────────┐
│  PostgreSQL │ │   Redis    │ │  External APIs             │
│  (Prisma)   │ │  (tokens)  │ │  NIMC API / VTU API /      │
└─────────────┘ └────────────┘ │  Paystack Webhooks         │
                                └───────────────────────────┘
```

### Request Flow

**Manual service (BVN, NIN non-verification):**
1. User submits form → wallet debited → `ServiceRequest` created (PENDING)
2. Admin reviews → submits response text + optional file
3. Status → COMPLETED or REJECTED
4. If REJECTED → wallet refunded → notification sent to user

**Automated service (NIN Verification, Airtime, Data):**
1. User submits form → wallet debited → API called immediately
2. On API success → `ServiceRequest` created (COMPLETED)
3. On API failure → wallet NOT debited → error returned

**Wallet funding:**
1. User initiates → Paystack checkout opened
2. Paystack sends webhook → signature verified → wallet credited

---

## Data Models (Prisma Schema)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  USER
}

enum UserStatus {
  ACTIVE
  SUSPENDED
}

enum ServiceCategory {
  NIN
  BVN
  AIRTIME
  DATA
}

enum RequestStatus {
  PENDING
  COMPLETED
  REJECTED
}

enum WalletTransactionType {
  CREDIT
  DEBIT
  REFUND
}

// ─── Models ───────────────────────────────────────────────────────────────────

model User {
  id           String     @id @default(uuid())
  email        String     @unique
  passwordHash String     @map("password_hash")
  firstName    String     @map("first_name")
  lastName     String     @map("last_name")
  phone        String?
  role         Role       @default(USER)
  status       UserStatus @default(ACTIVE)
  createdAt    DateTime   @default(now()) @map("created_at")

  wallet             Wallet?
  serviceRequests    ServiceRequest[]
  walletTransactions WalletTransaction[]
  notifications      Notification[]
  resetTokens        PasswordResetToken[]

  @@map("users")
}

model Wallet {
  id      String  @id @default(uuid())
  userId  String  @unique @map("user_id")
  balance Decimal @default(0) @db.Decimal(15, 2)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("wallets")
}

model Service {
  id        String          @id @default(uuid())
  name      String          @unique
  slug      String          @unique
  category  ServiceCategory
  price     Decimal         @db.Decimal(10, 2)
  isEnabled Boolean         @default(true) @map("is_enabled")

  serviceRequests ServiceRequest[]

  @@map("services")
}

model ServiceRequest {
  id            String        @id @default(uuid())
  userId        String        @map("user_id")
  serviceId     String        @map("service_id")
  reference     String        @unique
  status        RequestStatus @default(PENDING)
  formData      Json          @map("form_data")
  adminResponse Json?         @map("admin_response")
  // adminResponse shape: { text: string, fileUrl?: string, respondedAt: string }
  amount        Decimal       @db.Decimal(10, 2)
  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt @map("updated_at")

  user    User    @relation(fields: [userId], references: [id])
  service Service @relation(fields: [serviceId], references: [id])

  @@index([userId])
  @@index([status])
  @@index([createdAt])
  @@map("service_requests")
}

model WalletTransaction {
  id          String                @id @default(uuid())
  userId      String                @map("user_id")
  type        WalletTransactionType
  amount      Decimal               @db.Decimal(10, 2)
  balanceAfter Decimal              @db.Decimal(10, 2) @map("balance_after")
  reference   String                @unique
  description String
  createdAt   DateTime              @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([createdAt])
  @@map("wallet_transactions")
}

model Notification {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  title     String
  body      String
  isRead    Boolean  @default(false) @map("is_read")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("notifications")
}

model PasswordResetToken {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  tokenHash String   @unique @map("token_hash")
  expiresAt DateTime @map("expires_at")
  used      Boolean  @default(false)
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("password_reset_tokens")
}
```

### Key Design Notes

- `ServiceRequest.formData` — stores submitted form fields as JSON (varies per service)
- `ServiceRequest.adminResponse` — stores `{ text, fileUrl?, respondedAt }` when admin responds
- `WalletTransaction` records every balance change (CREDIT on funding, DEBIT on request, REFUND on rejection)
- Wallet balance updates and `WalletTransaction` creation happen in a single Prisma transaction to ensure consistency

---

## API Routes

All routes are prefixed `/api/v1`. Protected routes require `Authorization: Bearer <access_token>`.

### Auth

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Create account, return tokens |
| POST | `/auth/login` | Authenticate, return tokens |
| POST | `/auth/logout` | Blacklist refresh token in Redis |
| POST | `/auth/forgot-password` | Send reset email |
| POST | `/auth/reset-password` | Consume token, update password |
| POST | `/auth/refresh` | Exchange refresh token for new access token |

### User — Services & Requests

| Method | Path | Description |
|---|---|---|
| GET | `/services` | List all enabled services |
| POST | `/requests` | Submit a service request (debit wallet) |
| GET | `/requests` | User's own request history (paginated) |
| GET | `/requests/:id` | Single request detail |

### User — Wallet

| Method | Path | Description |
|---|---|---|
| GET | `/wallet` | Balance + transaction history |
| POST | `/wallet/fund` | Initiate Paystack payment, return checkout URL |
| POST | `/wallet/webhook` | Paystack webhook receiver (public, signature-verified) |

### User — Notifications

| Method | Path | Description |
|---|---|---|
| GET | `/notifications` | List notifications (unread first) |
| PATCH | `/notifications/:id/read` | Mark single notification as read |

### User — Automated Services

| Method | Path | Description |
|---|---|---|
| POST | `/nin/verify` | Verify NIN via NIMC API |
| POST | `/airtime/purchase` | Buy airtime via VTU API |
| GET | `/data/plans` | Get available data bundle plans |
| POST | `/data/purchase` | Buy data bundle via VTU API |

### Admin (role: ADMIN required)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/dashboard` | Summary counts |
| GET | `/admin/requests` | All requests, filterable by status/service/date |
| GET | `/admin/requests/:id` | Request detail with user info |
| PATCH | `/admin/requests/:id` | Respond (complete/reject) |
| GET | `/admin/users` | Paginated user list |
| PATCH | `/admin/users/:id` | Suspend or reactivate user |
| GET | `/admin/services` | All services with pricing |
| PATCH | `/admin/services/:id` | Update price or enabled status |

### Standard Response Envelope

```json
{
  "status": "success" | "error",
  "data": { ... },
  "message": "Human-readable message"
}
```

Errors also include a `code` field (e.g. `INSUFFICIENT_BALANCE`, `INVALID_NIN`, `UNAUTHORIZED`).

---

## Frontend Structure

```
apps/frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          # Login + Register tabs
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   │
│   ├── dashboard/
│   │   ├── layout.tsx              # Sidebar + header shell
│   │   ├── page.tsx                # Overview: balance, shortcuts, recent requests
│   │   ├── nin/
│   │   │   ├── verify/page.tsx     # NIN Verification (automated)
│   │   │   ├── validation/page.tsx
│   │   │   ├── modification/page.tsx
│   │   │   ├── ipe-clearance/page.tsx
│   │   │   ├── vnin-slip/page.tsx
│   │   │   ├── self-service/page.tsx
│   │   │   └── personalization/page.tsx
│   │   ├── bvn/
│   │   │   ├── verification/page.tsx
│   │   │   ├── retrieval/page.tsx
│   │   │   ├── modification/page.tsx
│   │   │   └── user/page.tsx
│   │   ├── airtime/page.tsx
│   │   ├── data/page.tsx
│   │   ├── wallet/page.tsx         # Balance + transaction history + fund button
│   │   ├── requests/page.tsx       # Full request history
│   │   └── notifications/page.tsx
│   │
│   └── admin/
│       ├── layout.tsx              # Admin sidebar + header
│       ├── page.tsx                # Summary dashboard
│       ├── requests/
│       │   ├── page.tsx            # Filterable request list
│       │   └── [id]/page.tsx       # Request detail + respond form
│       ├── users/page.tsx
│       └── services/page.tsx       # Pricing config
│
├── components/
│   ├── ui/                         # shadcn/ui primitives (Button, Input, etc.)
│   ├── layout/
│   │   ├── DashboardSidebar.tsx
│   │   ├── AdminSidebar.tsx
│   │   ├── TopBar.tsx
│   │   └── NotificationBell.tsx    # Unread count badge
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   ├── wallet/
│   │   ├── WalletCard.tsx          # Balance display
│   │   ├── FundWalletModal.tsx
│   │   └── TransactionList.tsx
│   ├── requests/
│   │   ├── RequestCard.tsx
│   │   ├── RequestStatusBadge.tsx
│   │   └── RequestDetailView.tsx
│   ├── admin/
│   │   ├── AdminRequestTable.tsx
│   │   ├── RespondModal.tsx        # Text + file upload + complete/reject
│   │   └── UserTable.tsx
│   ├── services/
│   │   ├── ServiceGrid.tsx         # Category-grouped service cards
│   │   └── ServiceRequestForm.tsx  # Generic form renderer from service config
│   └── brand/
│       └── GetIdfixLogo.tsx
│
├── lib/
│   ├── api.ts                      # Axios instance with interceptors
│   ├── auth.ts                     # Token storage + refresh logic
│   └── utils.ts
│
└── hooks/
    ├── useAuth.ts
    ├── useWallet.ts
    └── useNotifications.ts
```

### State Management

No global state library needed. Use:
- React Query (TanStack Query) for server state (requests, wallet, notifications)
- React Context for auth state (user + tokens)
- Local component state for forms

### Auth Flow

1. On login, store access token in memory (React context) and refresh token in an `httpOnly` cookie
2. Axios interceptor attaches `Authorization: Bearer <token>` to every request
3. On 401, interceptor calls `/auth/refresh` once, retries original request
4. On logout or refresh failure, clear context and redirect to `/login`

---

## Service Configuration

Services are seeded in the database. Each has a `slug` that maps to a frontend route and backend handler.

| Slug | Name | Category | Automated |
|---|---|---|---|
| `nin-verification` | NIN Verification | NIN | Yes (NIMC API) |
| `nin-validation` | NIN Validation | NIN | No |
| `nin-modification` | NIN Modification | NIN | No |
| `ipe-clearance` | IPE Clearance | NIN | No |
| `vnin-slip` | VNIN Slip | NIN | No |
| `nin-self-service` | Self Service | NIN | No |
| `nin-personalization` | NIN Personalization | NIN | No |
| `bvn-verification` | BVN Verification | BVN | No |
| `bvn-retrieval` | BVN Retrieval | BVN | No |
| `bvn-modification` | BVN Modification | BVN | No |
| `bvn-user` | BVN User | BVN | No |
| `airtime` | Airtime Purchase | AIRTIME | Yes (VTU API) |
| `data` | Data Purchase | DATA | Yes (VTU API) |

---

## Wallet & Transaction Logic

### Funding (Paystack)

```
POST /wallet/fund
  → Create pending WalletTransaction (CREDIT, reference = Paystack ref)
  → Return Paystack checkout URL

POST /wallet/webhook  (Paystack calls this)
  → Verify HMAC-SHA512 signature (X-Paystack-Signature header)
  → If event = "charge.success" and reference not already processed:
      → BEGIN TRANSACTION
        → wallet.balance += amount
        → walletTransaction.status = confirmed (or just record it)
        → Create Notification for user
      → COMMIT
```

### Service Request Submission

```
POST /requests
  → Validate form fields
  → Check wallet.balance >= service.price
  → BEGIN TRANSACTION
    → wallet.balance -= service.price
    → Create WalletTransaction (DEBIT)
    → Create ServiceRequest (PENDING)
  → COMMIT
  → If automated service: call external API, update status immediately
  → Return { reference, status }
```

### Admin Rejection (Refund)

```
PATCH /admin/requests/:id  { status: "REJECTED", responseText: "..." }
  → BEGIN TRANSACTION
    → serviceRequest.status = REJECTED
    → serviceRequest.adminResponse = { text, respondedAt }
    → wallet.balance += serviceRequest.amount
    → Create WalletTransaction (REFUND)
  → COMMIT
  → Create Notification for user
```

---

## Error Handling

All errors follow the standard envelope. Key error codes:

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Missing or invalid form fields |
| `INSUFFICIENT_BALANCE` | 400 | Wallet balance too low |
| `INVALID_NIN` | 400 | NIN is not 11 numeric digits |
| `INVALID_PHONE` | 400 | Phone number format invalid |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Role does not permit action |
| `NOT_FOUND` | 404 | Resource does not exist |
| `SERVICE_DISABLED` | 400 | Service is currently disabled |
| `EXTERNAL_API_ERROR` | 502 | NIMC or VTU API unavailable |
| `WEBHOOK_INVALID` | 400 | Paystack signature mismatch |

Express global error handler catches all thrown errors and formats them consistently. Unhandled promise rejections are logged and return a generic 500.

---

## Testing Strategy

**Unit tests** (Jest, `apps/backend/src/__tests__/unit/`):
- Auth service: registration, login, token refresh, password reset
- Wallet service: balance deduction, refund, Paystack webhook verification
- Request service: form validation, status transitions
- NIN service: 11-digit validation logic
- Airtime/Data service: phone number validation, provider mapping

**Integration tests** (Jest + test database, `apps/backend/src/__tests__/integration/`):
- Full auth flow (register → login → refresh → logout)
- Wallet funding via mocked Paystack webhook
- Service request submission with wallet debit
- Admin request rejection with wallet refund
- Role-based access control (user cannot hit admin routes)

**Frontend tests** (Playwright E2E, `apps/frontend/e2e/`):
- Smoke test: login page loads, register flow completes
- User can submit a service request and see it in history
- Admin can view and respond to a pending request

No property-based testing is used. The domain logic (wallet arithmetic, status transitions) is straightforward enough that example-based tests with representative inputs provide sufficient coverage.

---

## GETIDFIX Logo Component

Shield motif with navy `#0F4C81` body, green `#00C896` checkmark, and wordmark "GET**[ID]**FIX" with the `[ID]` segment in green.

```tsx
// components/brand/GetIdfixLogo.tsx
import React from 'react';

interface GetIdfixLogoProps {
  className?: string;
  /** Show just the shield icon without the wordmark */
  iconOnly?: boolean;
}

export function GetIdfixLogo({ className = '', iconOnly = false }: GetIdfixLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Shield SVG */}
      <svg
        width="36"
        height="40"
        viewBox="0 0 36 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Shield body */}
        <path
          d="M18 2L3 8V20C3 28.837 9.477 37.028 18 39C26.523 37.028 33 28.837 33 20V8L18 2Z"
          fill="#0F4C81"
        />
        {/* Checkmark */}
        <path
          d="M11 20L15.5 25L25 14"
          stroke="#00C896"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Wordmark */}
      {!iconOnly && (
        <span
          className="font-bold text-xl tracking-tight select-none"
          style={{ color: '#0F4C81', fontFamily: 'inherit' }}
        >
          GET
          <span style={{ color: '#00C896' }}>[ID]</span>
          FIX
        </span>
      )}
    </div>
  );
}
```

Usage:
```tsx
// Full logo (header, login page)
<GetIdfixLogo />

// Icon only (favicon, mobile nav collapsed)
<GetIdfixLogo iconOnly />

// Custom size via className
<GetIdfixLogo className="scale-125" />
```
