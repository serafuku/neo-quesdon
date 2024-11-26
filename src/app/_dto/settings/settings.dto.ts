import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { $Enums } from "@prisma/client";


export class UserSettingsDto {
  @IsBoolean()
  stopAnonQuestion: boolean;
  @IsBoolean()
  stopNewQuestion: boolean;
  @IsBoolean()
  stopNotiNewQuestion: boolean;
  @IsBoolean()
  stopPostAnswer: boolean;
  @IsString()
  questionBoxName: string;
}

export class UserSettingsUpdateDto {
  @IsOptional()
  @IsBoolean()
  stopAnonQuestion?: boolean;

  @IsOptional()
  @IsBoolean()
  stopNewQuestion?: boolean;

  @IsOptional()
  @IsBoolean()
  stopNotiNewQuestion?: boolean;

  @IsOptional()
  @IsBoolean()
  stopPostAnswer?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  questionBoxName?: string;
  
  @IsOptional()
  @IsEnum($Enums.PostVisibility)
  defaultPostVisibility: $Enums.PostVisibility;
}
