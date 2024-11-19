export interface userProfileDto {
  handle: string;
  name: string[];
  stopNewQuestion: boolean;
  stopAnonQuestion: boolean;
  stopNotiNewQuestion: boolean;
  stopPostAnswer: boolean;
  avatarUrl: string;
  questionBoxName: string;
}

export interface userProfileWithCountDto extends userProfileDto {
  questions: number | null;
}

export interface userProfileWithHostnameDto extends userProfileDto {
  hostname: string;
}
