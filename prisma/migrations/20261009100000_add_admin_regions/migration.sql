ALTER TABLE "Donation" ADD COLUMN "region" TEXT NOT NULL DEFAULT 'Unassigned';

ALTER TABLE "NgoAccount" ADD COLUMN "region" TEXT NOT NULL DEFAULT 'Unassigned';
ALTER TABLE "NgoAccount" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Donation_region_status_idx" ON "Donation"("region", "status");