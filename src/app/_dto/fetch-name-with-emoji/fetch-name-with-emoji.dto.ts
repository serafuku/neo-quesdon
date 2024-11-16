import { IsString, ValidateIf } from "class-validator";

export class fetchNameWithEmojiReqDto {
  @ValidateIf((o, v) => v !== null)
  @IsString()
  name: string | null;

  @IsString()
  misskeyBaseUrl: string;
};

export interface fetchNameWithEmojiResDto {
  //Name array with emoji
  nameWithEmoji: string[];
}