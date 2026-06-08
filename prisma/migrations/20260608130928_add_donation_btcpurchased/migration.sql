-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Donation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "amountBtc" REAL,
    "publicMessage" TEXT,
    "privateMessage" TEXT,
    "imageUrl" TEXT,
    "imageBg" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "hiddenOnWall" BOOLEAN NOT NULL DEFAULT false,
    "btcPurchased" BOOLEAN NOT NULL DEFAULT false,
    "btcpayInvoiceId" TEXT,
    "variableSymbol" TEXT,
    "paymentRef" TEXT,
    "donorKey" TEXT,
    "confirmedAt" DATETIME
);
INSERT INTO "new_Donation" ("amount", "amountBtc", "btcpayInvoiceId", "confirmedAt", "createdAt", "currency", "donorKey", "hiddenOnWall", "id", "imageBg", "imageUrl", "name", "paymentRef", "privateMessage", "publicMessage", "status", "variableSymbol") SELECT "amount", "amountBtc", "btcpayInvoiceId", "confirmedAt", "createdAt", "currency", "donorKey", "hiddenOnWall", "id", "imageBg", "imageUrl", "name", "paymentRef", "privateMessage", "publicMessage", "status", "variableSymbol" FROM "Donation";
DROP TABLE "Donation";
ALTER TABLE "new_Donation" RENAME TO "Donation";
CREATE INDEX "Donation_status_idx" ON "Donation"("status");
CREATE INDEX "Donation_createdAt_idx" ON "Donation"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
