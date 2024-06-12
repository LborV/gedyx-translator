import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmService } from '../typeorm/typeorm.service';
import { ApiModule } from '../modules/api.module';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({ useClass: TypeOrmService }),
    ApiModule,
  ],
})
export class AppModule {}
