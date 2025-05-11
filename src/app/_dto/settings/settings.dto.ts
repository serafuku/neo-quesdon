import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { $Enums, profile } from '@prisma/client';

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
  defaultPostVisibility?: $Enums.PostVisibility;

  @IsOptional()
  @IsBoolean()
  defaultHideFromTimeline?: boolean;

  @IsArray()
  @IsString({ each: true })
  wordMuteList: profile['wordMuteList'];

  @IsString()
  @IsOptional()
  @MaxLength(80)
  announcement: profile['announcement'];
}
