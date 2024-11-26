-- CreateEnum
CREATE TYPE "PostVisibility" AS ENUM ('public', 'home', 'followers');

-- AlterTable
ALTER TABLE "profile" ADD COLUMN     "defaultPostVisibility" "PostVisibility" NOT NULL DEFAULT 'public';
