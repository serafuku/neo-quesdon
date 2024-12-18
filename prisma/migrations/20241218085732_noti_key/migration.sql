/*
 */
-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "notiKey" TEXT;

UPDATE "Notification"
SET
    "notiKey" = (gen_random_uuid ())
WHERE
    "notiKey" IS NULL;

ALTER TABLE "Notification" ALTER COLUMN "notiKey" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Notification_notiKey_key" ON "Notification" ("notiKey");