import { $Enums } from '@prisma/client';
export interface userProfileDto {
  handle: string;
  name: string[];
  stopNewQuestion: boolean;
  stopAnonQuestion: boolean;
  stopNotiNewQuestion: boolean;
  avatarUrl: string;
  questionBoxName: string;
  hostname: string;
  instanceType: $Enums.InstanceType;
}

export interface userProfileMeDto extends userProfileDto {
  questions: number | null;
  instanceType: $Enums.InstanceType;
  defaultPostVisibility: $Enums.PostVisibility;
  stopPostAnswer: boolean;
  wordMuteList: string[];
}
