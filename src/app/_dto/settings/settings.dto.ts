import { IsBoolean, IsOptional, IsString } from "class-validator";


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
  questionBoxName?: string;
}
