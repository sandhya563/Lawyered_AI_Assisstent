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
import { User } from './user.entity';
import { Asset } from './asset.entity';
import { Beneficiary } from './beneficiary.entity';
import { Witness } from './witness.entity';
import { ConversationMessage } from './conversation-message.entity';

export enum WillStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  COMPLETE = 'complete',
  INVALID = 'invalid',
}

@Entity('wills')
export class Will {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', enum: WillStatus, default: WillStatus.DRAFT })
  status: WillStatus;

  // Testator details
  @Column({ name: 'testator_full_name', type: 'varchar', nullable: true })
  testatorFullName: string;

  @Column({ name: 'testator_age', type: 'int', nullable: true })
  testatorAge: number;

  @Column({ name: 'testator_address', type: 'text', nullable: true })
  testatorAddress: string;

  @Column({ name: 'testator_sound_mind', default: false })
  testatorSoundMind: boolean;

  // Guardian
  @Column({ name: 'guardian_name', type: 'varchar', nullable: true })
  guardianName: string | null;

  @Column({ name: 'guardian_relationship', type: 'varchar', nullable: true })
  guardianRelationship: string | null;

  @Column({ name: 'guardian_address', type: 'text', nullable: true })
  guardianAddress: string | null;

  @Column({ name: 'has_minor_children', default: false })
  hasMinorChildren: boolean;

  // Executor
  @Column({ name: 'executor_name', type: 'varchar', nullable: true })
  executorName: string | null;

  @Column({ name: 'executor_relationship', type: 'varchar', nullable: true })
  executorRelationship: string | null;

  @Column({ name: 'executor_address', type: 'text', nullable: true })
  executorAddress: string | null;

  // Signature
  @Column({ name: 'signing_date', type: 'date', nullable: true })
  signingDate: Date;

  @Column({ name: 'signing_place', type: 'varchar', nullable: true })
  signingPlace: string;

  // AI conversation state
  @Column({ name: 'conversation_summary', type: 'text', nullable: true })
  conversationSummary: string;

  @Column({ name: 'missing_fields', type: 'jsonb', default: '[]' })
  missingFields: string[];

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.wills)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Asset, (asset) => asset.will, { cascade: true })
  assets: Asset[];

  @OneToMany(() => Beneficiary, (beneficiary) => beneficiary.will, { cascade: true })
  beneficiaries: Beneficiary[];

  @OneToMany(() => Witness, (witness) => witness.will, { cascade: true })
  witnesses: Witness[];

  @OneToMany(() => ConversationMessage, (msg) => msg.will, { cascade: true })
  conversationMessages: ConversationMessage[];
}
