/*
  Warnings:

  - A unique constraint covering the columns `[blockeeHandle,blockerHandle,hidden,imported]` on the table `blocking` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "blocking_blockeeHandle_blockerHandle_hidden_key";

-- AlterTable
ALTER TABLE "blocking" ADD COLUMN     "imported" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "blocking_imported_idx" ON "blocking"("imported");

-- CreateIndex
CREATE UNIQUE INDEX "blocking_blockeeHandle_blockerHandle_hidden_imported_key" ON "blocking"("blockeeHandle", "blockerHandle", "hidden", "imported");
