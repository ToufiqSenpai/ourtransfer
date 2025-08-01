import { Test } from '@nestjs/testing'
import { EventBus } from '@nestjs/cqrs'
import { SignupHandler } from './signup.handler'
import { SignupCommand } from '../signup.command'
import { CommonResponseDto, SignupDto } from '@ourtransfer/dto'
import { mock, MockProxy } from 'jest-mock-extended'
import { faker } from '@faker-js/faker'
import { Mapper } from '@automapper/core'
import { getMapperToken } from '@automapper/nestjs'
import { plainToInstance } from 'class-transformer'
import { PASSWORD_HASHER, PasswordHasher } from '../../../../infrastructure/security/hash/password-hasher.interface'
import { USER_REPOSITORY, UserRepository } from '../../../user/repositories/user.repository'
import { User } from '../../../user/entities/user.entity'
import { PASSWORD_IDENTITY_REPOSITORY, PasswordIdentityRepository } from '../../repositories/password-identity.repository'
import { PasswordIdentity } from '../../entities/password-identity.entity'
import { AuthProvider } from '@ourtransfer/common'
import { UNIT_OF_WORK, UnitOfWork } from '../../../../infrastructure/database/unit-of-work/unit-of-work.interface'
import { IDENTITY_SERVICE, IdentityService } from '../../services/identity.service'
import { UserSignedUpEvent } from '../../../user/events/user-signed-up.event'

