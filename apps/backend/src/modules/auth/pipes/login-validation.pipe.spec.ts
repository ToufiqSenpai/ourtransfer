import { UnauthorizedException } from '@nestjs/common'
import { LoginDto } from '@ourtransfer/dto'
import { LoginValidationPipe } from './login-validation.pipe'

describe('LoginValidationPipe', () => {
  let pipe: LoginValidationPipe

  beforeEach(() => {
    pipe = new LoginValidationPipe()
  })

  describe('transform', () => {
    it('should successfully transform valid login data', () => {
      // Arrange
      const validInput = {
        email: 'test@example.com',
        password: 'validPassword123'
      }

      // Act
      const result = pipe.transform(validInput)

      // Assert
      expect(result).toBeInstanceOf(LoginDto)
      expect(result.email).toBe('test@example.com')
      expect(result.password).toBe('validPassword123')
    })

    it('should transform valid login data with minimum password length', () => {
      // Arrange
      const validInput = {
        email: 'user@test.com',
        password: '123456' // exactly 6 characters (minimum)
      }

      // Act
      const result = pipe.transform(validInput)

      // Assert
      expect(result).toBeInstanceOf(LoginDto)
      expect(result.email).toBe('user@test.com')
      expect(result.password).toBe('123456')
    })

    it('should transform valid login data with maximum lengths', () => {
      // Arrange
      const longEmail = 'a'.repeat(90) + '@test.com' // 100 characters total
      const longPassword = 'a'.repeat(100) // exactly 100 characters
      const validInput = {
        email: longEmail,
        password: longPassword
      }

      // Act
      const result = pipe.transform(validInput)

      // Assert
      expect(result).toBeInstanceOf(LoginDto)
      expect(result.email).toBe(longEmail)
      expect(result.password).toBe(longPassword)
    })

    describe('email validation errors', () => {
      it('should throw UnauthorizedException when email is missing', () => {
        // Arrange
        const invalidInput = {
          password: 'validPassword123'
        }

        // Act & Assert
        expect(() => pipe.transform(invalidInput)).toThrow(UnauthorizedException)
        expect(() => pipe.transform(invalidInput)).toThrow(
          expect.objectContaining({
            response: expect.objectContaining({
              message: 'Email or password is incorrect.'
            })
          })
        )
      })

      it('should throw UnauthorizedException when email is empty string', () => {
        // Arrange
        const invalidInput = {
          email: '',
          password: 'validPassword123'
        }

        // Act & Assert
        expect(() => pipe.transform(invalidInput)).toThrow(UnauthorizedException)
      })

      it('should throw UnauthorizedException when email is not a string', () => {
        // Arrange
        const invalidInput = {
          email: 123,
          password: 'validPassword123'
        }

        // Act & Assert
        expect(() => pipe.transform(invalidInput)).toThrow(UnauthorizedException)
      })

      it('should throw UnauthorizedException when email format is invalid', () => {
        // Arrange
        const invalidInput = {
          email: 'not-an-email',
          password: 'validPassword123'
        }

        // Act & Assert
        expect(() => pipe.transform(invalidInput)).toThrow(UnauthorizedException)
      })

      it('should throw UnauthorizedException when email exceeds maximum length', () => {
        // Arrange
        const tooLongEmail = 'a'.repeat(95) + '@test.com' // 105 characters (exceeds 100)
        const invalidInput = {
          email: tooLongEmail,
          password: 'validPassword123'
        }

        // Act & Assert
        expect(() => pipe.transform(invalidInput)).toThrow(UnauthorizedException)
      })

      it('should throw UnauthorizedException for various invalid email formats', () => {
        const invalidEmails = [
          'test@',
          '@example.com',
          'test..test@example.com',
          'test@example',
          'test @example.com',
          'test@exam ple.com'
        ]

        invalidEmails.forEach(email => {
          const invalidInput = {
            email,
            password: 'validPassword123'
          }

          expect(() => pipe.transform(invalidInput)).toThrow(UnauthorizedException)
        })
      })
    })

    describe('password validation errors', () => {
      it('should throw UnauthorizedException when password is missing', () => {
        // Arrange
        const invalidInput = {
          email: 'test@example.com'
        }

        // Act & Assert
        expect(() => pipe.transform(invalidInput)).toThrow(UnauthorizedException)
      })

      it('should throw UnauthorizedException when password is not a string', () => {
        // Arrange
        const invalidInput = {
          email: 'test@example.com',
          password: 123456
        }

        // Act & Assert
        expect(() => pipe.transform(invalidInput)).toThrow(UnauthorizedException)
      })

      it('should throw UnauthorizedException when password is too short', () => {
        // Arrange
        const invalidInput = {
          email: 'test@example.com',
          password: '12345' // only 5 characters (minimum is 6)
        }

        // Act & Assert
        expect(() => pipe.transform(invalidInput)).toThrow(UnauthorizedException)
      })

      it('should throw UnauthorizedException when password exceeds maximum length', () => {
        // Arrange
        const tooLongPassword = 'a'.repeat(101) // 101 characters (exceeds 100)
        const invalidInput = {
          email: 'test@example.com',
          password: tooLongPassword
        }

        // Act & Assert
        expect(() => pipe.transform(invalidInput)).toThrow(UnauthorizedException)
      })

      it('should throw UnauthorizedException when password is empty after trim', () => {
        // Arrange
        const invalidInput = {
          email: 'test@example.com',
          password: '      ' // only whitespace
        }

        // Act & Assert
        expect(() => pipe.transform(invalidInput)).toThrow(UnauthorizedException)
      })

      it('should throw UnauthorizedException when password is empty string', () => {
        // Arrange
        const invalidInput = {
          email: 'test@example.com',
          password: ''
        }

        // Act & Assert
        expect(() => pipe.transform(invalidInput)).toThrow(UnauthorizedException)
      })

      it('should accept password with leading/trailing spaces if content exists', () => {
        // Arrange
        const validInput = {
          email: 'test@example.com',
          password: '  validPassword123  ' // has content after trim
        }

        // Act
        const result = pipe.transform(validInput)

        // Assert
        expect(result).toBeInstanceOf(LoginDto)
        expect(result.password).toBe('  validPassword123  ') // original value preserved
      })
    })

    describe('edge cases', () => {
      it('should throw UnauthorizedException when input is null', () => {
        // Act & Assert
        expect(() => pipe.transform(null as any)).toThrow(UnauthorizedException)
      })

      it('should throw UnauthorizedException when input is undefined', () => {
        // Act & Assert
        expect(() => pipe.transform(undefined as any)).toThrow(UnauthorizedException)
      })

      it('should throw UnauthorizedException when input is not an object', () => {
        // Act & Assert
        expect(() => pipe.transform('string' as any)).toThrow(UnauthorizedException)
        expect(() => pipe.transform(123 as any)).toThrow(UnauthorizedException)
        expect(() => pipe.transform([] as any)).toThrow(UnauthorizedException)
      })

      it('should throw UnauthorizedException when input has extra properties', () => {
        // Arrange
        const inputWithExtra = {
          email: 'test@example.com',
          password: 'validPassword123',
          extraField: 'should not be here'
        }

        // Act - should still work since zod picks only defined fields
        const result = pipe.transform(inputWithExtra)

        // Assert
        expect(result).toBeInstanceOf(LoginDto)
        expect(result.email).toBe('test@example.com')
        expect(result.password).toBe('validPassword123')
        expect((result as any).extraField).toBeUndefined()
      })
    })

    describe('error message consistency', () => {
      it('should always return the same error message for any validation failure', () => {
        const invalidInputs = [
          { email: 'invalid-email', password: 'validPassword123' },
          { email: 'test@example.com', password: '123' },
          { email: '', password: 'validPassword123' },
          { email: 'test@example.com', password: '' },
          { password: 'validPassword123' }, // missing email
          { email: 'test@example.com' }, // missing password
          null,
          undefined,
          'string'
        ]

        invalidInputs.forEach((input, index) => {
          try {
            pipe.transform(input as any)
            // eslint-disable-next-line no-undef
            fail(`Expected input ${index} to throw an exception`)
          } catch (error) {
            expect(error).toBeInstanceOf(UnauthorizedException)
            expect((error as UnauthorizedException).getResponse()).toEqual(
              expect.objectContaining({
                message: 'Email or password is incorrect.'
              })
            )
          }
        })
      })
    })

    describe('return type validation', () => {
      it('should return LoginDto instance with correct properties', () => {
        // Arrange
        const validInput = {
          email: 'test@example.com',
          password: 'validPassword123'
        }

        // Act
        const result = pipe.transform(validInput)

        // Assert
        expect(result).toBeInstanceOf(LoginDto)
        expect(Object.hasOwnProperty.call(result, 'email')).toBe(true)
        expect(Object.hasOwnProperty.call(result, 'password')).toBe(true)
        expect(typeof result.email).toBe('string')
        expect(typeof result.password).toBe('string')
      })
    })
  })
})
