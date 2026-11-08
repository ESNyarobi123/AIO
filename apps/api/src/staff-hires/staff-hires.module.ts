import { Module } from '@nestjs/common';
import { StaffHiresController } from './staff-hires.controller.js';
import { StaffHiresService } from './staff-hires.service.js';

@Module({
  controllers: [StaffHiresController],
  providers: [StaffHiresService],
  exports: [StaffHiresService],
})
export class StaffHiresModule {}
