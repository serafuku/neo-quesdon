export interface CreateQuestionDto {
  question: string;
  questioner: string | null;
  questionee: string;
}
