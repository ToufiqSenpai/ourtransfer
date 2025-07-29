import { Test } from '@nestjs/testing'
import { SignupValidationPipe } from './signup-validation.pipe'
import { USER_REPOSITORY, UserRepository } from '../../../user/domain/repositories/user.repository'
import { mock, MockProxy } from 'jest-mock-extended'
import { ZodError } from 'zod'
import { SignupDto } from '@ourtransfer/dto'
import { faker } from '@faker-js/faker'

describe('SignupValidationPipe', () => {
  let pipe: SignupValidationPipe
  let userRepository: MockProxy<UserRepository>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SignupValidationPipe,
        {
          provide: USER_REPOSITORY,
          useValue: mock<UserRepository>(),
        },
      ],
    }).compile()

    pipe = module.get(SignupValidationPipe)
    userRepository = module.get(USER_REPOSITORY)
  })

  it('should be defined', () => {
    expect(pipe).toBeDefined()
  })

  describe('transform', () => {
    it('should return a SignupDto for valid data', async () => {
      const validData = {
        name: faker.person.fullName(),
        email: faker.internet.email(),
        password: faker.internet.password({ length: 10 }),
      }
      userRepository.existsByEmail.mockResolvedValue(false)

      const result = await pipe.transform(validData)

      expect(result).toBeInstanceOf(SignupDto)
      expect(result.name).toBe(validData.name)
      expect(result.email).toBe(validData.email)
      expect(result.password).toBe(validData.password)
    })

    it('should throw a ZodError if email already exists', async () => {
      const data = {
        name: faker.person.fullName(),
        email: faker.internet.email(),
        password: faker.internet.password({ length: 10 }),
      }
      userRepository.existsByEmail.mockResolvedValue(true)

      await expect(pipe.transform(data)).rejects.toThrow(ZodError)

      try {
        await pipe.transform(data)
      } catch (error) {
        expect(error).toBeInstanceOf(ZodError)
        expect((error as ZodError).errors[0].message).toBe('Email already in use.')
      }
    })

    describe('name validation', () => {
      it('should throw a ZodError for missing name', async () => {
        const invalidData = {
          email: faker.internet.email(),
          password: faker.internet.password({ length: 10 }),
        }
        userRepository.existsByEmail.mockResolvedValue(false)

        await expect(pipe.transform(invalidData)).rejects.toThrow(ZodError)

        try {
          await pipe.transform(invalidData)
        } catch (error) {
          expect(error).toBeInstanceOf(ZodError)
          expect((error as ZodError).errors.some(e => e.message === 'Name is required.')).toBe(true)
        }
      })

      it('should throw a ZodError for empty name', async () => {
        const invalidData = {
          name: '',
          email: faker.internet.email(),
          password: faker.internet.password({ length: 10 }),
        }
        userRepository.existsByEmail.mockResolvedValue(false)

        await expect(pipe.transform(invalidData)).rejects.toThrow(ZodError)

        try {
          await pipe.transform(invalidData)
        } catch (error) {
          expect(error).toBeInstanceOf(ZodError)
          expect((error as ZodError).errors.some(e => e.message === 'Name is required.')).toBe(true)
        }
      })

      it('should throw a ZodError for non-string name', async () => {
        const invalidData = {
          name: 123,
          email: faker.internet.email(),
          password: faker.internet.password({ length: 10 }),
        }
        userRepository.existsByEmail.mockResolvedValue(false)

        await expect(pipe.transform(invalidData)).rejects.toThrow(ZodError)

        try {
          await pipe.transform(invalidData)
        } catch (error) {
          expect(error).toBeInstanceOf(ZodError)
          expect((error as ZodError).errors.some(e => e.message === 'Name must be string.')).toBe(true)
        }
      })

      it('should throw a ZodError for name longer than 100 characters', async () => {
        const invalidData = {
          name: 'a'.repeat(101),
          email: faker.internet.email(),
          password: faker.internet.password({ length: 10 }),
        }
        userRepository.existsByEmail.mockResolvedValue(false)

        await expect(pipe.transform(invalidData)).rejects.toThrow(ZodError)

        try {
          await pipe.transform(invalidData)
        } catch (error) {
          expect(error).toBeInstanceOf(ZodError)
          expect((error as ZodError).errors.some(e => e.message === 'Name must be less than 100 characters.')).toBe(true)
        }
      })

      it('should accept name with exactly 100 characters', async () => {
        const validData = {
          name: 'a'.repeat(100),
          email: faker.internet.email(),
          password: faker.internet.password({ length: 10 }),
        }
        userRepository.existsByEmail.mockResolvedValue(false)

        const result = await pipe.transform(validData)

        expect(result).toBeInstanceOf(SignupDto)
        expect(result.name).toBe(validData.name)
      })
    })

    describe('email validation', () => {
      it('should throw a ZodError for missing email', async () => {
        const invalidData = {
          name: faker.person.fullName(),
          password: faker.internet.password({ length: 10 }),
        }

        await expect(pipe.transform(invalidData)).rejects.toThrow(ZodError)

        try {
          await pipe.transform(invalidData)
        } catch (error) {
          expect(error).toBeInstanceOf(ZodError)
          expect((error as ZodError).errors.some(e => e.message === 'Email is required.')).toBe(true)
        }
      })

      it('should throw a ZodError for empty email', async () => {
        const invalidData = {
          name: faker.person.fullName(),
          email: '',
          password: faker.internet.password({ length: 10 }),
        }

        await expect(pipe.transform(invalidData)).rejects.toThrow(ZodError)

        try {
          await pipe.transform(invalidData)
        } catch (error) {
          expect(error).toBeInstanceOf(ZodError)
          expect((error as ZodError).errors.some(e => e.message === 'Email is required.')).toBe(true)
        }
      })

      it('should throw a ZodError for non-string email', async () => {
        const invalidData = {
          name: faker.person.fullName(),
          email: 123,
          password: faker.internet.password({ length: 10 }),
        }

        await expect(pipe.transform(invalidData)).rejects.toThrow(ZodError)

        try {
          await pipe.transform(invalidData)
        } catch (error) {
          expect(error).toBeInstanceOf(ZodError)
          expect((error as ZodError).errors.some(e => e.message === 'Email must be string.')).toBe(true)
        }
      })

      it('should throw a ZodError for invalid email format', async () => {
        const invalidData = {
          name: faker.person.fullName(),
          email: 'not-an-email',
          password: faker.internet.password({ length: 10 }),
        }
        userRepository.existsByEmail.mockResolvedValue(false)

        await expect(pipe.transform(invalidData)).rejects.toThrow(ZodError)

        try {
          await pipe.transform(invalidData)
        } catch (error) {
          expect(error).toBeInstanceOf(ZodError)
          expect((error as ZodError).errors.some(e => e.message === 'Email must be a valid email address.')).toBe(true)
        }
      })

      it('should throw a ZodError for email longer than 100 characters', async () => {
        const longEmail = 'a'.repeat(91) + '@email.com'
        const invalidData = {
          name: faker.person.fullName(),
          email: longEmail,
          password: faker.internet.password({ length: 10 }),
        }
        userRepository.existsByEmail.mockResolvedValue(false)

        await expect(pipe.transform(invalidData)).rejects.toThrow(ZodError)

        try {
          await pipe.transform(invalidData)
        } catch (error) {
          expect(error).toBeInstanceOf(ZodError)
          expect((error as ZodError).errors.some(e => e.message === 'Email must be less than 100 characters.')).toBe(true)
        }
      })

      it('should accept valid email formats', async () => {
        const validEmails = [
          'test@example.com',
          'user.name@domain.co.uk',
          'test+tag@example.org',
          'user123@test-domain.com'
        ]

        for (const email of validEmails) {
          const validData = {
            name: faker.person.fullName(),
            email: email,
            password: faker.internet.password({ length: 10 }),
          }
          userRepository.existsByEmail.mockResolvedValue(false)

          const result = await pipe.transform(validData)
          expect(result).toBeInstanceOf(SignupDto)
          expect(result.email).toBe(email)
        }
      })
    })

    describe('password validation', () => {
      it('should throw a ZodError for missing password', async () => {
        const invalidData = {
          name: faker.person.fullName(),
          email: faker.internet.email(),
        }
        userRepository.existsByEmail.mockResolvedValue(false)

        await expect(pipe.transform(invalidData)).rejects.toThrow(ZodError)

        try {
          await pipe.transform(invalidData)
        } catch (error) {
          expect(error).toBeInstanceOf(ZodError)
          expect((error as ZodError).errors.some(e => e.message === 'Password is required.')).toBe(true)
        }
      })

      it('should throw a ZodError for non-string password', async () => {
        const invalidData = {
          name: faker.person.fullName(),
          email: faker.internet.email(),
          password: 123456,
        }
        userRepository.existsByEmail.mockResolvedValue(false)

        await expect(pipe.transform(invalidData)).rejects.toThrow(ZodError)

        try {
          await pipe.transform(invalidData)
        } catch (error) {
          expect(error).toBeInstanceOf(ZodError)
          expect((error as ZodError).errors.some(e => e.message === 'Password must be string.')).toBe(true)
        }
      })

      it('should throw a ZodError for password shorter than 6 characters', async () => {
        const invalidData = {
          name: faker.person.fullName(),
          email: faker.internet.email(),
          password: '12345',
        }
        userRepository.existsByEmail.mockResolvedValue(false)

        await expect(pipe.transform(invalidData)).rejects.toThrow(ZodError)

        try {
          await pipe.transform(invalidData)
        } catch (error) {
          expect(error).toBeInstanceOf(ZodError)
          expect((error as ZodError).errors.some(e => e.message === 'Password must be at least 6 characters long.')).toBe(true)
        }
      })

      it('should throw a ZodError for password longer than 100 characters', async () => {
        const invalidData = {
          name: faker.person.fullName(),
          email: faker.internet.email(),
          password: 'a'.repeat(101),
        }
        userRepository.existsByEmail.mockResolvedValue(false)

        await expect(pipe.transform(invalidData)).rejects.toThrow(ZodError)

        try {
          await pipe.transform(invalidData)
        } catch (error) {
          expect(error).toBeInstanceOf(ZodError)
          expect((error as ZodError).errors.some(e => e.message === 'Password must be less than 100 characters.')).toBe(true)
        }
      })

      it('should accept password with exactly 6 characters', async () => {
        const validData = {
          name: faker.person.fullName(),
          email: faker.internet.email(),
          password: '123456',
        }
        userRepository.existsByEmail.mockResolvedValue(false)

        const result = await pipe.transform(validData)

        expect(result).toBeInstanceOf(SignupDto)
        expect(result.password).toBe(validData.password)
      })

      it('should accept password with exactly 100 characters', async () => {
        const validData = {
          name: faker.person.fullName(),
          email: faker.internet.email(),
          password: 'a'.repeat(100),
        }
        userRepository.existsByEmail.mockResolvedValue(false)

        const result = await pipe.transform(validData)

        expect(result).toBeInstanceOf(SignupDto)
        expect(result.password).toBe(validData.password)
      })
    })

    describe('multiple validation errors', () => {
      it('should throw ZodError with multiple errors for completely invalid data', async () => {
        const invalidData = {
          name: '',
          email: 'invalid-email',
          password: '123',
        }
        userRepository.existsByEmail.mockResolvedValue(false)

        await expect(pipe.transform(invalidData)).rejects.toThrow(ZodError)

        try {
          await pipe.transform(invalidData)
        } catch (error) {
          expect(error).toBeInstanceOf(ZodError)
          const zodError = error as ZodError
          expect(zodError.errors.length).toBeGreaterThan(1)
          expect(zodError.errors.some(e => e.message === 'Name is required.')).toBe(true)
          expect(zodError.errors.some(e => e.message === 'Email must be a valid email address.')).toBe(true)
          expect(zodError.errors.some(e => e.message === 'Password must be at least 6 characters long.')).toBe(true)
        }
      })
    })
  })
})
