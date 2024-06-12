import { ConfigService as NestConfigService } from '@nestjs/config';
import { NODE_ENVIRONMENT } from '../constants/node-end';

interface EnvironmentVariables {
  NODE_ENV:
    | NODE_ENVIRONMENT.DEV
    | NODE_ENVIRONMENT.PROD
    | NODE_ENVIRONMENT.TEST;
  MQTT_HOST: string;
  MQTT_PASSWORD: string;
  MQTT_PORT: number;
  MQTT_LOGIN: string;
  API_DB_URL: string;
  API_PORT: number;
}

export class ConfigService extends NestConfigService<EnvironmentVariables> {}
