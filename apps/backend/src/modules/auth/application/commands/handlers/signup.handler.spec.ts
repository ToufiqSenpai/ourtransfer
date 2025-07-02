import { Test } from '@nestjs/testing'
import { SignupHandler } from './signup.handler'
import { SignupCommand } from '../signup.command'
import { CommonResponseDto, SignupDto } from '@ourtransfer/dto'
import { Mapper, Dictionary, ModelIdentifier } from '@automapper/core';
import { getMapperToken } from '@automapper/nestjs'
import { mock, MockProxy } from 'jest-mock-extended'
import {
  PASSWORD_HASHER,
  PasswordHasher,
} from '../../../../../common/interfaces/security/hash/password-hasher.interface'
import {
  PASSWORD_AUTH_REPOSITORY,
  PasswordAuthRepository,
} from '../../../domain/repositories/password-auth.repository'
import { PasswordAuth } from '../../../domain/entities/password-auth.entity'
import { USER_REPOSITORY, UserRepository } from '../../../../user/domain/repositories/user.repository'
import { User } from '../../../../user/domain/entities/user.entity'
import { plainToInstance } from 'class-transformer'
import { faker } from '@faker-js/faker'

describe('SignupHandler', () => {
  let handler: SignupHandler
  let mapper: MockProxy<Mapper>
  let passwordHasher: MockProxy<PasswordHasher>
  let passwordAuthRepository: MockProxy<PasswordAuthRepository>
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
          provide: PASSWORD_AUTH_REPOSITORY,
          useValue: mock<PasswordAuthRepository>(),
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
    passwordAuthRepository = module.get(PASSWORD_AUTH_REPOSITORY)
    userRepository = module.get(USER_REPOSITORY)
  })

  it('should be defined', () => {
    expect(handler).toBeDefined()
  })

  describe('execute', () => {
    it('should create a user and password auth successfully', async () => {
      // Arrange
      const signupDto = plainToInstance(SignupDto, {
        email: faker.internet.email(),
        password: faker.internet.password(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
      })
      const command = new SignupCommand(signupDto)

      const user = new User()
      const passwordAuth = new PasswordAuth()
      passwordAuth.password = signupDto.password

      const hashedPassword = faker.internet.password()

      mapper.map.calledWith(command.dto as Dictionary<SignupDto>, SignupDto as ModelIdentifier<Dictionary<SignupDto>>, User as any).mockReturnValue(user as Dictionary<User>)
      mapper.map.calledWith(command.dto as Dictionary<SignupDto>, SignupDto as any, PasswordAuth as any).mockReturnValue(passwordAuth as any)
      passwordHasher.hash.mockResolvedValue(hashedPassword)

      // Act
      const result = await handler.execute(command)

      // Assert
      expect(userRepository.create).toHaveBeenCalledWith(user)
      expect(passwordHasher.hash).toHaveBeenCalledWith(signupDto.password)

      // const expectedPasswordAuth = { ...passwordAuth, password: hashedPassword };
      const expectedPasswordAuth = Object.assign(passwordAuth, { password: hashedPassword })
      expect(passwordAuthRepository.create).toHaveBeenCalledWith(expectedPasswordAuth)

      expect(result).toEqual(
        plainToInstance(CommonResponseDto, {
          message: 'User created successfully.',
        }),
      )
    })
  })
})
