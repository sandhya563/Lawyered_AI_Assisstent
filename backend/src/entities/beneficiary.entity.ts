import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Will } from './will.entity';
import { AssetAllocation } from './asset-allocation.entity';

@Entity('beneficiaries')
export class Beneficiary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'will_id' })
  willId: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column()
  relationship: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({ nullable: true })
  address: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Will, (will) => will.beneficiaries)
  @JoinColumn({ name: 'will_id' })
  will: Will;

  @OneToMany(() => AssetAllocation, (allocation) => allocation.beneficiary)
  allocations: AssetAllocation[];
}
