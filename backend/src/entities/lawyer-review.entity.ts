import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Will } from './will.entity';

@Entity('lawyer_reviews')
export class LawyerReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'will_id' })
  willId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'jsonb' })
  snapshot: Record<string, any>;

  @Column({ default: 'pending' })
  status: string;

  @Column({ name: 'reviewer_notes', type: 'text', nullable: true })
  reviewerNotes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Will)
  @JoinColumn({ name: 'will_id' })
  will: Will;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
