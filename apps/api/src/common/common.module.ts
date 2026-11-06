import { Global, Module } from '@nestjs/common';
import { AuditService } from './services/audit.service.js';
import { DocumentNumberService } from './services/document-number.service.js';

@Global()
@Module({
  providers: [DocumentNumberService, AuditService],
  exports: [DocumentNumberService, AuditService],
})
export class CommonModule {}
