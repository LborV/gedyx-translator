import { Module } from '@nestjs/common';
import { MqttModuleProducer } from 'libs/mqtt/mqtt.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiController } from '../controllers/api.controller';

@Module({
  imports: [MqttModuleProducer, TypeOrmModule.forFeature([])],
  providers: [],
  controllers: [ApiController],
})
export class ApiModule {}
