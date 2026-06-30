import { Injectable, BadRequestException } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Will } from '../entities/will.entity';
import { WillService } from '../will/will.service';
import { WillValidationService } from '../will/will-validation.service';

@Injectable()
export class DocumentService {
  constructor(
    private readonly willService: WillService,
    private readonly validationService: WillValidationService,
  ) {}

  async generateWillDocument(willId: string, userId: string): Promise<Buffer> {
    // First validate - only generate if valid
    const validation = await this.validationService.validateWill(willId);
    if (!validation.canFinalize) {
      throw new BadRequestException({
        message: 'Will cannot be finalized yet. Please complete all required fields.',
        validation,
      });
    }

    const will = await this.willService.getWillById(willId, userId);

    // Mark as complete
    await this.willService.markComplete(willId);

    return this.buildPdf(will);
  }

  /**
   * Generate a preview (even if incomplete) for the live preview panel
   */
  async generatePreview(willId: string, userId: string): Promise<Record<string, any>> {
    const will = await this.willService.getWillById(willId, userId);
    const validation = await this.validationService.validateWill(willId);

    return {
      will: this.formatWillForPreview(will),
      validation,
    };
  }

  private formatWillForPreview(will: Will): Record<string, any> {
    return {
      testator: {
        fullName: will.testatorFullName || '[Not provided]',
        age: will.testatorAge || '[Not provided]',
        address: will.testatorAddress || '[Not provided]',
        soundMind: will.testatorSoundMind,
      },
      executor: will.executorName
        ? {
            name: will.executorName,
            relationship: will.executorRelationship,
            address: will.executorAddress,
          }
        : null,
      guardian: will.guardianName
        ? {
            name: will.guardianName,
            relationship: will.guardianRelationship,
            address: will.guardianAddress,
          }
        : null,
      hasMinorChildren: will.hasMinorChildren,
      assets:
        will.assets?.map((asset) => ({
          id: asset.id,
          description: asset.description,
          type: asset.assetType,
          value: asset.estimatedValue,
          allocations:
            asset.allocations?.map((alloc) => ({
              beneficiaryName: alloc.beneficiary?.fullName,
              sharePercentage: Number(alloc.sharePercentage),
              conditions: alloc.conditions,
            })) || [],
        })) || [],
      beneficiaries:
        will.beneficiaries?.map((b) => ({
          id: b.id,
          fullName: b.fullName,
          relationship: b.relationship,
          dateOfBirth: b.dateOfBirth,
        })) || [],
      witnesses:
        will.witnesses?.map((w) => ({
          id: w.id,
          fullName: w.fullName,
          address: w.address,
          isBeneficiary: w.isBeneficiary,
        })) || [],
      signingDate: will.signingDate,
      signingPlace: will.signingPlace,
      status: will.status,
    };
  }

  private buildPdf(will: Will): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 60, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Title
      doc.fontSize(20).font('Helvetica-Bold').text('LAST WILL AND TESTAMENT', { align: 'center' });
      doc.moveDown(2);

      // Section 1: Testator Declaration
      doc.fontSize(12).font('Helvetica-Bold').text('1. DECLARATION');
      doc.moveDown(0.5);
      doc.font('Helvetica').text(
        `I, ${will.testatorFullName}, aged ${will.testatorAge} years, residing at ${will.testatorAddress}, ` +
        `being of sound mind and disposing memory, do hereby declare this to be my Last Will and Testament.`,
      );
      doc.moveDown(1);

      // Section 2: Revocation
      doc.font('Helvetica-Bold').text('2. REVOCATION OF PREVIOUS WILLS');
      doc.moveDown(0.5);
      doc.font('Helvetica').text(
        'I hereby revoke all previous Wills, Codicils, and Testamentary Dispositions made by me at any time heretofore.',
      );
      doc.moveDown(1);

      // Section 3: Assets and Distribution
      doc.font('Helvetica-Bold').text('3. DISTRIBUTION OF ASSETS');
      doc.moveDown(0.5);
      doc.font('Helvetica').text('I direct that my assets be distributed as follows:');
      doc.moveDown(0.5);

      if (will.assets) {
        will.assets.forEach((asset, index) => {
          doc.font('Helvetica-Bold').text(`${index + 1}. ${asset.description}`, { indent: 20 });
          if (asset.estimatedValue) {
            doc.font('Helvetica').text(`   Estimated Value: ${asset.estimatedValue}`, { indent: 20 });
          }
          if (asset.allocations && asset.allocations.length > 0) {
            asset.allocations.forEach((alloc) => {
              const beneficiaryName = alloc.beneficiary?.fullName || 'Unknown';
              doc.text(
                `   → ${alloc.sharePercentage}% to ${beneficiaryName}` +
                (alloc.conditions ? ` (${alloc.conditions})` : ''),
                { indent: 30 },
              );
            });
          }
          doc.moveDown(0.3);
        });
      }
      doc.moveDown(1);

      // Section 4: Executor
      doc.font('Helvetica-Bold').text('4. APPOINTMENT OF EXECUTOR');
      doc.moveDown(0.5);
      doc.font('Helvetica').text(
        `I appoint ${will.executorName}` +
        (will.executorRelationship ? ` (my ${will.executorRelationship})` : '') +
        ` as the Executor of this Will, to administer my estate according to the terms herein.`,
      );
      doc.moveDown(1);

      // Section 5: Guardian (if applicable)
      if (will.hasMinorChildren && will.guardianName) {
        doc.font('Helvetica-Bold').text('5. APPOINTMENT OF GUARDIAN');
        doc.moveDown(0.5);
        doc.font('Helvetica').text(
          `I appoint ${will.guardianName}` +
          (will.guardianRelationship ? ` (my ${will.guardianRelationship})` : '') +
          ` as the guardian of my minor children.`,
        );
        doc.moveDown(1);
      }

      // Section 6: Signature
      const sigSection = will.hasMinorChildren && will.guardianName ? '6' : '5';
      doc.font('Helvetica-Bold').text(`${sigSection}. SIGNATURE`);
      doc.moveDown(0.5);
      doc.font('Helvetica').text(
        `Signed on this ${will.signingDate ? new Date(will.signingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '____'} ` +
        `at ${will.signingPlace || '________'}.`,
      );
      doc.moveDown(2);

      // Signature lines
      doc.text('_________________________________');
      doc.text(`${will.testatorFullName} (Testator)`);
      doc.moveDown(2);

      // Witnesses
      const witSection = will.hasMinorChildren && will.guardianName ? '7' : '6';
      doc.font('Helvetica-Bold').text(`${witSection}. WITNESSES`);
      doc.moveDown(0.5);
      doc.font('Helvetica').text(
        'We, the undersigned, do hereby attest that the above Will was signed in our presence:',
      );
      doc.moveDown(1);

      if (will.witnesses) {
        will.witnesses.forEach((witness, index) => {
          doc.text(`Witness ${index + 1}: ${witness.fullName}`);
          if (witness.address) {
            doc.text(`Address: ${witness.address}`, { indent: 20 });
          }
          doc.moveDown(0.5);
          doc.text('Signature: _________________________________');
          doc.moveDown(1);
        });
      }

      doc.end();
    });
  }
}
