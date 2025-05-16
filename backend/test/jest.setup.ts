import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { Main } from '../src/main'

let pgContainer: StartedPostgreSqlContainer

beforeAll(async () => {
  pgContainer = await new PostgreSqlContainer()
    .withDatabase('ourtransfer')
    .withUsername('root')
    .withPassword('admin123')
    .start()

  process.env.DATABASE_HOST = pgContainer.getHost()
  process.env.DATABASE_PORT = pgContainer.getPort().toString()
  process.env.DATABASE_USERNAME = pgContainer.getUsername()
  process.env.DATABASE_PASSWORD = pgContainer.getPassword()
  process.env.DATABASE_NAME = pgContainer.getDatabase()
}, 60000)

afterAll(async () => {
  await pgContainer.stop()

  await (await Main.getAppInstance()).close()
})
