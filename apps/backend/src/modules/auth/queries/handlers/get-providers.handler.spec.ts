import { Test } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { GetProvidersHandler } from './get-providers.handler'
import { GetProvidersQuery } from '../get-providers.query'
import { GetProvidersResponseDto } from '@ourtransfer/dto'
import { mock, MockProxy } from 'jest-mock-extended'
import { faker } from '@faker-js/faker'
import { plainToInstance } from 'class-transformer'
import { IDENTITY_REPOSITORY, IdentityRepository } from '../../repositories/identity.repository'
import { PasswordIdentity } from '../../entities/password-identity.entity'
import { AuthProvider } from '@ourtransfer/common'

describe('GetProvidersHandler', () => {
  let handler: GetProvidersHandler
  let identityRepository: MockProxy<IdentityRepository>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GetProvidersHandler,
        {
          provide: IDENTITY_REPOSITORY,
          useValue: mock<IdentityRepository>(),
        },
      ],
    }).compile()

    handler = module.get(GetProvidersHandler)
    identityRepository = module.get(IDENTITY_REPOSITORY)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('execute', () => {
    const userEmail = faker.internet.email()
    let query: GetProvidersQuery

    beforeEach(() => {
      query = new GetProvidersQuery(userEmail)
    })

    afterEach(() => {
      jest.resetAllMocks()
      jest.restoreAllMocks()
    })

    it('should return providers for user with single identity', async () => {
      // Arrange
      const mockIdentity = plainToInstance(PasswordIdentity, {
        id: faker.string.uuid(),
        email: userEmail,
        passwordHash: faker.string.alphanumeric(60),
        authProvider: AuthProvider.EMAIL_PASSWORD,
        lastSignInAt: faker.date.past(),
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
      })

      identityRepository.findByUserEmail.mockResolvedValue([mockIdentity])

      // Act
      const result = await handler.execute(query)

      // Assert
      expect(identityRepository.findByUserEmail).toHaveBeenCalledWith(userEmail)
      expect(result).toBeInstanceOf(GetProvidersResponseDto)
      expect(result.providers).toEqual([AuthProvider.EMAIL_PASSWORD])
      expect(result.providers).toHaveLength(1)
    })

    it('should return providers for user with multiple identities', async () => {
      // Arrange
      const mockPasswordIdentity = plainToInstance(PasswordIdentity, {
        id: faker.string.uuid(),
        email: userEmail,
        passwordHash: faker.string.alphanumeric(60),
        authProvider: AuthProvider.EMAIL_PASSWORD,
        lastSignInAt: faker.date.past(),
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
      })

      const mockGoogleIdentity = plainToInstance(PasswordIdentity, {
        id: faker.string.uuid(),
        email: userEmail,
        passwordHash: null,
        authProvider: AuthProvider.GOOGLE,
        lastSignInAt: faker.date.past(),
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
      })

      const mockGithubIdentity = plainToInstance(PasswordIdentity, {
        id: faker.string.uuid(),
        email: userEmail,
        passwordHash: null,
        authProvider: AuthProvider.EMAIL,
        lastSignInAt: faker.date.past(),
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
      })

      identityRepository.findByUserEmail.mockResolvedValue([
        mockPasswordIdentity,
        mockGoogleIdentity,
        mockGithubIdentity
      ])

      // Act
      const result = await handler.execute(query)

      // Assert
      expect(identityRepository.findByUserEmail).toHaveBeenCalledWith(userEmail)
      expect(result).toBeInstanceOf(GetProvidersResponseDto)
      expect(result.providers).toEqual([
        AuthProvider.EMAIL_PASSWORD,
        AuthProvider.GOOGLE,
        AuthProvider.EMAIL
      ])
      expect(result.providers).toHaveLength(3)
    })

    it('should return providers in the same order as identities', async () => {
      // Arrange
      const mockIdentities = [
        plainToInstance(PasswordIdentity, {
          id: faker.string.uuid(),
          email: userEmail,
          authProvider: AuthProvider.EMAIL,
        }),
        plainToInstance(PasswordIdentity, {
          id: faker.string.uuid(),
          email: userEmail,
          authProvider: AuthProvider.EMAIL_PASSWORD,
        }),
        plainToInstance(PasswordIdentity, {
          id: faker.string.uuid(),
          email: userEmail,
          authProvider: AuthProvider.GOOGLE,
        })
      ]

      identityRepository.findByUserEmail.mockResolvedValue(mockIdentities)

      // Act
      const result = await handler.execute(query)

      // Assert
      expect(result.providers).toEqual([
        AuthProvider.EMAIL,
        AuthProvider.EMAIL_PASSWORD,
        AuthProvider.GOOGLE
      ])
    })

    it('should throw NotFoundException when no identities found', async () => {
      // Arrange
      identityRepository.findByUserEmail.mockResolvedValue([])

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow(NotFoundException)
      await expect(handler.execute(query)).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            message: "No user found with the provided email address."
          })
        })
      )

      expect(identityRepository.findByUserEmail).toHaveBeenCalledWith(userEmail)
    })

    it('should throw NotFoundException when repository returns empty array', async () => {
      // Arrange
      identityRepository.findByUserEmail.mockResolvedValue([])

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow(NotFoundException)

      expect(identityRepository.findByUserEmail).toHaveBeenCalledWith(userEmail)
    })

    it('should handle repository errors gracefully', async () => {
      // Arrange
      const repositoryError = new Error('Database connection failed')
      identityRepository.findByUserEmail.mockRejectedValue(repositoryError)

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow(repositoryError)

      expect(identityRepository.findByUserEmail).toHaveBeenCalledWith(userEmail)
    })

    it('should call repository with exact email from query', async () => {
      // Arrange
      const specificEmail = 'test.user@example.com'
      const specificQuery = new GetProvidersQuery(specificEmail)

      const mockIdentity = plainToInstance(PasswordIdentity, {
        id: faker.string.uuid(),
        email: specificEmail,
        authProvider: AuthProvider.EMAIL_PASSWORD,
      })

      identityRepository.findByUserEmail.mockResolvedValue([mockIdentity])

      // Act
      await handler.execute(specificQuery)

      // Assert
      expect(identityRepository.findByUserEmail).toHaveBeenCalledWith(specificEmail)
      expect(identityRepository.findByUserEmail).toHaveBeenCalledTimes(1)
    })

    it('should return empty providers array structure when mapping empty results', async () => {
      // This test verifies the structure even though we expect a NotFoundException
      // However, let's test what would happen if we had identities but somehow empty providers

      // Arrange - create identity with undefined authProvider to test edge case
      const mockIdentityWithUndefinedProvider = {
        id: faker.string.uuid(),
        email: userEmail,
        authProvider: undefined,
      } as any

      identityRepository.findByUserEmail.mockResolvedValue([mockIdentityWithUndefinedProvider])

      // Act
      const result = await handler.execute(query)

      // Assert
      expect(result).toBeInstanceOf(GetProvidersResponseDto)
      expect(result.providers).toEqual([undefined])
      expect(result.providers).toHaveLength(1)
    })

    it('should handle mixed provider types correctly', async () => {
      // Arrange
      const mockIdentities = [
        plainToInstance(PasswordIdentity, {
          id: faker.string.uuid(),
          email: userEmail,
          authProvider: AuthProvider.EMAIL_PASSWORD,
        }),
        plainToInstance(PasswordIdentity, {
          id: faker.string.uuid(),
          email: userEmail,
          authProvider: AuthProvider.GOOGLE,
        }),
        plainToInstance(PasswordIdentity, {
          id: faker.string.uuid(),
          email: userEmail,
          authProvider: AuthProvider.EMAIL_PASSWORD, // Duplicate provider
        })
      ]

      identityRepository.findByUserEmail.mockResolvedValue(mockIdentities)

      // Act
      const result = await handler.execute(query)

      // Assert
      expect(result.providers).toEqual([
        AuthProvider.EMAIL_PASSWORD,
        AuthProvider.GOOGLE,
        AuthProvider.EMAIL_PASSWORD
      ])
      expect(result.providers).toHaveLength(3)
    })
  })
})
