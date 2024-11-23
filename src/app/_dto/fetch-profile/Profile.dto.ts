import { $Enums } from '@prisma/client';
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

export interface userProfileMeDto extends userProfileDto {
  questions: number | null;
  instanceType: $Enums.InstanceType;
}

export interface userProfileWithHostnameDto extends userProfileDto {
  hostname: string;
  instanceType: $Enums.InstanceType;
}
