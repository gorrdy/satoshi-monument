-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "path" TEXT NOT NULL,
    "locale" TEXT,
    "referrer" TEXT,
    "device" TEXT NOT NULL,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "visitorHash" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "PageView_createdAt_idx" ON "PageView"("createdAt");

-- CreateIndex
CREATE INDEX "PageView_isBot_idx" ON "PageView"("isBot");
