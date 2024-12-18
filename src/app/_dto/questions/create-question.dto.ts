import { IsBoolean, IsString, MaxLength } from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  @MaxLength(1000)
  question: string;

  @IsBoolean()
  isAnonymous: boolean;

  @IsString()
  questionee: string;
}
