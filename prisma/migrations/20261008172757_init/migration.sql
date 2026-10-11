-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pickupAddress" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "foodType" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "quantityUnit" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'broadcasting',
    "selectedNgoId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Donation_status_createdAt_idx" ON "Donation"("status", "createdAt");
