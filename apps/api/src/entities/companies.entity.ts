import { Column, Entity, OneToMany } from 'typeorm'
import { BaseEntity } from './base.entity'
import { Projects } from './projects.entity'

@Entity()
export class Companies extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  name: string

  @Column({ type: 'tinyint', default: 1 })
  isActive: boolean

  @OneToMany(() => Projects, (project) => project.id)
  projects: Projects[]
}
