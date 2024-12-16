import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class FetchAllAnswersReqDto {
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
  @Transform((params) => {
    if (typeof params.value === 'string') {
      return parseInt(params.value, 10);
    }
    return params.value;
  })
  @Min(1)
  @Max(100)
  limit?: number;
}
