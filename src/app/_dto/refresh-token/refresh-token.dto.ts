import { IsInt, IsString } from "class-validator";

export class RefreshTokenReqDto {
  @IsString()
  /** 사실 꼭 필요하진 않은데 디버깅용... */
  handle: string;

  @IsInt()
  last_refreshed_time: number;
}