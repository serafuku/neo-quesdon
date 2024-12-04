import { IsString } from 'class-validator';

export class AccountCleanReqDto {
  @IsString()
  handle: string;
}
