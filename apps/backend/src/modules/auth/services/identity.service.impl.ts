import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { IDENTITY_REPOSITORY, IdentityRepository } from '../repositories/identity.repository';
import { plainToInstance } from 'class-transformer';
import { CommonResponseDto } from '@ourtransfer/dto';
import { AuthProvider } from '@ourtransfer/common';

@Injectable()
export class IdentityServiceImpl implements IdentityService {
  public constructor(@Inject(IDENTITY_REPOSITORY) private readonly identityRepository: IdentityRepository) {}

  public async throwIfIdentityExists(userEmail: string, exceptsProvider?: AuthProvider[]): Promise<void | never> {
    const identities = await this.identityRepository.findByUserEmail(userEmail)
      .then(idt => {
        if (exceptsProvider) {
          return idt.filter(identity => !exceptsProvider.includes(identity.authProvider))
        }
        return idt
      })

    if (identities.length > 0) {
      throw new ConflictException(plainToInstance(CommonResponseDto, {
        message:
        `This account is already signed up with ${identities.map(identity => identity.authProvider).join(', ')} authentication provider.`,
      }))
    }
  }
}
