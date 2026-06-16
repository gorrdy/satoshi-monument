-- CreateIndex
CREATE INDEX "Donation_status_hiddenOnWall_confirmedAt_idx" ON "Donation"("status", "hiddenOnWall", "confirmedAt");
