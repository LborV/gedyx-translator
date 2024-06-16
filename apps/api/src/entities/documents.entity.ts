import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm'
import { BaseEntity } from './base.entity'
import { Projects } from './projects.entity'

@Entity()
export class Documents extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string

  @ManyToOne(() => Projects, (project) => project.id)
  @JoinColumn({ name: 'projectId' })
  project: Projects

  @Column({ type: 'varchar', length: 255 })
  branch: string

  @Column({ type: 'bigint' })
  latestVersion: number

  @Column({ type: 'text' })
  hash: string
}
