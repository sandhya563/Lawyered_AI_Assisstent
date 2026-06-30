import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';
import { IsOptional, IsString, MinLength } from 'class-validator';

class SendMessageDto {
  @IsString()
  @MinLength(1, { message: 'Message cannot be empty' })
  message: string;

  @IsOptional()
  @IsString()
  mode?: 'default' | 'hinglish';
}

class StartConversationDto {
  @IsOptional()
  @IsString()
  mode?: 'default' | 'hinglish';
}

@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get(':willId/messages')
  async getMessages(@Param('willId') willId: string) {
    return this.chatService.getMessages(willId);
  }

  @Post(':willId/start')
  async startConversation(
    @Param('willId') willId: string,
    @Body() body: StartConversationDto,
  ) {
    return this.chatService.startConversation(willId, body?.mode || 'default');
  }

  @Post(':willId/send')
  async sendMessage(
    @Param('willId') willId: string,
    @Request() req: any,
    @Body() body: SendMessageDto,
  ) {
    return this.chatService.sendMessage(
      willId,
      req.user.id,
      body.message,
      body.mode || 'default',
    );
  }

  @Post(':willId/send-to-lawyer')
  async sendToLawyer(
    @Param('willId') willId: string,
    @Request() req: any,
  ) {
    return this.chatService.createLawyerSnapshot(willId, req.user.id);
  }
}
