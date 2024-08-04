import { Body, Controller, Get, Param, Put } from '@nestjs/common'
import { CompaniesService } from '../services/companies.service'
import { ProjectsService } from '../services/projects.service'
import { DocumentsService } from '../services/documents.service'
import { readFileSync } from 'fs'
import { join } from 'path'

@Controller('api')
export class ApiController {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly projectsService: ProjectsService,
    private readonly documentsService: DocumentsService
  ) {}

  @Get('ping')
  async ping() {
    return 'pong'
  }

  @Put('company')
  async company(@Body() data: { name: string }) {
    return this.companiesService.create(data)
  }

  @Get()
  async get() {
    const htmlFilePath = join(__dirname, '..', 'api', 'src', 'html', 'index.html');

    return readFileSync(htmlFilePath, 'utf8')
  }

  @Get('company')
  async getCompany() {
    return this.companiesService.get()
  }

  @Put('project')
  async project(@Body() data: { name: string; companyId: number }) {
    return this.projectsService.create(data)
  }

  @Get('project/:companyId')
  async getProject(@Param('companyId') companyId: number) {
    return this.projectsService.getByCompany(companyId)
  }

  @Put('document/:projectId')
  async document(
    @Param('projectId') projectId: number,
    @Body() data: { name: string; value: string; parser: string }
  ) {
    return this.documentsService.create(projectId, data)
  }

  @Get('document/:id/:version?')
  async getDocument(
    @Param('id') id: number,
    @Param('version') version: number = 1
  ) {
    return this.documentsService.get(id, version)
  }
}
