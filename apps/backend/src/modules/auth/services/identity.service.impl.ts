import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { IDENTITY_REPOSITORY, IdentityRepository } from '../repositories/identity.repository';
import { plainToInstance } from 'class-transformer';
import { CommonResponseDto } from '@ourtransfer/dto';

@Injectable()
export class IdentityServiceImpl implements IdentityService {
  public constructor(@Inject(IDENTITY_REPOSITORY) private readonly identityRepository: IdentityRepository) {}

  public async throwIfIdentityExists(userEmail: string): Promise<void | never> {
    const identity = await this.identityRepository.findByUserEmail(userEmail)

    if (identity) {
      throw new ConflictException(plainToInstance(CommonResponseDto, {
        message: `This account is already linked with ${identity.authProvider} authentication provider.`,
      }))
    }
  }
}
