import { ApiErrorTypes } from '@/app/_dto/api-error/apiErrorTypes';

export class ApiErrorResponseDto {
  error_type: ApiErrorTypes;
  message: string | string[];
}
