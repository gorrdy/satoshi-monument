-- CreateTable
CREATE TABLE "FioPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fioId" TEXT NOT NULL,
    "date" TEXT,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "vs" TEXT,
    "message" TEXT,
    "payerName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'unmatched',
    "donationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "FioPayment_fioId_key" ON "FioPayment"("fioId");

-- CreateIndex
CREATE INDEX "FioPayment_status_idx" ON "FioPayment"("status");
