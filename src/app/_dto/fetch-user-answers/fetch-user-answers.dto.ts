import { IsEnum, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class FetchUserAnswersDto {
  @IsOptional()
  @IsString()
  sinceId?: string;

  @IsOptional()
  @IsString()
  untilId?: string;

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sort?: 'ASC' | 'DESC';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsString()
  @IsNotEmpty()
  answeredPersonHandle: string;
}
