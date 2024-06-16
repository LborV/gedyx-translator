import { Inject, Injectable } from '@nestjs/common'
import {
  ClientProxy,
  MqttRecordBuilder,
  RpcException
} from '@nestjs/microservices'
import { firstValueFrom } from 'rxjs'

@Injectable()
export class MqttServiceProducer {
  constructor(@Inject('MQ_CLIENT') private readonly client: ClientProxy) {}

  async request(
    pattern: string,
    data: any,
    qos: 0 | 1 | 2 = 2,
    userProperties: Record<string, string> = {}
  ) {
    const record = new MqttRecordBuilder(data)
      .setProperties(userProperties)
      .setQoS(qos)
      .build()

    try {
      return await firstValueFrom(this.client.send(pattern, record), {
        defaultValue: null
      })
    } catch (err) {
      throw new RpcException({
        err,
        name: RpcException.name
      })
    }
  }
}
