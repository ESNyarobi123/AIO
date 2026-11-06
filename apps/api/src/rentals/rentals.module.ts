import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module.js';
import { RentalsController } from './rentals.controller.js';
import { RentalsService } from './rentals.service.js';

@Module({
  imports: [InventoryModule],
  controllers: [RentalsController],
  providers: [RentalsService],
  exports: [RentalsService],
})
export class RentalsModule {}
