import { IsArray, IsBoolean, IsOptional, IsString, ValidateIf } from 'class-validator';

class mastodonEmojiModel {
  @IsString()
  shortcode: string;

  @IsString()
  url: string;

  @IsString()
  static_url: string;

  @IsBoolean()
  visible_in_picker: boolean;
}

export class fetchNameWithEmojiReqDto {
  @ValidateIf((o, v) => v !== null)
  @IsString()
  name: string | null;

  @IsString()
  baseUrl: string;

  /** 마스토돈의 경우 닉네임에 들어간 커모지를
  배열로 따로 주기 때문에 그것에 대한 Validation이 필요함
  */
  @IsArray()
  @IsOptional()
  emojis: mastodonEmojiModel[] | null;
}

export interface fetchNameWithEmojiResDto {
  //Name array with emoji
  nameWithEmoji: string[];
}
