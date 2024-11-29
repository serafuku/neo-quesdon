import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class CreateBlockDto {
  @IsString()
  @MaxLength(500)
  targetHandle: string;
}


export class Block {
  id: string;
  targetHandle: string;
  blockedAt: Date;
}

export class GetBlockListReqDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  untilId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sinceId?: string;

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sort?: 'ASC' | 'DESC';
}

export class GetBlockListResDto {
  blockList: Block[];
}

export class DeleteBlockDto {
  @IsString()
  @MaxLength(500)
  targetHandle: string;
}