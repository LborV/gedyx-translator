import { Column, Entity, ManyToMany, OneToMany } from 'typeorm'
import { BaseEntity } from './base.entity'
import { Documents } from './documents.entity'

@Entity()
export class Tokens extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string

  @OneToMany(() => Documents, (document) => document.id)
  document: Documents

  @Column({ type: 'bigint' })
  version: number

  @Column({ type: 'text' })
  hash: string

  @Column({ type: 'text' })
  value: string

  @OneToMany(() => Tokens, (token) => token.id)
  closestToken: Tokens

  @ManyToMany(() => Tokens, (token) => token.id)
  children: Tokens[]

  @ManyToMany(() => Tokens, (token) => token.id)
  subTokens: Tokens[]
}
