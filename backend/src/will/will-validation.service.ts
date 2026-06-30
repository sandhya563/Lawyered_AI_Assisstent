import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Will } from '../entities/will.entity';
import { Asset } from '../entities/asset.entity';
import { AssetAllocation } from '../entities/asset-allocation.entity';
import { Witness } from '../entities/witness.entity';
import { Beneficiary } from '../entities/beneficiary.entity';

/**
 * Part 4: Rules that keep the will valid
 * 
 * Three distinct states:
 * - INCOMPLETE: Missing required information (not finished yet)
 * - ERROR: Has a real problem that prevents finalization
 * - WARNING: Something to note, but not a hard stop
 */

export interface ValidationResult {
  isValid: boolean;
  canFinalize: boolean;
  completionPercentage: number;
  incomplete: ValidationIssue[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ValidationIssue {
  field: string;
  message: string;
  type: 'incomplete' | 'error' | 'warning';
}

@Injectable()
export class WillValidationService {
  constructor(
    @InjectRepository(Will)
    private readonly willRepository: Repository<Will>,
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    @InjectRepository(AssetAllocation)
    private readonly allocationRepository: Repository<AssetAllocation>,
    @InjectRepository(Witness)
    private readonly witnessRepository: Repository<Witness>,
    @InjectRepository(Beneficiary)
    private readonly beneficiaryRepository: Repository<Beneficiary>,
  ) {}

  async validateWill(willId: string): Promise<ValidationResult> {
    const will = await this.willRepository.findOne({
      where: { id: willId },
      relations: ['assets', 'assets.allocations', 'beneficiaries', 'witnesses'],
    });

    if (!will) {
      return {
        isValid: false,
        canFinalize: false,
        completionPercentage: 0,
        incomplete: [{ field: 'will', message: 'Will not found', type: 'incomplete' }],
        errors: [],
        warnings: [],
      };
    }

    const incomplete: ValidationIssue[] = [];
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    // --- INCOMPLETE checks (not finished yet) ---

    // Testator details
    if (!will.testatorFullName) {
      incomplete.push({ field: 'testator_name', message: 'Full name is required', type: 'incomplete' });
    }
    if (!will.testatorAge) {
      incomplete.push({ field: 'testator_age', message: 'Age is required', type: 'incomplete' });
    }
    if (!will.testatorAddress) {
      incomplete.push({ field: 'testator_address', message: 'Address is required', type: 'incomplete' });
    }

    // Executor
    if (!will.executorName) {
      incomplete.push({ field: 'executor', message: 'An executor must be named', type: 'incomplete' });
    }

    // Assets
    if (!will.assets || will.assets.length === 0) {
      incomplete.push({ field: 'assets', message: 'At least one asset is required', type: 'incomplete' });
    }

    // Beneficiaries
    if (!will.beneficiaries || will.beneficiaries.length === 0) {
      incomplete.push({ field: 'beneficiaries', message: 'At least one beneficiary is required', type: 'incomplete' });
    }

    // Witnesses - must have at least two
    if (!will.witnesses || will.witnesses.length < 2) {
      incomplete.push({
        field: 'witnesses',
        message: `At least 2 witnesses are required (currently ${will.witnesses?.length || 0})`,
        type: 'incomplete',
      });
    }

    // Guardian required if minor children
    if (will.hasMinorChildren && !will.guardianName) {
      incomplete.push({
        field: 'guardian',
        message: 'A guardian is required because there are minor children',
        type: 'incomplete',
      });
    }

    // --- ERROR checks (real problems) ---

    // Shares of each asset must add up to 100%
    if (will.assets && will.assets.length > 0) {
      for (const asset of will.assets) {
        if (asset.allocations && asset.allocations.length > 0) {
          const totalShares = asset.allocations.reduce(
            (sum, alloc) => sum + Number(alloc.sharePercentage),
            0,
          );
          if (Math.abs(totalShares - 100) > 0.01) {
            errors.push({
              field: `asset_allocation_${asset.id}`,
              message: `Shares for "${asset.description}" add up to ${totalShares}%, not 100%`,
              type: 'error',
            });
          }
        } else {
          incomplete.push({
            field: `asset_allocation_${asset.id}`,
            message: `"${asset.description}" has no beneficiary assigned yet`,
            type: 'incomplete',
          });
        }
      }
    }

    // --- WARNING checks (not a hard stop) ---

    // Witness is also a beneficiary
    if (will.witnesses && will.beneficiaries) {
      for (const witness of will.witnesses) {
        const isBeneficiary = will.beneficiaries.some(
          (b) => b.fullName.toLowerCase() === witness.fullName.toLowerCase(),
        );
        if (isBeneficiary || witness.isBeneficiary) {
          warnings.push({
            field: `witness_${witness.id}`,
            message: `Witness "${witness.fullName}" is also a beneficiary — this may cause legal issues`,
            type: 'warning',
          });
        }
      }
    }

    // Calculate completion percentage
    const totalChecks = 8; // testator(3) + executor + assets + beneficiaries + witnesses + allocations
    const passedChecks = totalChecks - incomplete.length;
    const completionPercentage = Math.round((Math.max(0, passedChecks) / totalChecks) * 100);

    const canFinalize = incomplete.length === 0 && errors.length === 0;

    return {
      isValid: canFinalize,
      canFinalize,
      completionPercentage: Math.min(100, completionPercentage),
      incomplete,
      errors,
      warnings,
    };
  }

  /**
   * Returns a list of what's still missing - used by the AI to know what to ask next
   */
  async getMissingFields(willId: string): Promise<string[]> {
    const result = await this.validateWill(willId);
    return result.incomplete.map((i) => i.field);
  }
}
