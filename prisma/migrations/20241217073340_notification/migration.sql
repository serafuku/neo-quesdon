-- CreateEnum
CREATE TYPE "NotiType" AS ENUM ('answer_on_my_question');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userHandle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "notiType" "NotiType" NOT NULL,
    "data" TEXT NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_read_idx" ON "Notification"("read");

-- CreateIndex
CREATE INDEX "Notification_notiType_idx" ON "Notification"("notiType");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userHandle_fkey" FOREIGN KEY ("userHandle") REFERENCES "user"("handle") ON DELETE CASCADE ON UPDATE CASCADE;
