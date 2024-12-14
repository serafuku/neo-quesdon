import { IsBoolean, IsEnum, IsNumber, IsString, MaxLength } from 'class-validator';
import { $Enums } from '@prisma/client';

export class CreateAnswerDto {
  @IsNumber()
  questionId: number;

  @IsString()
  @MaxLength(2000)
  answer: string;

  @IsBoolean()
  nsfwedAnswer: boolean;

  @IsEnum($Enums.PostVisibility)
  visibility: $Enums.PostVisibility;
}
