import { Module } from '@nestjs/common';
import { EquipmentCategoriesController } from './equipment-categories.controller.js';
import { EquipmentCategoriesService } from './equipment-categories.service.js';

@Module({
  controllers: [EquipmentCategoriesController],
  providers: [EquipmentCategoriesService],
  exports: [EquipmentCategoriesService],
})
export class EquipmentCategoriesModule {}
