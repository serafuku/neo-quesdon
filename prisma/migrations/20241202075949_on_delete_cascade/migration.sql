-- DropForeignKey
ALTER TABLE "answer" DROP CONSTRAINT "answer_answeredPersonHandle_fkey";

-- DropForeignKey
ALTER TABLE "profile" DROP CONSTRAINT "profile_handle_fkey";

-- DropForeignKey
ALTER TABLE "question" DROP CONSTRAINT "question_questioneeHandle_fkey";

-- DropForeignKey
ALTER TABLE "user" DROP CONSTRAINT "user_hostName_fkey";

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_hostName_fkey" FOREIGN KEY ("hostName") REFERENCES "server"("instances") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile" ADD CONSTRAINT "profile_handle_fkey" FOREIGN KEY ("handle") REFERENCES "user"("handle") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer" ADD CONSTRAINT "answer_answeredPersonHandle_fkey" FOREIGN KEY ("answeredPersonHandle") REFERENCES "profile"("handle") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question" ADD CONSTRAINT "question_questioneeHandle_fkey" FOREIGN KEY ("questioneeHandle") REFERENCES "profile"("handle") ON DELETE CASCADE ON UPDATE CASCADE;
