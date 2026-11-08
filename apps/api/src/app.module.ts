import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuditLogsModule } from './audit-logs/audit-logs.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CommonModule } from './common/common.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from './common/guards/permissions.guard.js';
import configuration from './config/configuration.js';
import { CustomersModule } from './customers/customers.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { DepositsModule } from './deposits/deposits.module.js';
import { DispatchModule } from './dispatch/dispatch.module.js';
import { EquipmentAssetsModule } from './equipment-assets/equipment-assets.module.js';
import { EquipmentCategoriesModule } from './equipment-categories/equipment-categories.module.js';
import { EquipmentModelsModule } from './equipment-models/equipment-models.module.js';
import { ExpensesModule } from './expenses/expenses.module.js';
import { FilesModule } from './files/files.module.js';
import { HealthModule } from './health/health.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { InvoicesModule } from './invoices/invoices.module.js';
import { MaintenanceModule } from './maintenance/maintenance.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { PricingModule } from './pricing/pricing.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { QuotationsModule } from './quotations/quotations.module.js';
import { RentalRequestsModule } from './rental-requests/rental-requests.module.js';
import { RentalsModule } from './rentals/rentals.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { ReturnsModule } from './returns/returns.module.js';
import { RolesModule } from './roles/roles.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { StaffHiresModule } from './staff-hires/staff-hires.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    PrismaModule,
    CommonModule,
    HealthModule,
    AuthModule,
    UsersModule,
    RolesModule,
    CustomersModule,
    EquipmentCategoriesModule,
    EquipmentModelsModule,
    EquipmentAssetsModule,
    InventoryModule,
    PricingModule,
    RentalRequestsModule,
    QuotationsModule,
    RentalsModule,
    DispatchModule,
    ReturnsModule,
    StaffHiresModule,
    MaintenanceModule,
    InvoicesModule,
    PaymentsModule,
    DepositsModule,
    ExpensesModule,
    DashboardModule,
    ReportsModule,
    AuditLogsModule,
    FilesModule,
    SettingsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
