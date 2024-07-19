import { NestFactory } from '@nestjs/core'
// import { MicroserviceOptions, Transport } from '@nestjs/microservices'
import { AppModule } from './app/app.module'
import * as bodyParser from 'body-parser'
import { ConfigService } from 'libs/common/src/config/config.service'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const configService = app.get(ConfigService)

  app.use(bodyParser.json({limit: '50mb'}));

  // await app.connectMicroservice<MicroserviceOptions>({
  //   transport: Transport.MQTT,
  //   options: {
  //     url: `mqtt://${configService.get('MQTT_LOGIN')}:${configService.get('MQTT_PASSWORD')}@${configService.get('MQTT_HOST')}:${configService.get('MQTT_PORT')}`
  //   }
  // })

  app.startAllMicroservices()
  app.listen(configService.get('API_PORT'))
}
bootstrap()
