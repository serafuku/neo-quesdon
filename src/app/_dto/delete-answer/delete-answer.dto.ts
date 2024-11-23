import { IsString } from 'class-validator';

export class DeleteAnswerDto {
  @IsString()
  id: string;
}
