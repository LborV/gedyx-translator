import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm/repository/Repository'
import { Projects } from '../entities/projects.entity'
import { Companies } from '../entities/companies.entity'
import { Documents } from '../entities/documents.entity'
import MurmurHash3 from 'imurmurhash'

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Projects)
    private projectsRepository: Repository<Projects>,
    @InjectRepository(Documents)
    private documentsRepository: Repository<Documents>,
    @InjectRepository(Companies)
    private companiesRepository: Repository<Companies>
  ) {}

  async create(
    projectId: number,
    data: { name: string; value: string; parser: string }
  ): Promise<Documents> {
    const project = await this.projectsRepository.findOne({
      where: {
        id: projectId
      }
    })

    if (!project) {
      throw new Error('Project not found')
    }

    const document = new Documents()

    document.name = data.name
    document.branch = 'master'
    document.latestVersion = 1
    document.project = project

    document.hash = MurmurHash3(data.value).result().toString(16)

    const duplicate = await this.documentsRepository.findOne({
      where: {
        hash: document.hash,
        project: project
      }
    })

    if (duplicate) {
      throw new Error('Document already exists')
    }

    // TODO: Hardcoded parser

    return this.documentsRepository.save(document)
  }
}
