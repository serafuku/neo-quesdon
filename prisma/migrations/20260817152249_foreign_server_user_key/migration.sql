-- CreateTable
CREATE TABLE "ForeignServerUserKey" (
    "id" TEXT NOT NULL,
    "userHandle" TEXT NOT NULL,
    "serverDomain" TEXT NOT NULL,
    "userKey" TEXT NOT NULL,

    CONSTRAINT "ForeignServerUserKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ForeignServerUserKey_userHandle_idx" ON "ForeignServerUserKey"("userHandle");

-- CreateIndex
CREATE INDEX "ForeignServerUserKey_serverDomain_idx" ON "ForeignServerUserKey"("serverDomain");

-- CreateIndex
CREATE UNIQUE INDEX "ForeignServerUserKey_userHandle_serverDomain_key" ON "ForeignServerUserKey"("userHandle", "serverDomain");

-- AddForeignKey
ALTER TABLE "ForeignServerUserKey" ADD CONSTRAINT "ForeignServerUserKey_userHandle_fkey" FOREIGN KEY ("userHandle") REFERENCES "user"("handle") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForeignServerUserKey" ADD CONSTRAINT "ForeignServerUserKey_serverDomain_fkey" FOREIGN KEY ("serverDomain") REFERENCES "server"("instances") ON DELETE CASCADE ON UPDATE CASCADE;
