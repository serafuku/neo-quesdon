import { IsString, ValidateIf } from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  question: string;

  @ValidateIf((o, v) => v)
  @IsString()
  questioner: string | null;

  @IsString()
  questionee: string;
}
