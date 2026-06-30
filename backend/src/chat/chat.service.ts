import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationMessage } from '../entities/conversation-message.entity';
import { Will, WillStatus } from '../entities/will.entity';
import { WillService } from '../will/will.service';
import { WillValidationService } from '../will/will-validation.service';
import { AiService } from './ai.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ConversationMessage)
    private readonly messageRepository: Repository<ConversationMessage>,
    @InjectRepository(Will)
    private readonly willRepository: Repository<Will>,
    private readonly willService: WillService,
    private readonly validationService: WillValidationService,
    private readonly aiService: AiService,
  ) {}

  async getMessages(willId: string): Promise<ConversationMessage[]> {
    return this.messageRepository.find({
      where: { willId },
      order: { createdAt: 'ASC' },
    });
  }

  async sendMessage(willId: string, userId: string, userMessage: string) {
    // Get the will
    const will = await this.willService.getWillById(willId, userId);

    // Mark as in_progress if still draft
    if (will.status === WillStatus.DRAFT) {
      await this.willRepository.update(willId, { status: WillStatus.IN_PROGRESS });
    }

    // Save user message
    const savedUserMsg = this.messageRepository.create({
      willId,
      role: 'user',
      content: userMessage,
    });
    await this.messageRepository.save(savedUserMsg);

    // Get recent messages for context (last 4 for cost efficiency)
    const recentMessages = await this.messageRepository.find({
      where: { willId },
      order: { createdAt: 'DESC' },
      take: 6,
    });
    const recentForAi = recentMessages
      .reverse()
      .slice(0, -1) // exclude the message we just saved (it goes in separately)
      .map((m) => ({ role: m.role, content: m.content }));

    // Get current will state for context
    const currentState = this.buildWillState(will);
    const missingFields = await this.validationService.getMissingFields(willId);

    // Call AI
    const aiResponse = await this.aiService.processMessage(
      userMessage,
      will.conversationSummary || '',
      recentForAi,
      missingFields,
      currentState,
    );

    // Process extracted data and update will
    if (aiResponse.extractedData) {
      await this.applyExtractedData(willId, aiResponse.extractedData);
    }

    // Update conversation summary (cost-efficient memory)
    const updatedSummary = await this.aiService.updateSummary(
      will.conversationSummary || '',
      userMessage,
      aiResponse.extractedData,
    );
    await this.willRepository.update(willId, {
      conversationSummary: updatedSummary,
      missingFields: await this.validationService.getMissingFields(willId),
    });

    // Save assistant message
    const savedAssistantMsg = this.messageRepository.create({
      willId,
      role: 'assistant',
      content: aiResponse.message,
      extractedData: aiResponse.extractedData || undefined,
    });
    await this.messageRepository.save(savedAssistantMsg);

    // Update user message with extracted data
    if (aiResponse.extractedData) {
      await this.messageRepository.update(savedUserMsg.id, {
        extractedData: aiResponse.extractedData,
      });
    }

    // Get updated will with validation
    const updatedWill = await this.willService.getWillById(willId, userId);
    const validation = await this.validationService.validateWill(willId);

    return {
      message: aiResponse.message,
      extractedData: aiResponse.extractedData,
      will: updatedWill,
      validation,
    };
  }

  async startConversation(willId: string): Promise<ConversationMessage> {
    // Check if there's already a greeting
    const existing = await this.messageRepository.findOne({
      where: { willId, role: 'assistant' },
      order: { createdAt: 'ASC' },
    });

    if (existing) {
      return existing;
    }

    const greeting = this.messageRepository.create({
      willId,
      role: 'assistant',
      content:
        "Hello! I'm here to help you create your will. It's a simple process — I'll ask you questions one at a time, and together we'll make sure everything is properly documented.\n\nLet's start with the basics. What is your full name, age, and where do you live?",
    });

    return this.messageRepository.save(greeting);
  }

  /**
   * Apply extracted data to the will - handles additions, updates, and removals
   */
  private async applyExtractedData(willId: string, data: Record<string, any>): Promise<void> {
    // Testator details
    const testatorUpdates: Partial<Will> = {};
    if (data.testator_full_name) testatorUpdates.testatorFullName = data.testator_full_name;
    if (data.testator_age) testatorUpdates.testatorAge = data.testator_age;
    if (data.testator_address) testatorUpdates.testatorAddress = data.testator_address;
    if (data.testator_sound_mind !== undefined) testatorUpdates.testatorSoundMind = data.testator_sound_mind;
    if (data.has_minor_children !== undefined) testatorUpdates.hasMinorChildren = data.has_minor_children;
    if (data.signing_date) testatorUpdates.signingDate = data.signing_date;
    if (data.signing_place) testatorUpdates.signingPlace = data.signing_place;

    if (Object.keys(testatorUpdates).length > 0) {
      await this.willRepository.update(willId, testatorUpdates);
    }

    // Executor
    if (data.executor) {
      await this.willRepository.update(willId, {
        executorName: data.executor.name,
        executorRelationship: data.executor.relationship || undefined,
        executorAddress: data.executor.address || undefined,
      });
    }
    if (data.remove_executor) {
      await this.willRepository.update(willId, {
        executorName: undefined,
        executorRelationship: undefined,
        executorAddress: undefined,
      } as any);
    }

    // Guardian
    if (data.guardian) {
      await this.willRepository.update(willId, {
        guardianName: data.guardian.name,
        guardianRelationship: data.guardian.relationship || undefined,
        guardianAddress: data.guardian.address || undefined,
        hasMinorChildren: true,
      });
    }
    if (data.remove_guardian) {
      await this.willRepository.update(willId, {
        guardianName: undefined,
        guardianRelationship: undefined,
        guardianAddress: undefined,
      } as any);
    }

    // Assets
    if (data.assets && Array.isArray(data.assets)) {
      for (const asset of data.assets) {
        // Check if asset already exists (fuzzy match by description)
        const existing = await this.willService.findAssetByDescription(willId, asset.description);
        if (!existing) {
          await this.willService.addAsset(willId, {
            description: asset.description,
            assetType: asset.asset_type || 'other',
            estimatedValue: asset.estimated_value || null,
          });
        }
      }
    }

    // Beneficiaries
    if (data.beneficiaries && Array.isArray(data.beneficiaries)) {
      for (const ben of data.beneficiaries) {
        const existing = await this.willService.findBeneficiaryByName(willId, ben.full_name);
        if (!existing) {
          await this.willService.addBeneficiary(willId, {
            fullName: ben.full_name,
            relationship: ben.relationship || 'Unknown',
            dateOfBirth: ben.date_of_birth || null,
            address: ben.address || null,
          });
        }
      }
    }

    // Allocations
    if (data.allocations && Array.isArray(data.allocations)) {
      for (const alloc of data.allocations) {
        const asset = await this.willService.findAssetByDescription(willId, alloc.asset_description);
        const beneficiary = await this.willService.findBeneficiaryByName(willId, alloc.beneficiary_name);

        if (asset && beneficiary) {
          await this.willService.setAllocation(
            asset.id,
            beneficiary.id,
            alloc.share_percentage,
            alloc.conditions || null,
          );
        }
      }
    }

    // Witnesses
    if (data.witnesses && Array.isArray(data.witnesses)) {
      for (const witness of data.witnesses) {
        await this.willService.addWitness(willId, {
          fullName: witness.full_name,
          address: witness.address || null,
          isBeneficiary: witness.is_beneficiary || false,
        });
      }
    }

    // Handle updates to existing beneficiaries
    if (data.update_beneficiary) {
      const existing = await this.willService.findBeneficiaryByName(
        willId,
        data.update_beneficiary.old_name,
      );
      if (existing) {
        await this.willService.updateBeneficiary(existing.id, data.update_beneficiary.new_data);
      }
    }

    // Handle updates to existing assets
    if (data.update_asset) {
      const existing = await this.willService.findAssetByDescription(
        willId,
        data.update_asset.old_description,
      );
      if (existing) {
        await this.willService.updateAsset(existing.id, data.update_asset.new_data);
      }
    }
  }

  private buildWillState(will: Will): Record<string, any> {
    return {
      testator: {
        fullName: will.testatorFullName,
        age: will.testatorAge,
        address: will.testatorAddress,
        soundMind: will.testatorSoundMind,
      },
      executor: will.executorName
        ? { name: will.executorName, relationship: will.executorRelationship }
        : null,
      guardian: will.guardianName
        ? { name: will.guardianName, relationship: will.guardianRelationship }
        : null,
      hasMinorChildren: will.hasMinorChildren,
      assets: will.assets?.map((a) => ({
        description: a.description,
        type: a.assetType,
        value: a.estimatedValue,
        allocations: a.allocations?.map((al) => ({
          beneficiary: al.beneficiary?.fullName,
          percentage: al.sharePercentage,
        })),
      })) || [],
      beneficiaries: will.beneficiaries?.map((b) => ({
        name: b.fullName,
        relationship: b.relationship,
      })) || [],
      witnesses: will.witnesses?.map((w) => ({
        name: w.fullName,
        isBeneficiary: w.isBeneficiary,
      })) || [],
    };
  }
}
