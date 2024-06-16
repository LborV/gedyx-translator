import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm/repository/Repository'
import { Projects } from '../entities/projects.entity'
import { Companies } from '../entities/companies.entity'

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Projects)
    private projectsRepository: Repository<Projects>,
    @InjectRepository(Companies)
    private companiesRepository: Repository<Companies>
  ) {}

  async getByCompany(companyId: number): Promise<Projects[]> {
    const company = await this.companiesRepository.findOne({
      where: {
        id: companyId
      }
    })

    return this.projectsRepository.find({
      where: {
        company: company
      }
    })
  }

  async create(data: { name: string; companyId: number }): Promise<Projects> {
    const project = Projects.fromDto(data) as Projects

    const company = await this.companiesRepository.findOne({
      where: {
        id: data.companyId
      }
    })

    if (!company) {
      throw new Error('Company not found')
    }

    project.company = company

    return this.projectsRepository.save(project)
  }

  async get(): Promise<Projects[]> {
    return this.projectsRepository.find()
  }
}
