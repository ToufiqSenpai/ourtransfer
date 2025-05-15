import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DatabaseConfig } from '../../configs/database.config'

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory(databaseConfig: DatabaseConfig) {
        return {}
      },
    }),
  ],
})
export class DatabaseModule {}
