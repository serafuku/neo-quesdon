-- AlterTable
ALTER TABLE "profile" ADD COLUMN     "wordMuteList" TEXT[] DEFAULT ARRAY[]::TEXT[];
