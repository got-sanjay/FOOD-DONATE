CREATE TABLE "DonationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "donationId" TEXT NOT NULL,
    "foodType" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "quantityUnit" TEXT NOT NULL,
    CONSTRAINT "DonationItem_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "Donation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "DonationItem_donationId_idx" ON "DonationItem"("donationId");
