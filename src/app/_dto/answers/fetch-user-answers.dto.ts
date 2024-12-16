import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

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
  @Transform((param) => {
    if (typeof param.value === 'string') {
      return parseInt(param.value, 10);
    }
    return param.value;
  })
  limit?: number;
}
