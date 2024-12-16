import { userProfileDto } from '../fetch-profile/Profile.dto';

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
  answeredPerson?: userProfileDto;
}

export interface AnswerListWithProfileDto {
  answersList: AnswerWithProfileDto[];
}
