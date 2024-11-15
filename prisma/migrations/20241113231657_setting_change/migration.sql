-- AlterTable
ALTER TABLE "profile" ADD COLUMN     "stopNotiNewQuestion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stopPostAnswer" BOOLEAN NOT NULL DEFAULT false;
