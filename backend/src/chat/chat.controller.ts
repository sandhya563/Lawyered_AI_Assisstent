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
import { IsString, MinLength } from 'class-validator';

class SendMessageDto {
  @IsString()
  @MinLength(1, { message: 'Message cannot be empty' })
  message: string;
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
  async startConversation(@Param('willId') willId: string) {
    return this.chatService.startConversation(willId);
  }

  @Post(':willId/send')
  async sendMessage(
    @Param('willId') willId: string,
    @Request() req: any,
    @Body() body: SendMessageDto,
  ) {
    return this.chatService.sendMessage(willId, req.user.id, body.message);
  }
}
