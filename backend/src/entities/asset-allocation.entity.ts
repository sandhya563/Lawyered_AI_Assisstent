import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Asset } from './asset.entity';
import { Beneficiary } from './beneficiary.entity';

@Entity('asset_allocations')
export class AssetAllocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'asset_id' })
  assetId: string;

  @Column({ name: 'beneficiary_id' })
  beneficiaryId: string;

  @Column({ name: 'share_percentage', type: 'decimal', precision: 5, scale: 2 })
  sharePercentage: number;

  @Column({ type: 'text', nullable: true })
  conditions: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Asset, (asset) => asset.allocations)
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @ManyToOne(() => Beneficiary, (beneficiary) => beneficiary.allocations)
  @JoinColumn({ name: 'beneficiary_id' })
  beneficiary: Beneficiary;
}
