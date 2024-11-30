-- CreateTable
CREATE TABLE "blocking" (
    "id" TEXT NOT NULL,
    "blockeeHandle" VARCHAR(500) NOT NULL,
    "blockerHandle" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hidden" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "blocking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blocking_blockerHandle_blockeeHandle_hidden_createdAt_idx" ON "blocking"("blockerHandle", "blockeeHandle", "hidden", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "blocking_blockeeHandle_blockerHandle_hidden_key" ON "blocking"("blockeeHandle", "blockerHandle", "hidden");

-- AddForeignKey
ALTER TABLE "blocking" ADD CONSTRAINT "blocking_blockerHandle_fkey" FOREIGN KEY ("blockerHandle") REFERENCES "user"("handle") ON DELETE CASCADE ON UPDATE CASCADE;
