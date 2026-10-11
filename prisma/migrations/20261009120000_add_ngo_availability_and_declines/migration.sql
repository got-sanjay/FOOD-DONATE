ALTER TABLE "NgoAccount" ADD COLUMN "availability" TEXT NOT NULL DEFAULT 'available';

CREATE TABLE "NgoRequestDecline" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "donationId" TEXT NOT NULL,
    "ngoId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NgoRequestDecline_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "Donation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NgoRequestDecline_ngoId_fkey" FOREIGN KEY ("ngoId") REFERENCES "NgoAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "NgoRequestDecline_donationId_ngoId_key" ON "NgoRequestDecline"("donationId", "ngoId");
CREATE INDEX "NgoRequestDecline_ngoId_createdAt_idx" ON "NgoRequestDecline"("ngoId", "createdAt");