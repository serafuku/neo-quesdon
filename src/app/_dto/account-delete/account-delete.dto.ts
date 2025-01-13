import { IsString } from "class-validator";

export class AccountDeleteReqDto {
  @IsString()
  handle: string;
}