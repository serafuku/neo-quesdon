import { userProfileDto } from '@/app/_dto/fetch-profile/Profile.dto';
import { $Enums, profile } from '@prisma/client';

export function profileToDto(profile: profile, hostName: string, instanceType: $Enums.InstanceType): userProfileDto {
  const data: userProfileDto = {
    handle: profile.handle,
    name: profile.name,
    stopNewQuestion: profile.stopNewQuestion,
    stopAnonQuestion: profile.stopAnonQuestion,
    stopNotiNewQuestion: profile.stopNotiNewQuestion,
    avatarUrl: profile.avatarUrl,
    questionBoxName: profile.questionBoxName,
    hostname: hostName,
    instanceType: instanceType,
    announcement: profile.announcement,
  };
  return data;
}
