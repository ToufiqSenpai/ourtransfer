import { Test } from '@nestjs/testing'
import { SignupHandler } from './signup.handler'
import { SignupCommand } from '../signup.command'
import { CommonResponseDto, SignupDto } from '@ourtransfer/dto'
import { Mapper } from '@automapper/core';
import { getMapperToken } from '@automapper/nestjs'
import { mock, MockProxy } from 'jest-mock-extended'
import {
  PASSWORD_HASHER,
  PasswordHasher,
} from '../../../../../common/interfaces/security/hash/password-hasher.interface'
import {
  PASSWORD_IDENTITY_REPOSITORY,
  PasswordIdentityRepository,
} from '../../../domain/repositories/password-identity.repository'
import { PasswordIdentity } from '../../../domain/entities/password-identity.entity'
import { USER_REPOSITORY, UserRepository } from '../../../../user/domain/repositories/user.repository'
import { User } from '../../../../user/domain/entities/user.entity'
import { plainToInstance } from 'class-transformer'
import { faker } from '@faker-js/faker'

describe('SignupHandler', () => {
  let handler: SignupHandler
  let mapper: MockProxy<Mapper>
  let passwordHasher: MockProxy<PasswordHasher>
  let passwordIdentityRepository: MockProxy<PasswordIdentityRepository>
  let userRepository: MockProxy<UserRepository>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SignupHandler,
        {
          provide: getMapperToken(),
          useValue: mock<Mapper>(),
        },
        {
          provide: PASSWORD_HASHER,
          useValue: mock<PasswordHasher>(),
        },
        {
          provide: PASSWORD_IDENTITY_REPOSITORY,
          useValue: mock<PasswordIdentityRepository>(),
        },
        {
          provide: USER_REPOSITORY,
          useValue: mock<UserRepository>(),
        },
      ],
    }).compile()

    handler = module.get(SignupHandler)
    mapper = module.get(getMapperToken())
    passwordHasher = module.get(PASSWORD_HASHER)
    passwordIdentityRepository = module.get(PASSWORD_IDENTITY_REPOSITORY)
    userRepository = module.get(USER_REPOSITORY)
  })

  it('should be defined', () => {
    expect(handler).toBeDefined()
  })

  describe('execute', () => {
    it('should create a user and password identity successfully', async () => {
      // Arrange
      const signupDto = plainToInstance(SignupDto, {
        email: faker.internet.email(),
        password: faker.internet.password(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
      })
      const command = new SignupCommand(signupDto)

      const user = new User()
      const hashedPassword = faker.internet.password()

      // @ts-ignore
      mapper.map.calledWith(command.dto, SignupDto, User).mockReturnValue(user)
      passwordHasher.hash.mockResolvedValue(hashedPassword)

      // Act
      const result = await handler.execute(command)

      // Assert
      expect(userRepository.create).toHaveBeenCalledWith(user)
      expect(passwordHasher.hash).toHaveBeenCalledWith(signupDto.password)

      const expectedPasswordIdentity = new PasswordIdentity()
      expectedPasswordIdentity.email = signupDto.email
      expectedPasswordIdentity.passwordHash = hashedPassword
      expect(passwordIdentityRepository.create).toHaveBeenCalledWith(expectedPasswordIdentity)

      expect(result).toEqual(
        plainToInstance(CommonResponseDto, {
          message: 'The user has been created successfully.',
        }),
      )
    })
  })
})
