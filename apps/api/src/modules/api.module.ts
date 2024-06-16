import { Module } from '@nestjs/common'
import { MqttModuleProducer } from 'libs/mqtt/mqtt.module'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ApiController } from '../controllers/api.controller'
import { Companies } from '../entities/companies.entity'
import { Projects } from '../entities/projects.entity'
import { Documents } from '../entities/documents.entity'
import { Tokens } from '../entities/tokens.entity'
import { CompaniesService } from '../services/companies.service'
import { ProjectsService } from '../services/projects.service'
import { DocumentsService } from '../services/documents.service'

@Module({
  imports: [
    MqttModuleProducer,
    TypeOrmModule.forFeature([Companies, Projects, Documents, Tokens])
  ],
  providers: [CompaniesService, ProjectsService, DocumentsService],
  controllers: [ApiController]
})
export class ApiModule {}
