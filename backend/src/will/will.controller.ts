import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WillService } from './will.service';
import { WillValidationService } from './will-validation.service';

@Controller('wills')
@UseGuards(AuthGuard('jwt'))
export class WillController {
  constructor(
    private readonly willService: WillService,
    private readonly validationService: WillValidationService,
  ) {}

  @Post()
  async createWill(@Request() req: any) {
    return this.willService.createWill(req.user.id);
  }

  @Get()
  async getUserWills(@Request() req: any) {
    return this.willService.getUserWills(req.user.id);
  }

  @Get('active')
  async getActiveWill(@Request() req: any) {
    const will = await this.willService.getActiveWill(req.user.id);
    if (!will) {
      // Create a new will if none exists
      return this.willService.createWill(req.user.id);
    }
    return will;
  }

  @Get(':id')
  async getWill(@Param('id') id: string, @Request() req: any) {
    return this.willService.getWillById(id, req.user.id);
  }

  @Get(':id/validate')
  async validateWill(@Param('id') id: string, @Request() req: any) {
    // Ensure user owns this will
    await this.willService.getWillById(id, req.user.id);
    return this.validationService.validateWill(id);
  }
}
