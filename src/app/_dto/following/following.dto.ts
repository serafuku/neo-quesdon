import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { userProfileDto } from '@/app/_dto/fetch-profile/Profile.dto';

export class FollowingListReqDto {
  @IsOptional()
  @IsNumber()
  @Max(100)
  @Min(1)
  limit?: number;
}

export class following {
  follweeHandle: string;
  followerHandle: string;
  follweeProfile: userProfileDto;
}
export class FollowingListResDto {
  followingList: following[];
}
