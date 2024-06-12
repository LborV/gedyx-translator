import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MqttServiceProducer } from './mqtt.service';
import { ConfigService } from 'libs/common/src/config/config.service';
import { ConfigModule } from 'libs/common/src/config/config.module';

@Module({
  imports: [
    ConfigModule,
    ClientsModule.registerAsync([
      {
        name: 'MQ_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: () => ({
          transport: Transport.MQTT,
          options: {
            host: process.env.MQTT_HOST,
            port: parseInt(process.env.MQTT_PORT),
            username: process.env.MQTT_LOGIN,
            password: process.env.MQTT_PASSWORD,
          },
        }),
      },
    ]),
  ],
  controllers: [],
  providers: [MqttServiceProducer],
  exports: [MqttServiceProducer],
})
export class MqttModuleProducer {}
