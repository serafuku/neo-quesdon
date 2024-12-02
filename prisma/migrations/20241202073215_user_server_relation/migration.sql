-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_hostName_fkey" FOREIGN KEY ("hostName") REFERENCES "server"("instances") ON DELETE RESTRICT ON UPDATE CASCADE;
