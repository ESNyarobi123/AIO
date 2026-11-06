import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module.js';
import { DispatchController } from './dispatch.controller.js';
import { DispatchService } from './dispatch.service.js';

@Module({
  imports: [InventoryModule],
  controllers: [DispatchController],
  providers: [DispatchService],
  exports: [DispatchService],
})
export class DispatchModule {}
