import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { DocumentService } from './document.service';

@Controller('documents')
@UseGuards(AuthGuard('jwt'))
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Get(':willId/preview')
  async getPreview(@Param('willId') willId: string, @Request() req: any) {
    return this.documentService.generatePreview(willId, req.user.id);
  }

  @Get(':willId/download')
  async downloadPdf(
    @Param('willId') willId: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.documentService.generateWillDocument(willId, req.user.id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="will-${willId}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }
}
