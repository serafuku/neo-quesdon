import { userProfileDto } from '../fetch-profile/Profile.dto';

export class AnswerDto {
  id: string;
  question: string;
  questioner: string | null;
  answer: string;
  answeredAt: Date;
  answeredPersonHandle: string;
  nsfwedAnswer: boolean;
}

export class AnswerWithProfileDto extends AnswerDto {
  answeredPerson?: userProfileDto;
}

export interface AnswerListWithProfileDto {
  answersList: AnswerWithProfileDto[];
}
