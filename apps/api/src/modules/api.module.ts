import { Module } from '@nestjs/common'
import { MqttModuleProducer } from 'libs/mqtt/mqtt.module'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ApiController } from '../controllers/api.controller'
import { Companies } from '../entities/companies.entity'
import { Keys } from '../entities/keys.entity'

@Module({
  imports: [MqttModuleProducer, TypeOrmModule.forFeature([Companies, Keys])],
  providers: [],
  controllers: [ApiController]
})
export class ApiModule {}
