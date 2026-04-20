-- AlterTable
ALTER TABLE "wallets" ADD COLUMN "virtual_account_number" TEXT;
ALTER TABLE "wallets" ADD COLUMN "virtual_account_bank" TEXT;
ALTER TABLE "wallets" ADD COLUMN "virtual_account_ref" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "wallets_virtual_account_ref_key" ON "wallets"("virtual_account_ref");
