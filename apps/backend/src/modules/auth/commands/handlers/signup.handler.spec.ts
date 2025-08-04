import { Test } from '@nestjs/testing'
import { SignupHandler } from './signup.handler'
import { SignupCommand } from '../signup.command'
import { CommonResponseDto, CreateUserDto, SignupDto } from '@ourtransfer/dto'
import { mock, MockProxy } from 'jest-mock-extended'
import { faker } from '@faker-js/faker'
import { plainToInstance } from 'class-transformer'
import { Mapper } from '@automapper/core'
import { getMapperToken } from '@automapper/nestjs'
import { UserService } from '../../../user/services/user.service'
import { User } from '../../../user/entities/user.entity'

describe('SignupHandler', () => {
  let handler: SignupHandler
  let mapper: MockProxy<Mapper>
  let userService: MockProxy<UserService>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SignupHandler,
        {
          provide: getMapperToken(),
          useValue: mock<Mapper>(),
        },
        {
          provide: UserService,
          useValue: mock<UserService>(),
        },
      ],
    }).compile()

    handler = module.get(SignupHandler)
    mapper = module.get(getMapperToken())
    userService = module.get(UserService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('execute', () => {
    const mockSignupDto: SignupDto = {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
    }

    const mockCreateUserDto: CreateUserDto = {
      name: mockSignupDto.name,
      email: mockSignupDto.email,
      password: mockSignupDto.password,
    }

    const mockUser = plainToInstance(User, {
      id: faker.string.uuid(),
      name: mockSignupDto.name,
      email: mockSignupDto.email,
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
    })

    const mockCommand = new SignupCommand(mockSignupDto)

    it('should be defined', () => {
      expect(handler).toBeDefined()
    })

    it('should successfully create a user and return success message', async () => {
      // Arrange
      mapper.map.mockReturnValue(mockCreateUserDto as any)
      userService.createUser.mockResolvedValue(mockUser)

      // Act
      const result = await handler.execute(mockCommand)

      // Assert
      expect(mapper.map).toHaveBeenCalledWith(mockSignupDto, SignupDto, CreateUserDto)
      expect(userService.createUser).toHaveBeenCalledWith(mockCreateUserDto)
      expect(result).toBeInstanceOf(CommonResponseDto)
      expect(result.message).toBe('The user has been created successfully.')
    })

    it('should map the signup DTO to create user DTO correctly', async () => {
      // Arrange
      mapper.map.mockReturnValue(mockCreateUserDto as any)
      userService.createUser.mockResolvedValue(mockUser)

      // Act
      await handler.execute(mockCommand)

      // Assert
      expect(mapper.map).toHaveBeenCalledTimes(1)
      expect(mapper.map).toHaveBeenCalledWith(
        mockSignupDto,
        SignupDto,
        CreateUserDto
      )
    })

    it('should call userService.createUser with the mapped DTO', async () => {
      // Arrange
      mapper.map.mockReturnValue(mockCreateUserDto as any)
      userService.createUser.mockResolvedValue(mockUser)

      // Act
      await handler.execute(mockCommand)

      // Assert
      expect(userService.createUser).toHaveBeenCalledTimes(1)
      expect(userService.createUser).toHaveBeenCalledWith(mockCreateUserDto)
    })

    it('should throw an error when userService.createUser fails', async () => {
      // Arrange
      const error = new Error('Database connection failed')
      mapper.map.mockReturnValue(mockCreateUserDto as any)
      userService.createUser.mockRejectedValue(error)

      // Act & Assert
      await expect(handler.execute(mockCommand)).rejects.toThrow('Database connection failed')
      expect(mapper.map).toHaveBeenCalledWith(mockSignupDto, SignupDto, CreateUserDto)
      expect(userService.createUser).toHaveBeenCalledWith(mockCreateUserDto)
    })

    it('should throw an error when mapper fails', async () => {
      // Arrange
      const error = new Error('Mapping failed')
      mapper.map.mockImplementation(() => {
        throw error
      })

      // Act & Assert
      await expect(handler.execute(mockCommand)).rejects.toThrow('Mapping failed')
      expect(mapper.map).toHaveBeenCalledWith(mockSignupDto, SignupDto, CreateUserDto)
      expect(userService.createUser).not.toHaveBeenCalled()
    })

    it('should handle edge case with empty command DTO', async () => {
      // Arrange
      const emptySignupDto: SignupDto = {
        name: '',
        email: '',
        password: '',
      }
      const emptyCreateUserDto: CreateUserDto = {
        name: '',
        email: '',
        password: '',
      }
      const emptyCommand = new SignupCommand(emptySignupDto)

      mapper.map.mockReturnValue(emptyCreateUserDto as any)
      userService.createUser.mockResolvedValue(mockUser)

      // Act
      const result = await handler.execute(emptyCommand)

      // Assert
      expect(mapper.map).toHaveBeenCalledWith(emptySignupDto, SignupDto, CreateUserDto)
      expect(userService.createUser).toHaveBeenCalledWith(emptyCreateUserDto)
      expect(result.message).toBe('The user has been created successfully.')
    })

    it('should return correct response structure', async () => {
      // Arrange
      mapper.map.mockReturnValue(mockCreateUserDto as any)
      userService.createUser.mockResolvedValue(mockUser)

      // Act
      const result = await handler.execute(mockCommand)

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          message: expect.any(String),
        })
      )
      expect(typeof result.message).toBe('string')
      expect(result.message.length).toBeGreaterThan(0)
    })

    it('should use plainToInstance for response creation', async () => {
      // Arrange
      mapper.map.mockReturnValue(mockCreateUserDto as any)
      userService.createUser.mockResolvedValue(mockUser)

      // Act
      const result = await handler.execute(mockCommand)

      // Assert
      expect(result).toBeInstanceOf(CommonResponseDto)
      expect(result.message).toBe('The user has been created successfully.')
    })
  })
})
