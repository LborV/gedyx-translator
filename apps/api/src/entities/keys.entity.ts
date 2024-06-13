import { Column, Entity, ManyToOne } from 'typeorm'
import { BaseEntity } from './base.entity'
import { Companies } from './companies.entity'

@Entity()
export class Keys extends BaseEntity {
  @ManyToOne(() => Companies, (company) => company.id)
  company: Companies

  @Column({ type: 'varchar', length: 255 })
  key: string

  @Column({ type: 'tinyint', default: 1 })
  isActive: boolean
}
