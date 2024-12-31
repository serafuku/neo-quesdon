import { Expose } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

export class jwtPayloadType {
  @IsString()
  @Expose()
  handle: string;

  @Expose()
  @IsString()
  server: string;

  @Expose()
  @IsNumber()
  jwtIndex: number;
}
