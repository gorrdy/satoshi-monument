-- CreateTable
CREATE TABLE "DonorProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "donorKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "imageBg" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "DonorProfile_donorKey_key" ON "DonorProfile"("donorKey");
