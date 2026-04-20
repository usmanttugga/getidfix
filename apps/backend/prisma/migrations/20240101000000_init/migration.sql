-- ─── GETIDFIX Initial Migration ──────────────────────────────────────────────

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "ServiceCategory" AS ENUM ('NIN', 'BVN', 'AIRTIME', 'DATA');
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'COMPLETED', 'REJECTED');
CREATE TYPE "WalletTransactionType" AS ENUM ('CREDIT', 'DEBIT', 'REFUND');

-- ─── CreateTable: users ───────────────────────────────────────────────────────
CREATE TABLE "users" (
    "id"            UUID         NOT NULL DEFAULT gen_random_uuid(),
    "email"         TEXT         NOT NULL,
    "password_hash" TEXT         NOT NULL,
    "first_name"    TEXT         NOT NULL,
    "last_name"     TEXT         NOT NULL,
    "phone"         TEXT,
    "role"          "Role"       NOT NULL DEFAULT 'USER',
    "status"        "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- ─── CreateTable: wallets ─────────────────────────────────────────────────────
CREATE TABLE "wallets" (
    "id"      UUID          NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID          NOT NULL,
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");

-- ─── CreateTable: services ────────────────────────────────────────────────────
CREATE TABLE "services" (
    "id"         UUID              NOT NULL DEFAULT gen_random_uuid(),
    "name"       TEXT              NOT NULL,
    "slug"       TEXT              NOT NULL,
    "category"   "ServiceCategory" NOT NULL,
    "price"      DECIMAL(10,2)     NOT NULL,
    "is_enabled" BOOLEAN           NOT NULL DEFAULT true,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "services_name_key" ON "services"("name");
CREATE UNIQUE INDEX "services_slug_key" ON "services"("slug");

-- ─── CreateTable: service_requests ───────────────────────────────────────────
CREATE TABLE "service_requests" (
    "id"             UUID            NOT NULL DEFAULT gen_random_uuid(),
    "user_id"        UUID            NOT NULL,
    "service_id"     UUID            NOT NULL,
    "reference"      TEXT            NOT NULL,
    "status"         "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "form_data"      JSONB           NOT NULL,
    "admin_response" JSONB,
    "amount"         DECIMAL(10,2)   NOT NULL,
    "created_at"     TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMP(3)    NOT NULL,

    CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "service_requests_reference_key" ON "service_requests"("reference");
CREATE INDEX "service_requests_user_id_idx"   ON "service_requests"("user_id");
CREATE INDEX "service_requests_status_idx"    ON "service_requests"("status");
CREATE INDEX "service_requests_created_at_idx" ON "service_requests"("created_at");

-- ─── CreateTable: wallet_transactions ────────────────────────────────────────
CREATE TABLE "wallet_transactions" (
    "id"           UUID                    NOT NULL DEFAULT gen_random_uuid(),
    "user_id"      UUID                    NOT NULL,
    "type"         "WalletTransactionType" NOT NULL,
    "amount"       DECIMAL(10,2)           NOT NULL,
    "balance_after" DECIMAL(10,2)          NOT NULL,
    "reference"    TEXT                    NOT NULL,
    "description"  TEXT                    NOT NULL,
    "created_at"   TIMESTAMP(3)            NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "wallet_transactions_reference_key" ON "wallet_transactions"("reference");
CREATE INDEX "wallet_transactions_user_id_idx"   ON "wallet_transactions"("user_id");
CREATE INDEX "wallet_transactions_created_at_idx" ON "wallet_transactions"("created_at");

-- ─── CreateTable: notifications ───────────────────────────────────────────────
CREATE TABLE "notifications" (
    "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
    "user_id"    UUID         NOT NULL,
    "title"      TEXT         NOT NULL,
    "body"       TEXT         NOT NULL,
    "is_read"    BOOLEAN      NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- ─── CreateTable: password_reset_tokens ──────────────────────────────────────
CREATE TABLE "password_reset_tokens" (
    "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
    "user_id"    UUID         NOT NULL,
    "token_hash" TEXT         NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used"       BOOLEAN      NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- ─── AddForeignKey constraints ────────────────────────────────────────────────
ALTER TABLE "wallets"
    ADD CONSTRAINT "wallets_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "service_requests"
    ADD CONSTRAINT "service_requests_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "service_requests"
    ADD CONSTRAINT "service_requests_service_id_fkey"
    FOREIGN KEY ("service_id") REFERENCES "services"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "wallet_transactions"
    ADD CONSTRAINT "wallet_transactions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
