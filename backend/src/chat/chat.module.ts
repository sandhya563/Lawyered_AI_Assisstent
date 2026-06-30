import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { AiService } from './ai.service';
import { ConversationMessage } from '../entities/conversation-message.entity';
import { Will } from '../entities/will.entity';
import { Asset } from '../entities/asset.entity';
import { Beneficiary } from '../entities/beneficiary.entity';
import { AssetAllocation } from '../entities/asset-allocation.entity';
import { Witness } from '../entities/witness.entity';
import { LawyerReview } from '../entities/lawyer-review.entity';
import { WillModule } from '../will/will.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConversationMessage,
      Will,
      Asset,
      Beneficiary,
      AssetAllocation,
      Witness,
      LawyerReview,
    ]),
    WillModule,
    AuthModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, AiService],
  exports: [ChatService],
})
export class ChatModule {}
