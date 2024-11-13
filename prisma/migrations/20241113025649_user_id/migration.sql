/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `user` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `user` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "user" ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "user_userId_key" ON "user"("userId");
