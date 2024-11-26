import { IsBoolean, IsEnum, IsString, MaxLength } from "class-validator";
import { $Enums } from "@prisma/client";

export class createAnswerDto {
  @IsString()
  @MaxLength(2000)
  answer: string;

  @IsBoolean()
  nsfwedAnswer: boolean;

  @IsEnum($Enums.PostVisibility)
  visibility: $Enums.PostVisibility;
}
