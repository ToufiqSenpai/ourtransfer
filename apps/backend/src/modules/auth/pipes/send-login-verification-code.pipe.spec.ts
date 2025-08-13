import { SendLoginVerificationCodePipe } from './send-login-verification-code.pipe'
import { SendLoginVerificationCodeDto } from '@ourtransfer/dto'
import { ZodError } from 'zod'
import { faker } from '@faker-js/faker'

describe('SendLoginVerificationCodePipe', () => {
  let pipe: SendLoginVerificationCodePipe

  beforeEach(() => {
    pipe = new SendLoginVerificationCodePipe()
  })

  describe('transform', () => {
    describe('successful transformations', () => {
      it('should transform valid email input', () => {
        // Arrange
        const validEmail = faker.internet.email()
        const input = { email: validEmail }

        // Act
        const result = pipe.transform(input)

        // Assert
        expect(result).toBeInstanceOf(SendLoginVerificationCodeDto)
        expect(result.email).toBe(validEmail)
      })

      it('should transform email with minimum length (1 character)', () => {
        // Arrange
        const input = { email: 'a@gmail.com' }

        // Act
        const result = pipe.transform(input)

        // Assert
        expect(result).toBeInstanceOf(SendLoginVerificationCodeDto)
        expect(result.email).toBe('a@gmail.com')
      })

      it('should transform email with maximum length (100 characters)', () => {
        // Arrange
        const longEmail = `${'a'.repeat(90)}@test.com` // 100 characters total
        const input = { email: longEmail }

        // Act
        const result = pipe.transform(input)

        // Assert
        expect(result).toBeInstanceOf(SendLoginVerificationCodeDto)
        expect(result.email).toBe(longEmail)
      })

      it('should transform email with various valid formats', () => {
        // Arrange
        const validEmails = [
          'test@example.com',
          'user.name@domain.org',
          'test+tag@subdomain.example.net',
          'user123@test-domain.co.uk',
          'a@b.co'
        ]

        validEmails.forEach(email => {
          const input = { email }

          // Act
          const result = pipe.transform(input)

          // Assert
          expect(result).toBeInstanceOf(SendLoginVerificationCodeDto)
          expect(result.email).toBe(email)
        })
      })
    })

    describe('validation errors', () => {
      it('should throw ZodError when email is missing', () => {
        // Arrange
        const input = {}

        // Act & Assert
        expect(() => pipe.transform(input)).toThrow(ZodError)

        try {
          pipe.transform(input)
        } catch (error) {
          expect(error).toBeInstanceOf(ZodError)
          const zodError = error as ZodError
          expect(zodError.errors[0].message).toBe('Email is required.')
          expect(zodError.errors[0].path).toEqual(['email'])
        }
      })

      it('should throw ZodError when email is null', () => {
        // Arrange
        const input = { email: null }

        // Act & Assert
        expect(() => pipe.transform(input)).toThrow(ZodError)

        try {
          pipe.transform(input)
        } catch (error) {
          expect(error).toBeInstanceOf(ZodError)
          const zodError = error as ZodError
          expect(zodError.errors[0].message).toBe('Email must be a string.')
        }
      })

      it('should throw ZodError when email is not a string', () => {
        // Arrange
        const invalidInputs = [
          { email: 123, expectedMessage: 'Email must be a string.' },
          { email: true, expectedMessage: 'Email must be a string.' },
          { email: {}, expectedMessage: 'Email must be a string.' },
          { email: [], expectedMessage: 'Email must be a string.' },
          { email: undefined, expectedMessage: 'Email is required.' }
        ]

        invalidInputs.forEach(({ email, expectedMessage }) => {
          const input = { email }

          // Act & Assert
          expect(() => pipe.transform(input)).toThrow(ZodError)

          try {
            pipe.transform(input)
          } catch (error) {
            expect(error).toBeInstanceOf(ZodError)
            const zodError = error as ZodError
            expect(zodError.errors[0].message).toBe(expectedMessage)
          }
        })
      })

      it('should throw ZodError when email is empty string', () => {
        // Arrange
        const input = { email: '' }

        // Act & Assert
        expect(() => pipe.transform(input)).toThrow(ZodError)

        try {
          pipe.transform(input)
        } catch (error) {
          expect(error).toBeInstanceOf(ZodError)
          const zodError = error as ZodError
          expect(zodError.errors[0].message).toBe('Min email length is 1.')
        }
      })

      it('should throw ZodError when email exceeds maximum length', () => {
        // Arrange
        const longEmail = `${'a'.repeat(95)}@test.com` // 105 characters total
        const input = { email: longEmail }

        // Act & Assert
        expect(() => pipe.transform(input)).toThrow(ZodError)

        try {
          pipe.transform(input)
        } catch (error) {
          expect(error).toBeInstanceOf(ZodError)
          const zodError = error as ZodError
          expect(zodError.errors[0].message).toBe('Max email length is 100.')
        }
      })

      it('should throw ZodError when email format is invalid', () => {
        // Arrange
        const invalidEmails = [
          'invalid-email',
          '@domain.com',
          'user@',
          'user@@domain.com',
          'user@domain',
          'user name@domain.com',
          'user@domain..com',
          '.user@domain.com',
          'user.@domain.com'
        ]

        invalidEmails.forEach(email => {
          const input = { email }

          // Act & Assert
          expect(() => pipe.transform(input)).toThrow(ZodError)

          try {
            pipe.transform(input)
          } catch (error) {
            expect(error).toBeInstanceOf(ZodError)
            const zodError = error as ZodError
            expect(zodError.errors[0].message).toBe('Email is not valid.')
          }
        })
      })

      it('should throw ZodError with multiple validation errors', () => {
        // Arrange
        const input = { email: 'a'.repeat(105) } // Too long and invalid format

        // Act & Assert
        expect(() => pipe.transform(input)).toThrow(ZodError)

        try {
          pipe.transform(input)
        } catch (error) {
          expect(error).toBeInstanceOf(ZodError)
          const zodError = error as ZodError
          expect(zodError.errors.length).toBeGreaterThan(0)
        }
      })
    })

    describe('edge cases', () => {
      it('should handle object with extra properties', () => {
        // Arrange
        const validEmail = faker.internet.email()
        const input = {
          email: validEmail,
          extraProperty: 'should be ignored',
          anotherProperty: 123
        }

        // Act
        const result = pipe.transform(input)

        // Assert
        expect(result).toBeInstanceOf(SendLoginVerificationCodeDto)
        expect(result.email).toBe(validEmail)
        // Extra properties should not be included in the result
        expect(result).not.toHaveProperty('extraProperty')
        expect(result).not.toHaveProperty('anotherProperty')
      })

      it('should handle email with whitespace (trimming depends on schema)', () => {
        // Arrange
        const emailWithSpaces = '  test@example.com  '
        const input = { email: emailWithSpaces }

        // Act & Assert
        // Note: Zod doesn't trim by default, so this should fail validation
        expect(() => pipe.transform(input)).toThrow(ZodError)
      })

      it('should handle nested object structure', () => {
        // Arrange
        const nestedInput = {
          user: {
            email: faker.internet.email()
          }
        }

        // Act & Assert
        expect(() => pipe.transform(nestedInput)).toThrow(ZodError)
      })
    })
  })
})
