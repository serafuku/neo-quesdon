import { blocking, question } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateBlockDto {
  @IsString()
  @MaxLength(500)
  targetHandle: string;
}
export class createBlockByQuestionDto {
  @IsInt()
  questionId: question['id'];
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

export class SearchBlockListReqDto {
  @IsString()
  targetHandle: string;
}

export class SearchBlockListResDto {
  @IsBoolean()
  isBlocked: boolean;
}

export class DeleteBlockDto {
  @IsString()
  @MaxLength(500)
  targetHandle: string;
}

export class DeleteBlockByIdDto {
  @IsString()
  @MaxLength(200)
  targetId: blocking['id'];
}
