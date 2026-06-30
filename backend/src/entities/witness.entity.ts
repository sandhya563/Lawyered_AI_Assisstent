import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Will } from './will.entity';

@Entity('witnesses')
export class Witness {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'will_id' })
  willId: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ nullable: true })
  address: string;

  @Column({ name: 'is_beneficiary', default: false })
  isBeneficiary: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Will, (will) => will.witnesses)
  @JoinColumn({ name: 'will_id' })
  will: Will;
}
