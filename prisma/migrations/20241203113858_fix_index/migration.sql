-- DropIndex
DROP INDEX "blocking_blockerHandle_blockeeHandle_hidden_createdAt_idx";

-- DropIndex
DROP INDEX "following_followeeHandle_followerHandle_idx";

-- CreateIndex
CREATE INDEX "blocking_blockerHandle_hidden_idx" ON "blocking"("blockerHandle", "hidden");

-- CreateIndex
CREATE INDEX "blocking_blockeeHandle_hidden_idx" ON "blocking"("blockeeHandle", "hidden");

-- CreateIndex
CREATE INDEX "following_followeeHandle_idx" ON "following"("followeeHandle");

-- CreateIndex
CREATE INDEX "following_followerHandle_idx" ON "following"("followerHandle");
