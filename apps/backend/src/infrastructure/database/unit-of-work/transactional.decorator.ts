import { ProviderUtil } from '../../utils/provider.util';
import { UnitOfWork, UNIT_OF_WORK } from './unit-of-work.interface';
import { NodeEnv } from '@ourtransfer/common';

export const TRANSACTIONAL_METADATA_KEY = 'transactional';

/**
 * Decorator that marks a method to be executed within a database transaction.
 * This decorator wraps the method execution in a database transaction using the Unit of Work pattern.
 *
 * Uses ProviderUtil to get the UnitOfWork instance, so classes don't need to inject it manually.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   @Transactional()
 *   async createUserWithProfile(userData: CreateUserDto): Promise<User> {
 *     const user = await this.userRepository.create(userData);
 *     await this.profileRepository.create({ userId: user.id });
 *     return user;
 *   }
 * }
 * ```
 */
export function Transactional(): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]): Promise<any> {
      try {
        const unitOfWork = ProviderUtil.get<UnitOfWork>(UNIT_OF_WORK);

        return unitOfWork.transaction(async () => {
          return originalMethod.apply(this, args);
        });
      } catch (error) {
        if (process.env.NODE_ENV === NodeEnv.TEST) {
          return originalMethod.apply(this, args);
        } else {
          throw new Error(
            `@Transactional decorator could not get UnitOfWork instance: ${(error as Error).message}. ` +
            `Make sure ProviderUtil is properly initialized and UnitOfWork is registered.`
          );
        }
      }
    };

    return descriptor;
  };
}
