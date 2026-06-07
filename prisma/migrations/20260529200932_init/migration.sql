-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "amountBtc" REAL,
    "publicMessage" TEXT,
    "privateMessage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "hiddenOnWall" BOOLEAN NOT NULL DEFAULT false,
    "btcpayInvoiceId" TEXT,
    "variableSymbol" TEXT,
    "confirmedAt" DATETIME
);

-- CreateIndex
CREATE INDEX "Donation_status_idx" ON "Donation"("status");

-- CreateIndex
CREATE INDEX "Donation_createdAt_idx" ON "Donation"("createdAt");
