-- CreateEnum
CREATE TYPE "InstanceType" AS ENUM ('mastodon', 'misskey', 'cherrypick');

-- AlterTable
ALTER TABLE "server" ADD COLUMN     "instanceType" "InstanceType" NOT NULL DEFAULT 'misskey';
