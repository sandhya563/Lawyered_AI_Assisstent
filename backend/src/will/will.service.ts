import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Will, WillStatus } from '../entities/will.entity';
import { Asset } from '../entities/asset.entity';
import { Beneficiary } from '../entities/beneficiary.entity';
import { AssetAllocation } from '../entities/asset-allocation.entity';
import { Witness } from '../entities/witness.entity';

@Injectable()
export class WillService {
  constructor(
    @InjectRepository(Will)
    private readonly willRepository: Repository<Will>,
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    @InjectRepository(Beneficiary)
    private readonly beneficiaryRepository: Repository<Beneficiary>,
    @InjectRepository(AssetAllocation)
    private readonly allocationRepository: Repository<AssetAllocation>,
    @InjectRepository(Witness)
    private readonly witnessRepository: Repository<Witness>,
  ) {}

  async createWill(userId: string): Promise<Will> {
    const will = this.willRepository.create({
      userId,
      status: WillStatus.DRAFT,
      missingFields: [
        'testator_details',
        'assets',
        'beneficiaries',
        'asset_allocations',
        'executor',
        'witnesses',
      ],
    });
    return this.willRepository.save(will);
  }

  async getWillById(willId: string, userId: string): Promise<Will> {
    const will = await this.willRepository.findOne({
      where: { id: willId },
      relations: ['assets', 'assets.allocations', 'assets.allocations.beneficiary', 'beneficiaries', 'witnesses'],
    });

    if (!will) {
      throw new NotFoundException('Will not found');
    }

    if (will.userId !== userId) {
      throw new ForbiddenException('You do not have access to this will');
    }

    return will;
  }

  async getUserWills(userId: string): Promise<Will[]> {
    return this.willRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
  }

  async getActiveWill(userId: string): Promise<Will | null> {
    const will = await this.willRepository.findOne({
      where: { userId, status: WillStatus.IN_PROGRESS },
      relations: ['assets', 'assets.allocations', 'assets.allocations.beneficiary', 'beneficiaries', 'witnesses'],
      order: { updatedAt: 'DESC' },
    });

    if (!will) {
      // Check for draft
      const draft = await this.willRepository.findOne({
        where: { userId, status: WillStatus.DRAFT },
        relations: ['assets', 'assets.allocations', 'assets.allocations.beneficiary', 'beneficiaries', 'witnesses'],
        order: { updatedAt: 'DESC' },
      });
      return draft || null;
    }

    return will;
  }

  async updateWillFields(willId: string, updates: Partial<Will>): Promise<Will> {
    await this.willRepository.update(willId, updates);
    const will = await this.willRepository.findOne({
      where: { id: willId },
      relations: ['assets', 'assets.allocations', 'assets.allocations.beneficiary', 'beneficiaries', 'witnesses'],
    });
    return will!;
  }

  async addAsset(willId: string, assetData: Partial<Asset>): Promise<Asset> {
    const asset = this.assetRepository.create({ ...assetData, willId });
    return this.assetRepository.save(asset);
  }

  async updateAsset(assetId: string, updates: Partial<Asset>): Promise<Asset> {
    await this.assetRepository.update(assetId, updates);
    const asset = await this.assetRepository.findOne({ where: { id: assetId } });
    return asset!;
  }

  async removeAsset(assetId: string): Promise<void> {
    await this.assetRepository.delete(assetId);
  }

  async addBeneficiary(willId: string, data: Partial<Beneficiary>): Promise<Beneficiary> {
    const beneficiary = this.beneficiaryRepository.create({ ...data, willId });
    return this.beneficiaryRepository.save(beneficiary);
  }

  async updateBeneficiary(beneficiaryId: string, updates: Partial<Beneficiary>): Promise<Beneficiary> {
    await this.beneficiaryRepository.update(beneficiaryId, updates);
    const beneficiary = await this.beneficiaryRepository.findOne({ where: { id: beneficiaryId } });
    return beneficiary!;
  }

  async removeBeneficiary(beneficiaryId: string): Promise<void> {
    await this.beneficiaryRepository.delete(beneficiaryId);
  }

  async setAllocation(assetId: string, beneficiaryId: string, sharePercentage: number, conditions?: string): Promise<AssetAllocation> {
    // Check if allocation already exists
    let allocation = await this.allocationRepository.findOne({
      where: { assetId, beneficiaryId },
    });

    if (allocation) {
      allocation.sharePercentage = sharePercentage;
      allocation.conditions = conditions || null;
    } else {
      allocation = this.allocationRepository.create({
        assetId,
        beneficiaryId,
        sharePercentage,
        conditions: conditions || null,
      });
    }

    return this.allocationRepository.save(allocation);
  }

  async removeAllocation(allocationId: string): Promise<void> {
    await this.allocationRepository.delete(allocationId);
  }

  async removeAllocationsByAsset(assetId: string): Promise<void> {
    await this.allocationRepository.delete({ assetId });
  }

  async addWitness(willId: string, data: Partial<Witness>): Promise<Witness> {
    const witness = this.witnessRepository.create({ ...data, willId });
    return this.witnessRepository.save(witness);
  }

  async removeWitness(witnessId: string): Promise<void> {
    await this.witnessRepository.delete(witnessId);
  }

  async findBeneficiaryByName(willId: string, name: string): Promise<Beneficiary | null> {
    const beneficiaries = await this.beneficiaryRepository.find({ where: { willId } });
    const normalizedName = name.toLowerCase().trim();
    return beneficiaries.find(b => b.fullName.toLowerCase().includes(normalizedName)) || null;
  }

  async findAssetByDescription(willId: string, description: string): Promise<Asset | null> {
    const assets = await this.assetRepository.find({ where: { willId } });
    const normalizedDesc = description.toLowerCase().trim();
    return assets.find(a => a.description.toLowerCase().includes(normalizedDesc)) || null;
  }

  async markComplete(willId: string): Promise<Will> {
    await this.willRepository.update(willId, {
      status: WillStatus.COMPLETE,
      completedAt: new Date(),
      missingFields: [],
    });
    const will = await this.willRepository.findOne({
      where: { id: willId },
      relations: ['assets', 'assets.allocations', 'assets.allocations.beneficiary', 'beneficiaries', 'witnesses'],
    });
    return will!;
  }
}
