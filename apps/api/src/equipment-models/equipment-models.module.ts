import { Module } from '@nestjs/common';
import { EquipmentModelsController } from './equipment-models.controller.js';
import { EquipmentModelsService } from './equipment-models.service.js';

@Module({
  controllers: [EquipmentModelsController],
  providers: [EquipmentModelsService],
  exports: [EquipmentModelsService],
})
export class EquipmentModelsModule {}
