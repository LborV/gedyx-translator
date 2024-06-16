import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Companies } from '../entities/companies.entity'
import { Repository } from 'typeorm/repository/Repository'

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Companies)
    private companyRepository: Repository<Companies>
  ) {}

  async create(data: { name: string }): Promise<Companies> {
    const company = Companies.fromDto(data)

    return this.companyRepository.save(company)
  }

  async get(): Promise<Companies[]> {
    return this.companyRepository.find()
  }
}
