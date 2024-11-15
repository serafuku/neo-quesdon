export interface AnswerDto {
  id: string;
  question: string;
  questioner: string | null;
  answer: string;
  answeredAt: Date;
  answeredPersonHandle: string;
  nsfwedAnswer: boolean;
}
