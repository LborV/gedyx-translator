import { Injectable } from '@nestjs/common'
import { TypeOrmOptionsFactory, TypeOrmModuleOptions } from '@nestjs/typeorm'
import { getMetadataArgsStorage } from 'typeorm'

@Injectable()
export class TypeOrmService implements TypeOrmOptionsFactory {
  createTypeOrmOptions() {
    const options = {
      url: process.env.API_DB_URL,
      type: 'mysql',
      retryAttempts: Infinity,
      retryDelay: 1e3,
      autoLoadEntities: true,
      entities: getMetadataArgsStorage().tables.map((t) => t.target),
      synchronize: true,
      extra: {
        max: 10
      }
    } as TypeOrmModuleOptions

    return options
  }
}
