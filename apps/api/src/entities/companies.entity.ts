import { Column, Entity } from 'typeorm'
import { BaseEntity } from './base.entity'

@Entity()
export class Companies extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string

  @Column({ type: 'tinyint', default: 1 })
  isActive: boolean
}
