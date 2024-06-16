import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Unique
} from 'typeorm'
import { BaseEntity } from './base.entity'
import { Companies } from './companies.entity'
import { Documents } from './documents.entity'

@Entity()
@Unique(['name', 'company'])
export class Projects extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string

  @Column({ type: 'tinyint', default: 1 })
  isActive: boolean

  @ManyToOne(() => Companies, (company) => company.id)
  @JoinColumn({ name: 'companyId' })
  company: Companies

  @OneToMany(() => Documents, (document) => document.id)
  documents: Documents[]
}
