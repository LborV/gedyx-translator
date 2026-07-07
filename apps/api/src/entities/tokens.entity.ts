import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm'
import { BaseEntity } from './base.entity'
import { Documents } from './documents.entity'

/**
 * Узел дерева токенов, хранимый по модели adjacency list: у каждого узла
 * есть ссылка на родителя (`parent`/`parentId`), роль относительно родителя
 * (`relation`) и порядковый номер (`position`). Это даёт детерминированный
 * порядок дочерних узлов и позволяет читать весь документ одним запросом,
 * а собирать дерево в памяти без рекурсии.
 */
@Entity()
export class Tokens extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string

  @ManyToOne(() => Documents, (document) => document.id)
  document: Documents

  @ManyToOne(() => Tokens, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentId' })
  parent?: Tokens

  @Column({ type: 'int', nullable: true })
  parentId: number | null

  @Column({ type: 'varchar', length: 16 })
  relation: 'root' | 'child' | 'close'

  @Column({ type: 'int' })
  position: number

  @Column({ type: 'bigint' })
  version: number

  @Column({ type: 'text' })
  hash: string

  @Column({ type: 'longtext' })
  value: string

  @Column({ type: 'int' })
  level: number
}
