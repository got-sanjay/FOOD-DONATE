-- DEVELOPMENT ONLY: this script permanently replaces all NGO and donation data.
-- Back up local data first. Never run this against a shared or production database.

BEGIN IMMEDIATE;

DELETE FROM "NgoRequestDecline";
DELETE FROM "DonationItem";
DELETE FROM "Donation";
DELETE FROM "NgoAccount";

WITH
  regions(region, latitude, longitude) AS (
    VALUES
      ('Erode', 11.3410, 77.7172),
      ('MANAPPARAI TALUK', 10.6070, 78.4250),
      ('Mothaiyanoor', 11.2000, 77.8000),
      ('Perundurai', 11.2750, 77.5830),
      ('Salem', 11.6643, 78.1460),
      ('Test Region', 11.0000, 78.0000),
      ('Tiruchirappalli', 10.7905, 78.7047)
  ),
  slots(slot) AS (VALUES (1), (2), (3), (4), (5))
INSERT INTO "NgoAccount" (
  "id",
  "name",
  "nameKey",
  "passwordHash",
  "region",
  "isActive",
  "availability",
  "reviewStatus",
  "phone",
  "email",
  "address",
  "latitude",
  "longitude",
  "rating",
  "completedCount",
  "additionalNotes",
  "createdAt"
)
SELECT
  'seed_ngo_' || lower(replace(region, ' ', '_')) || '_' || printf('%02d', slot),
  printf('%s Community Rescue %02d', region, slot),
  lower(printf('%s Community Rescue %02d', region, slot)),
  'scrypt$482637c46311e4c7d2991d862fbb05ef$uMO3xZiaGY-zKLX7RtBcYK-do4en8CMQ4RL6QteKboX3gW1xdLzIjuuBR_3t0kYkP6ZZQzjOlewOgjk27J8e3A',
  region,
  1,
  CASE WHEN abs(random() % 5) = 0 THEN 'busy' ELSE 'available' END,
  'approved',
  '+91 90000' || printf('%05d', abs(random() % 100000)),
  'ngo.' || lower(replace(region, ' ', '_')) || '.' || printf('%02d', slot) || '@example.test',
  printf('%s Service Center %02d, Tamil Nadu', region, slot),
  latitude + (random() % 6001) / 100000.0,
  longitude + (random() % 6001) / 100000.0,
  4.0 + abs(random() % 101) / 100.0,
  abs(random() % 250),
  'Synthetic local development account.',
  datetime('now')
FROM regions
CROSS JOIN slots;

WITH
  regions(region, latitude, longitude) AS (
    VALUES
      ('Erode', 11.3410, 77.7172),
      ('MANAPPARAI TALUK', 10.6070, 78.4250),
      ('Mothaiyanoor', 11.2000, 77.8000),
      ('Perundurai', 11.2750, 77.5830),
      ('Salem', 11.6643, 78.1460),
      ('Test Region', 11.0000, 78.0000),
      ('Tiruchirappalli', 10.7905, 78.7047)
  ),
  slots(slot) AS (VALUES (1), (2), (3), (4))
INSERT INTO "Donation" (
  "id",
  "pickupAddress",
  "latitude",
  "longitude",
  "foodType",
  "quantity",
  "quantityUnit",
  "expiresAt",
  "status",
  "selectedNgoId",
  "region",
  "donorName",
  "donorContact",
  "donorNotes",
  "pickupOtp",
  "otpVerified",
  "completionPhoto",
  "greetingsSent",
  "createdAt",
  "updatedAt"
)
SELECT
  'seed_donation_' || lower(replace(region, ' ', '_')) || '_' || printf('%02d', slot),
  printf('%s Market, Sample Street %02d, Tamil Nadu', region, slot),
  latitude + (random() % 6001) / 100000.0,
  longitude + (random() % 6001) / 100000.0,
  CASE slot
    WHEN 1 THEN 'Cooked meals'
    WHEN 2 THEN 'Fresh vegetables'
    WHEN 3 THEN 'Bakery items'
    ELSE 'Rice and grains'
  END,
  10 + slot * 2,
  CASE WHEN slot IN (1, 3) THEN 'portions' ELSE 'kg' END,
  datetime('now', '+' || (36 + slot) || ' hours'),
  CASE slot
    WHEN 1 THEN 'broadcasting'
    WHEN 2 THEN 'accepted'
    WHEN 3 THEN 'in_progress'
    ELSE 'completed'
  END,
  CASE
    WHEN slot = 1 THEN NULL
    ELSE 'seed_ngo_' || lower(replace(region, ' ', '_')) || '_' || printf('%02d', slot)
  END,
  region,
  printf('Sample Donor %02d', slot),
  '+91 80000' || printf('%05d', abs(random() % 100000)),
  'Synthetic local development donation.',
  CASE WHEN slot = 1 THEN NULL ELSE printf('%06d', 100000 + abs(random() % 900000)) END,
  CASE WHEN slot >= 3 THEN 1 ELSE 0 END,
  NULL,
  CASE WHEN slot = 4 THEN 1 ELSE 0 END,
  datetime('now', '-' || (slot * 3) || ' hours'),
  datetime('now', '-' || (slot * 3) || ' hours')
FROM regions
CROSS JOIN slots;

WITH
  regions(region) AS (
    VALUES
      ('Erode'),
      ('MANAPPARAI TALUK'),
      ('Mothaiyanoor'),
      ('Perundurai'),
      ('Salem'),
      ('Test Region'),
      ('Tiruchirappalli')
  ),
  slots(slot) AS (VALUES (1), (2), (3), (4))
INSERT INTO "DonationItem" (
  "id",
  "donationId",
  "foodType",
  "quantity",
  "quantityUnit",
  "expiresAt"
)
SELECT
  'seed_item_' || lower(replace(region, ' ', '_')) || '_' || printf('%02d', slot),
  'seed_donation_' || lower(replace(region, ' ', '_')) || '_' || printf('%02d', slot),
  CASE slot
    WHEN 1 THEN 'Cooked meals'
    WHEN 2 THEN 'Fresh vegetables'
    WHEN 3 THEN 'Bakery items'
    ELSE 'Rice and grains'
  END,
  10 + slot * 2,
  CASE WHEN slot IN (1, 3) THEN 'portions' ELSE 'kg' END,
  datetime('now', '+' || (36 + slot) || ' hours')
FROM regions
CROSS JOIN slots;

COMMIT;
