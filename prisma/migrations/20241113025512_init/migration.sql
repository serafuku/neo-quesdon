-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "account" TEXT NOT NULL,
    "accountLower" TEXT NOT NULL,
    "hostName" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "name" TEXT[],
    "token" TEXT NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile" (
    "id" SERIAL NOT NULL,
    "account" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "name" TEXT[],
    "stopNewQuestion" BOOLEAN NOT NULL DEFAULT false,
    "stopAnonQuestion" BOOLEAN NOT NULL DEFAULT false,
    "avatarUrl" TEXT NOT NULL,
    "questionBoxName" TEXT NOT NULL DEFAULT '질문함',

    CONSTRAINT "profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "questioner" TEXT,
    "answer" TEXT NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredPersonHandle" TEXT NOT NULL,
    "nsfwedAnswer" BOOLEAN NOT NULL,

    CONSTRAINT "answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question" (
    "id" SERIAL NOT NULL,
    "question" TEXT NOT NULL,
    "questioner" TEXT,
    "questioneeHandle" TEXT NOT NULL,
    "questionedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "server" (
    "id" SERIAL NOT NULL,
    "instances" TEXT NOT NULL,
    "appSecret" TEXT NOT NULL,

    CONSTRAINT "server_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_handle_key" ON "user"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "profile_handle_key" ON "profile"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "server_instances_key" ON "server"("instances");

-- CreateIndex
CREATE UNIQUE INDEX "server_appSecret_key" ON "server"("appSecret");

-- AddForeignKey
ALTER TABLE "profile" ADD CONSTRAINT "profile_handle_fkey" FOREIGN KEY ("handle") REFERENCES "user"("handle") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer" ADD CONSTRAINT "answer_answeredPersonHandle_fkey" FOREIGN KEY ("answeredPersonHandle") REFERENCES "profile"("handle") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question" ADD CONSTRAINT "question_questioneeHandle_fkey" FOREIGN KEY ("questioneeHandle") REFERENCES "profile"("handle") ON DELETE RESTRICT ON UPDATE CASCADE;
