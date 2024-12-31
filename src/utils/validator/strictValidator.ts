import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Logger } from '@/utils/logger/Logger';

const logger = new Logger('validator');
export async function validateStrict<T extends object>(cls: ClassConstructor<T>, data: unknown): Promise<T> {
  if (typeof data !== 'object') {
    logger.error('data is not object!');
    throw new Error(`data is not object!`);
  }
  const instance = plainToInstance(cls, data);
  const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
  if (errors.length > 0) {
    throw errors;
  }
  return instance;
}
