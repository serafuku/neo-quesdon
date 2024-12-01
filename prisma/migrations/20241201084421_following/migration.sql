-- CreateTable
CREATE TABLE "following" (
    "id" TEXT NOT NULL,
    "followerHandle" VARCHAR(500) NOT NULL,
    "followeeHandle" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "following_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "following_followeeHandle_followerHandle_idx" ON "following"("followeeHandle", "followerHandle");

-- CreateIndex
CREATE UNIQUE INDEX "following_followerHandle_followeeHandle_key" ON "following"("followerHandle", "followeeHandle");

-- AddForeignKey
ALTER TABLE "following" ADD CONSTRAINT "following_followerHandle_fkey" FOREIGN KEY ("followerHandle") REFERENCES "user"("handle") ON DELETE CASCADE ON UPDATE CASCADE;
