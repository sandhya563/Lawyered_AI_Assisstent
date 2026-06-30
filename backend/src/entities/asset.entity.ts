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

@Entity('assets')
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'will_id' })
  willId: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'asset_type' })
  assetType: string;

  @Column({ name: 'estimated_value', nullable: true })
  estimatedValue: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Will, (will) => will.assets)
  @JoinColumn({ name: 'will_id' })
  will: Will;

  @OneToMany(() => AssetAllocation, (allocation) => allocation.asset, { cascade: true })
  allocations: AssetAllocation[];
}