describe('SignupHandler', () => {
  let handler: SignupHandler
  let mapper: MockProxy<Mapper>
  let passwordHasher: MockProxy<PasswordHasher>
  let identityService: MockProxy<IdentityService>
  let userRepository: MockProxy<UserRepository>
  let passwordIdentityRepository: MockProxy<PasswordIdentityRepository>
  let unitOfWork: MockProxy<UnitOfWork>
  let eventBus: MockProxy<EventBus>

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
          provide: IDENTITY_SERVICE,
          useValue: mock<IdentityService>(),
        },
        {
          provide: USER_REPOSITORY,
          useValue: mock<UserRepository>(),
        },
        {
          provide: PASSWORD_IDENTITY_REPOSITORY,
          useValue: mock<PasswordIdentityRepository>(),
        },
        {
          provide: UNIT_OF_WORK,
          useValue: mock<UnitOfWork>(),
        },
        {
          provide: EventBus,
          useValue: mock<EventBus>(),
        },
      ],
    }).compile()

    handler = module.get(SignupHandler)
    mapper = module.get(getMapperToken())
    passwordHasher = module.get(PASSWORD_HASHER)
    identityService = module.get(IDENTITY_SERVICE)
    userRepository = module.get(USER_REPOSITORY)
    passwordIdentityRepository = module.get(PASSWORD_IDENTITY_REPOSITORY)
    unitOfWork = module.get(UNIT_OF_WORK)
    eventBus = module.get(EventBus)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('execute', () => {
    const mockSignupDto: SignupDto = {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      password: faker.internet.password({ length: 10 }),
    }

    const mockUser = plainToInstance(User, {
      id: faker.string.uuid(),
      name: mockSignupDto.name,
      email: mockSignupDto.email,
      lastSignInAt: null,
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
    })

    const mockPasswordHash = faker.string.alphanumeric(60)
    let command: SignupCommand

    beforeEach(() => {
      command = new SignupCommand(mockSignupDto)
    })

    afterEach(() => {
      jest.resetAllMocks()
    })

    it('should successfully create a user and return success message', async () => {
      // Arrange
      identityService.throwIfIdentityExists.mockResolvedValue(undefined)
      mapper.map.mockReturnValue(mockUser as any)
      userRepository.save.mockResolvedValue(mockUser)
      passwordHasher.hash.mockResolvedValue(mockPasswordHash)
      passwordIdentityRepository.insert.mockResolvedValue(undefined)
      eventBus.publish.mockResolvedValue(undefined)
      unitOfWork.transaction.mockImplementation(async (callback) => {
        if (typeof callback === 'function') {
          return await callback()
        }
        throw new Error('Invalid transaction callback')
      })

      // Act
      const result = await handler.execute(command)

      // Assert
      expect(identityService.throwIfIdentityExists).toHaveBeenCalledWith(mockSignupDto.email)
      expect(identityService.throwIfIdentityExists).toHaveBeenCalledTimes(1)

      expect(unitOfWork.transaction).toHaveBeenCalledWith(expect.any(Function))
      expect(unitOfWork.transaction).toHaveBeenCalledTimes(1)

      expect(mapper.map).toHaveBeenCalledWith(mockSignupDto, SignupDto, User)
      expect(mapper.map).toHaveBeenCalledTimes(1)

      expect(userRepository.save).toHaveBeenCalledWith(mockUser)
      expect(userRepository.save).toHaveBeenCalledTimes(1)

      expect(passwordHasher.hash).toHaveBeenCalledWith(mockSignupDto.password)
      expect(passwordHasher.hash).toHaveBeenCalledTimes(1)

      expect(passwordIdentityRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUser,
          authProvider: AuthProvider.EMAIL_PASSWORD,
          passwordHash: mockPasswordHash,
        })
      )
      expect(passwordIdentityRepository.insert).toHaveBeenCalledTimes(1)

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUser,
        })
      )
      expect(eventBus.publish).toHaveBeenCalledTimes(1)

      expect(result).toBeInstanceOf(CommonResponseDto)
      expect(result.message).toBe('The user has been created successfully.')
    })

    it('should call identityService.throwIfIdentityExists before creating user', async () => {
      // Arrange
      identityService.throwIfIdentityExists.mockResolvedValue(undefined)
      mapper.map.mockReturnValue(mockUser as any)
      userRepository.save.mockResolvedValue(mockUser)
      passwordHasher.hash.mockResolvedValue(mockPasswordHash)
      passwordIdentityRepository.insert.mockResolvedValue(undefined)
      unitOfWork.transaction.mockImplementation(async (callback) => {
        if (typeof callback === 'function') {
          return await callback()
        }
        throw new Error('Invalid transaction callback')
      })

      // Act
      await handler.execute(command)

      // Assert
      expect(identityService.throwIfIdentityExists).toHaveBeenCalledWith(mockSignupDto.email)
      expect(unitOfWork.transaction).toHaveBeenCalledWith(expect.any(Function))
    })

    it('should properly create PasswordIdentity with correct properties', async () => {
      // Arrange
      identityService.throwIfIdentityExists.mockResolvedValue(undefined)
      mapper.map.mockReturnValue(mockUser as any)
      userRepository.save.mockResolvedValue(mockUser)
      passwordHasher.hash.mockResolvedValue(mockPasswordHash)
      passwordIdentityRepository.insert.mockResolvedValue(undefined)
      unitOfWork.transaction.mockImplementation(async (callback) => {
        if (typeof callback === 'function') {
          return await callback()
        }
        throw new Error('Invalid transaction callback')
      })

      // Act
      await handler.execute(command)

      // Assert
      const insertedPasswordIdentity = passwordIdentityRepository.insert.mock.calls[0][0]
      expect(insertedPasswordIdentity).toBeInstanceOf(PasswordIdentity)
      expect(insertedPasswordIdentity.user).toBe(mockUser)
      expect(insertedPasswordIdentity.authProvider).toBe(AuthProvider.EMAIL_PASSWORD)
      expect(insertedPasswordIdentity.passwordHash).toBe(mockPasswordHash)
    })

    it('should throw error if identityService.throwIfIdentityExists throws', async () => {
      // Arrange
      const identityError = new Error('Identity already exists')
      identityService.throwIfIdentityExists.mockRejectedValue(identityError)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Identity already exists')

      expect(identityService.throwIfIdentityExists).toHaveBeenCalledWith(mockSignupDto.email)
      expect(unitOfWork.transaction).not.toHaveBeenCalled()
      expect(mapper.map).not.toHaveBeenCalled()
      expect(userRepository.save).not.toHaveBeenCalled()
      expect(passwordHasher.hash).not.toHaveBeenCalled()
      expect(passwordIdentityRepository.insert).not.toHaveBeenCalled()
      expect(eventBus.publish).not.toHaveBeenCalled()
    })

    it('should throw error if user save fails during transaction', async () => {
      // Arrange
      const saveError = new Error('Database save failed')
      identityService.throwIfIdentityExists.mockResolvedValue(undefined)
      mapper.map.mockReturnValue(mockUser as any)
      userRepository.save.mockRejectedValue(saveError)
      unitOfWork.transaction.mockImplementation(async (callback) => {
        if (typeof callback === 'function') {
          return await callback()
        }
        throw new Error('Invalid transaction callback')
      })

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Database save failed')

      expect(identityService.throwIfIdentityExists).toHaveBeenCalledWith(mockSignupDto.email)
      expect(unitOfWork.transaction).toHaveBeenCalled()
      expect(mapper.map).toHaveBeenCalledWith(mockSignupDto, SignupDto, User)
      expect(userRepository.save).toHaveBeenCalledWith(mockUser)
      expect(passwordHasher.hash).not.toHaveBeenCalled()
      expect(passwordIdentityRepository.insert).not.toHaveBeenCalled()
      expect(eventBus.publish).not.toHaveBeenCalled()
    })

    it('should throw error if password hashing fails during transaction', async () => {
      // Arrange
      const hashError = new Error('Password hashing failed')
      identityService.throwIfIdentityExists.mockResolvedValue(undefined)
      mapper.map.mockReturnValue(mockUser as any)
      userRepository.save.mockResolvedValue(mockUser)
      passwordHasher.hash.mockRejectedValue(hashError)
      unitOfWork.transaction.mockImplementation(async (callback) => {
        if (typeof callback === 'function') {
          return await callback()
        }
        throw new Error('Invalid transaction callback')
      })

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Password hashing failed')

      expect(identityService.throwIfIdentityExists).toHaveBeenCalledWith(mockSignupDto.email)
      expect(unitOfWork.transaction).toHaveBeenCalled()
      expect(mapper.map).toHaveBeenCalledWith(mockSignupDto, SignupDto, User)
      expect(userRepository.save).toHaveBeenCalledWith(mockUser)
      expect(passwordHasher.hash).toHaveBeenCalledWith(mockSignupDto.password)
      expect(passwordIdentityRepository.insert).not.toHaveBeenCalled()
      expect(eventBus.publish).not.toHaveBeenCalled()
    })

    it('should throw error if password identity insert fails during transaction', async () => {
      // Arrange
      const insertError = new Error('Password identity insert failed')
      identityService.throwIfIdentityExists.mockResolvedValue(undefined)
      mapper.map.mockReturnValue(mockUser as any)
      userRepository.save.mockResolvedValue(mockUser)
      passwordHasher.hash.mockResolvedValue(mockPasswordHash)
      passwordIdentityRepository.insert.mockRejectedValue(insertError)
      unitOfWork.transaction.mockImplementation(async (callback) => {
        if (typeof callback === 'function') {
          return await callback()
        }
        throw new Error('Invalid transaction callback')
      })

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Password identity insert failed')

      expect(identityService.throwIfIdentityExists).toHaveBeenCalledWith(mockSignupDto.email)
      expect(unitOfWork.transaction).toHaveBeenCalled()
      expect(mapper.map).toHaveBeenCalledWith(mockSignupDto, SignupDto, User)
      expect(userRepository.save).toHaveBeenCalledWith(mockUser)
      expect(passwordHasher.hash).toHaveBeenCalledWith(mockSignupDto.password)
      expect(passwordIdentityRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUser,
          authProvider: AuthProvider.EMAIL_PASSWORD,
          passwordHash: mockPasswordHash,
        })
      )
      expect(eventBus.publish).not.toHaveBeenCalled()
    })

    it('should throw error if transaction itself fails', async () => {
      // Arrange
      const transactionError = new Error('Transaction failed')
      identityService.throwIfIdentityExists.mockResolvedValue(undefined)
      unitOfWork.transaction.mockRejectedValue(transactionError)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Transaction failed')

      expect(identityService.throwIfIdentityExists).toHaveBeenCalledWith(mockSignupDto.email)
      expect(unitOfWork.transaction).toHaveBeenCalledWith(expect.any(Function))
      expect(mapper.map).not.toHaveBeenCalled()
      expect(userRepository.save).not.toHaveBeenCalled()
      expect(passwordHasher.hash).not.toHaveBeenCalled()
      expect(passwordIdentityRepository.insert).not.toHaveBeenCalled()
      expect(eventBus.publish).not.toHaveBeenCalled()
    })

    it('should execute operations in correct order during transaction', async () => {
      // Arrange
      const executionOrder: string[] = []

      identityService.throwIfIdentityExists.mockResolvedValue(undefined)

      mapper.map.mockImplementation(() => {
        executionOrder.push('mapper.map')
        return mockUser
      })

      userRepository.save.mockImplementation(async (user) => {
        executionOrder.push('userRepository.save')
        return user
      })

      passwordHasher.hash.mockImplementation(async () => {
        executionOrder.push('passwordHasher.hash')
        return mockPasswordHash
      })

      passwordIdentityRepository.insert.mockImplementation(async () => {
        executionOrder.push('passwordIdentityRepository.insert')
        return undefined
      })

      eventBus.publish.mockImplementation(async () => {
        executionOrder.push('eventBus.publish')
        return undefined
      })

      unitOfWork.transaction.mockImplementation(async (callback) => {
        if (typeof callback === 'function') {
          return await callback()
        }
        throw new Error('Invalid transaction callback')
      })

      // Act
      await handler.execute(command)

      // Assert
      expect(executionOrder).toEqual([
        'mapper.map',
        'userRepository.save',
        'passwordHasher.hash',
        'passwordIdentityRepository.insert',
        'eventBus.publish'
      ])
    })

    it('should publish UserSignedUpEvent after successful user creation', async () => {
      // Arrange
      identityService.throwIfIdentityExists.mockResolvedValue(undefined)
      mapper.map.mockReturnValue(mockUser as any)
      userRepository.save.mockResolvedValue(mockUser)
      passwordHasher.hash.mockResolvedValue(mockPasswordHash)
      passwordIdentityRepository.insert.mockResolvedValue(undefined)
      eventBus.publish.mockResolvedValue(undefined)
      unitOfWork.transaction.mockImplementation(async (callback) => {
        if (typeof callback === 'function') {
          return await callback()
        }
        throw new Error('Invalid transaction callback')
      })

      // Act
      await handler.execute(command)

      // Assert
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.any(UserSignedUpEvent)
      )
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUser,
        })
      )
      expect(eventBus.publish).toHaveBeenCalledTimes(1)
    })

    it('should handle different SignupDto properties correctly', async () => {
      // Arrange
      const differentSignupDto: SignupDto = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'StrongPassword123!',
      }
      const differentCommand = new SignupCommand(differentSignupDto)
      const differentUser = plainToInstance(User, {
        id: faker.string.uuid(),
        name: differentSignupDto.name,
        email: differentSignupDto.email,
        lastSignInAt: null,
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
      })

      identityService.throwIfIdentityExists.mockResolvedValue(undefined)
      mapper.map.mockReturnValue(differentUser as any)
      userRepository.save.mockResolvedValue(differentUser)
      passwordHasher.hash.mockResolvedValue(mockPasswordHash)
      passwordIdentityRepository.insert.mockResolvedValue(undefined)
      unitOfWork.transaction.mockImplementation(async (callback) => {
        if (typeof callback === 'function') {
          return await callback()
        }
        throw new Error('Invalid transaction callback')
      })

      // Act
      const result = await handler.execute(differentCommand)

      // Assert
      expect(identityService.throwIfIdentityExists).toHaveBeenCalledWith(differentSignupDto.email)
      expect(mapper.map).toHaveBeenCalledWith(differentSignupDto, SignupDto, User)
      expect(passwordHasher.hash).toHaveBeenCalledWith(differentSignupDto.password)
      expect(result.message).toBe('The user has been created successfully.')
    })

    it('should create new PasswordIdentity instance for each execution', async () => {
      // Arrange
      identityService.throwIfIdentityExists.mockResolvedValue(undefined)
      mapper.map.mockReturnValue(mockUser as any)
      userRepository.save.mockResolvedValue(mockUser)
      passwordHasher.hash.mockResolvedValue(mockPasswordHash)
      passwordIdentityRepository.insert.mockResolvedValue(undefined)
      unitOfWork.transaction.mockImplementation(async (callback) => {
        if (typeof callback === 'function') {
          return await callback()
        }
        throw new Error('Invalid transaction callback')
      })

      // Act - Execute twice
      await handler.execute(command)
      await handler.execute(command)

      // Assert
      expect(passwordIdentityRepository.insert).toHaveBeenCalledTimes(2)

      const firstCall = passwordIdentityRepository.insert.mock.calls[0][0]
      const secondCall = passwordIdentityRepository.insert.mock.calls[1][0]

      // Should be different instances
      expect(firstCall).not.toBe(secondCall)
      // But should have same properties
      expect(firstCall.user).toBe(mockUser)
      expect(firstCall.authProvider).toBe(AuthProvider.EMAIL_PASSWORD)
      expect(firstCall.passwordHash).toBe(mockPasswordHash)
      expect(secondCall.user).toBe(mockUser)
      expect(secondCall.authProvider).toBe(AuthProvider.EMAIL_PASSWORD)
      expect(secondCall.passwordHash).toBe(mockPasswordHash)
    })
  })
})
