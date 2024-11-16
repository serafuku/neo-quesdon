import { ClassConstructor, plainToInstance } from "class-transformer";
import { validate } from "class-validator";

export async function validateStrict<T extends object>(cls: ClassConstructor<T>, data: unknown): Promise<T> {
    if (typeof data !== 'object') {
        console.error('data is not object!');
        throw new Error(`data is not object!`);
    }
    const instance = plainToInstance(cls, data);
    const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length > 0) {
        console.error(errors);
        throw errors;
    }
    return instance;
}