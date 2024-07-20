import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne } from 'typeorm'
import { BaseEntity } from './base.entity'
import { Documents } from './documents.entity'

@Entity()
export class Tokens extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string

  @ManyToOne(() => Documents, (document) => document.id)
  document: Documents

  @Column({ type: 'bigint' })
  version: number

  @Column({ type: 'text' })
  hash: string

  @Column({ type: 'longtext' })
  value: string

  @OneToOne(() => Tokens, (token) => token.id)
  @JoinColumn()
  closeToken?: Tokens

  @ManyToMany(() => Tokens, (token) => token.id)
  @JoinTable()
  children: Tokens[]

  @ManyToMany(() => Tokens, (token) => token.id)
  @JoinTable()
  subTokens: Tokens[]

  @Column({ type: 'int' })
  level: number
}
