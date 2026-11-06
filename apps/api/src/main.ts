import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { join } from 'node:path';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('port') ?? 3001;
  const apiPrefix = config.get<string>('apiPrefix') ?? 'api/v1';
  const appName = config.get<string>('appName') ?? 'AIQ HireFlow';
  const corsOrigins = config.get<string[]>('corsOrigins') ?? [
    'http://localhost:3000',
  ];

  app.setGlobalPrefix(apiPrefix, {
    exclude: ['docs', 'docs-json', 'docs-yaml'],
  });
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle(`${appName} API`)
    .setDescription(
      'Equipment Rental, Inventory & Operations Management API for AIQ Limited. Base path: /api/v1',
    )
    .setVersion('1.0.0')
    .setContact('AIQ Limited', 'https://www.aiqltd.co.tz/', 'info@aiqltd.co.tz')
    .addBearerAuth()
    .addTag('Health')
    .addTag('Auth')
    .addTag('Users')
    .addTag('Roles & Permissions')
    .addTag('Customers')
    .addTag('Equipment Categories')
    .addTag('Equipment Models')
    .addTag('Equipment Assets')
    .addTag('Inventory')
    .addTag('Pricing')
    .addTag('Rental Requests')
    .addTag('Quotations')
    .addTag('Rentals')
    .addTag('Dispatch')
    .addTag('Returns')
    .addTag('Maintenance')
    .addTag('Invoices')
    .addTag('Payments')
    .addTag('Deposits')
    .addTag('Expenses')
    .addTag('Dashboard')
    .addTag('Reports')
    .addTag('Audit Logs')
    .addTag('Files')
    .addTag('Settings')
    .build();

  const swaggerEnabled =
    (process.env.SWAGGER_ENABLED ?? 'true').toLowerCase() !== 'false';

  if (swaggerEnabled) {
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
      customSiteTitle: `${appName} API Docs`,
    });
  }

  await app.listen(port);
  console.log(`\n🚀 ${appName} API running on http://localhost:${port}/${apiPrefix}`);
  if (swaggerEnabled) {
    console.log(`📘 Swagger UI: http://localhost:${port}/docs\n`);
  }
}

await bootstrap();
