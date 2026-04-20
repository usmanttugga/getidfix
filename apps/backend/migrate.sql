ALTER TABLE "wallets" ADD COLUMN IF NOT EXISTS "virtual_account_number" TEXT;
ALTER TABLE "wallets" ADD COLUMN IF NOT EXISTS "virtual_account_bank" TEXT;
ALTER TABLE "wallets" ADD COLUMN IF NOT EXISTS "virtual_account_ref" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "wallets_virtual_account_ref_key" ON "wallets"("virtual_account_ref");
