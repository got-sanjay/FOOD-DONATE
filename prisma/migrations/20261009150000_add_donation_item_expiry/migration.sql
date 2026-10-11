CREATE TABLE "new_DonationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "donationId" TEXT NOT NULL,
    "foodType" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "quantityUnit" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "DonationItem_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "Donation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_DonationItem" ("id", "donationId", "foodType", "quantity", "quantityUnit", "expiresAt")
SELECT "DonationItem"."id", "DonationItem"."donationId", "DonationItem"."foodType", "DonationItem"."quantity", "DonationItem"."quantityUnit", "Donation"."expiresAt"
FROM "DonationItem"
INNER JOIN "Donation" ON "Donation"."id" = "DonationItem"."donationId";

DROP TABLE "DonationItem";
ALTER TABLE "new_DonationItem" RENAME TO "DonationItem";
CREATE INDEX "DonationItem_donationId_idx" ON "DonationItem"("donationId");
