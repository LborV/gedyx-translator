import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity()
export class TasksEntity extends BaseEntity {
  @Column({ type: 'longtext' })
  data: string;
}
