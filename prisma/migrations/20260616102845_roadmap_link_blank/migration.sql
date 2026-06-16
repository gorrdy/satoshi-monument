-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RoadmapItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "dateLabel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "linkUrl" TEXT,
    "linkBlank" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_RoadmapItem" ("createdAt", "dateLabel", "detail", "id", "linkUrl", "order", "status", "title", "updatedAt") SELECT "createdAt", "dateLabel", "detail", "id", "linkUrl", "order", "status", "title", "updatedAt" FROM "RoadmapItem";
DROP TABLE "RoadmapItem";
ALTER TABLE "new_RoadmapItem" RENAME TO "RoadmapItem";
CREATE INDEX "RoadmapItem_order_idx" ON "RoadmapItem"("order");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
