export interface fetchNameWithEmojiReqDto {
  name: string | null;
  misskeyBaseUrl: string;
};

export interface fetchNameWithEmojiResDto {
  //Name array with emoji
  nameWithEmoji: string[];
}