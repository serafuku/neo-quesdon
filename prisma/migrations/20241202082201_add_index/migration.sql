-- CreateIndex
CREATE INDEX "answer_answeredPersonHandle_idx" ON "answer"("answeredPersonHandle");

-- CreateIndex
CREATE INDEX "question_questioneeHandle_idx" ON "question"("questioneeHandle");

-- CreateIndex
CREATE INDEX "server_instances_idx" ON "server"("instances");
