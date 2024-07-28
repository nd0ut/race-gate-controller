/*
  Warnings:

  - You are about to drop the column `date` on the `RaceEvent` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RaceEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL,
    "name" TEXT NOT NULL
);
INSERT INTO "new_RaceEvent" ("createdAt", "id", "isActive", "name") SELECT "createdAt", "id", "isActive", "name" FROM "RaceEvent";
DROP TABLE "RaceEvent";
ALTER TABLE "new_RaceEvent" RENAME TO "RaceEvent";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
