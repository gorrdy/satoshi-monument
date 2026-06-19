-- AlterTable
ALTER TABLE "Donation" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'monument';

-- CreateIndex
CREATE INDEX "Donation_kind_status_hiddenOnWall_confirmedAt_idx" ON "Donation"("kind", "status", "hiddenOnWall", "confirmedAt");
