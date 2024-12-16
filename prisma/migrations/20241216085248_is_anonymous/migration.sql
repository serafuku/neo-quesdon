/*
 * Migration
 */
-- AlterTable
ALTER TABLE "question" ADD COLUMN "isAnonymous" BOOLEAN;

UPDATE "question"
SET
    "isAnonymous" = CASE
        WHEN "questioner" IS NULL THEN TRUE
        ELSE FALSE
    END;

ALTER TABLE "question" ALTER COLUMN "isAnonymous" SET NOT NULL;