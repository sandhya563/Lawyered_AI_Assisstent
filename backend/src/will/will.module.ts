import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WillController } from './will.controller';
import { WillService } from './will.service';
import { WillValidationService } from './will-validation.service';
import { Will } from '../entities/will.entity';
import { Asset } from '../entities/asset.entity';
import { Beneficiary } from '../entities/beneficiary.entity';
import { AssetAllocation } from '../entities/asset-allocation.entity';
import { Witness } from '../entities/witness.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Will, Asset, Beneficiary, AssetAllocation, Witness]),
    AuthModule,
  ],
  controllers: [WillController],
  providers: [WillService, WillValidationService],
  exports: [WillService, WillValidationService],
})
export class WillModule {}
