import { profile } from '@prisma/client';

export interface AnswerDto {
  id: string;
  question: string;
  questioner: string | null;
  answer: string;
  answeredAt: Date;
  answeredPersonHandle: string;
  nsfwedAnswer: boolean;
}

export interface AnswerWithProfileDto extends AnswerDto {
  answeredPerson?: profile;
}

export interface AnswerListWithProfileDto {
  answersList: AnswerWithProfileDto[];
}
