import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class FollowingListReqDto {
  @IsOptional()
  @IsNumber()
  @Max(100)
  @Min(1)
  limit: number;
}

class following {
  follweeHandle: string;
  followerHandle: string;
}
export class FollowingListResDto {
  followingList: following[];
}
