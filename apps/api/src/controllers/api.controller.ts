import { Controller, Get, Inject } from '@nestjs/common';
import { MqttServiceProducer } from 'libs/mqtt/mqtt.service';

@Controller('api')
export class ApiController {
  constructor(@Inject() private readonly client: MqttServiceProducer) {}

  @Get('ping')
  async ping() {
    return 'pong';
  }
}
