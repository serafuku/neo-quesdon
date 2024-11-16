import type { profile, user } from "@prisma/client";
import { User } from "./api/misskey-entities/user";

export interface callbackTokenClaimPayload {
  //Misskey Access key 를 요청할 misskey의 host (예: serafuku.moe)
  misskeyHost: string;

  //callback으로 받은 토큰
  callback_token: string;
}
export interface userInfoPayload {
  user: User;
}

export interface questions {
  id: number;
  question: string;
  questioner: string | null;
  questionee: profile;
  questioneeHandle: string;
  questionedAt: Date;
}

export interface typedAnswer {
  question: string;
  questioner: string | null;
  answer: string;
  answeredPersonHandle: string;
  nsfwedAnswer: boolean;
  visibility: "public" | "home" | "followers";
}

export interface MkNoteAnswers {
  cw: string;
  text: string;
  visibility: "public" | "home" | "followers";
}

export interface postQuestion {
  question: string;
  questioner: string;
  answer: string;
  answeredPerson: user;
  answeredPersonHandle: string;
}
