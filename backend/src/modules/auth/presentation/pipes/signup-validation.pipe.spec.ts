import { SignupValidationPipe } from './signup-validation.pipe'
import { mock, MockProxy } from 'jest-mock-extended'
import { QueryBus } from '@nestjs/cqrs'
import { IsUserEmailUniqueQuery } from '../../../user/application/queries/is-user-email-unique.query'
import { faker } from '@faker-js/faker'

describe('SignupValidationPipe', () => {
  let pipe: SignupValidationPipe
  let queryBus: MockProxy<QueryBus>

  beforeEach(() => {
    queryBus = mock<QueryBus>()
    pipe = new SignupValidationPipe(queryBus)
  })

  it('should validate and transform valid input', async () => {
    queryBus.execute.mockResolvedValue(true)
    const value = {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      password: faker.internet.password({ length: 10 }),
    }

    const result = await pipe.transform(value)
    expect(result).toMatchObject(value)
  })

  it('should throw if name is missing', async () => {
    const value = {
      email: faker.internet.email(),
      password: faker.internet.password({ length: 10 }),
    }

    await expect(pipe.transform(value)).rejects.toThrow('Name is required.')
  })

  it('should throw if email is missing', async () => {
    const value = {
      name: faker.person.fullName(),
      password: faker.internet.password({ length: 10 }),
    }

    await expect(pipe.transform(value)).rejects.toThrow('Email is required.')
  })

  it('should throw if password is missing', async () => {
    const value = {
      name: faker.person.fullName(),
      email: faker.internet.email(),
    }

    await expect(pipe.transform(value)).rejects.toThrow('Password is required.')
  })

  it('should throw if name is not a string', async () => {
    const value = {
      name: 123,
      email: faker.internet.email(),
      password: faker.internet.password({ length: 10 }),
    }

    await expect(pipe.transform(value)).rejects.toThrow('Name must be string.')
  })

  it('should throw if email is not a string', async () => {
    const value = {
      name: faker.person.fullName(),
      email: 123,
      password: faker.internet.password({ length: 10 }),
    }

    await expect(pipe.transform(value)).rejects.toThrow('Email must be string.')
  })

  it('should throw if password is not a string', async () => {
    const value = {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      password: 123,
    }

    await expect(pipe.transform(value)).rejects.toThrow('Password must be string.')
  })

  it('should throw if name is too long', async () => {
    const value = {
      name: 'a'.repeat(101),
      email: faker.internet.email(),
      password: faker.internet.password({ length: 10 }),
    }

    await expect(pipe.transform(value)).rejects.toThrow('Name must be less than 100 characters.')
  })

  it('should throw if email is too long', async () => {
    const value = {
      name: faker.person.fullName(),
      email: `${'a'.repeat(95)}@e.com`,
      password: faker.internet.password({ length: 10 }),
    }

    await expect(pipe.transform(value)).rejects.toThrow('Email must be less than 100 characters.')
  })

  it('should throw if password is too short', async () => {
    const value = {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      password: '123',
    }

    await expect(pipe.transform(value)).rejects.toThrow('Password must be at least 6 characters long.')
  })

  it('should throw if password is too long', async () => {
    const value = {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      password: 'a'.repeat(101),
    }

    await expect(pipe.transform(value)).rejects.toThrow('Password must be less than 100 characters.')
  })

  it('should throw if email is invalid', async () => {
    const value = {
      name: faker.person.fullName(),
      email: 'not-an-email',
      password: faker.internet.password({ length: 10 }),
    }

    await expect(pipe.transform(value)).rejects.toThrow('Email must be a valid email address.')
  })

  it('should throw if email is not unique', async () => {
    queryBus.execute.mockResolvedValue(false)

    const email = faker.internet.email()
    const value = {
      name: faker.person.fullName(),
      email,
      password: faker.internet.password({ length: 10 }),
    }

    await expect(pipe.transform(value)).rejects.toThrow('Email already in use.')

    expect(queryBus.execute).toHaveBeenCalledWith(new IsUserEmailUniqueQuery(email))
  })
})
