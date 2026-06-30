import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Will } from './will.entity';

@Entity('conversation_messages')
export class ConversationMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'will_id' })
  willId: string;

  @Column()
  role: string; // 'user', 'assistant', 'system'

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'extracted_data', type: 'jsonb', nullable: true })
  extractedData: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Will, (will) => will.conversationMessages)
  @JoinColumn({ name: 'will_id' })
  will: Will;
}
