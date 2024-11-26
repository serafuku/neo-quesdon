import { IsString, MaxLength, ValidateIf } from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  @MaxLength(1000)
  question: string;

  @ValidateIf((o, v) => v)
  @IsString()
  questioner: string | null;

  @IsString()
  questionee: string;
}
