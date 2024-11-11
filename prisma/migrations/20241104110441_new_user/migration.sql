-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "accountLower" TEXT NOT NULL,
    "hostName" TEXT,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "questionBoxName" TEXT NOT NULL DEFAULT '질문함',
    "stopNewQuestion" BOOLEAN DEFAULT false,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);
