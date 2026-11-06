import { Module } from '@nestjs/common';
import { EquipmentAssetsController } from './equipment-assets.controller.js';
import { EquipmentAssetsService } from './equipment-assets.service.js';

@Module({
  controllers: [EquipmentAssetsController],
  providers: [EquipmentAssetsService],
  exports: [EquipmentAssetsService],
})
export class EquipmentAssetsModule {}
