import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator.js';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { ok } from '../common/utils/api-response.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { randomUUID } from 'node:crypto';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const UPLOAD_ROOT = join(process.cwd(), 'uploads');

type UploadedImage = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

class ImageLinkDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  modelId?: string;
}

class ImageUrlDto extends ImageLinkDto {
  @ApiProperty({ example: 'https://example.com/poker.jpg' })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  url!: string;
}

class RegisterFileDto {
  @ApiProperty({ example: 'poker-out.jpg' })
  @IsString()
  @MinLength(1)
  originalFilename!: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  mimeType!: string;

  @ApiProperty({ example: 154844 })
  @IsInt()
  @Min(1)
  sizeBytes!: number;

  @ApiPropertyOptional({ description: 'Optional linked asset id' })
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @ApiPropertyOptional({ description: 'Optional linked model id' })
  @IsOptional()
  @IsUUID()
  modelId?: string;
}

@Injectable()
class FilesService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterFileDto, actor: AuthUser) {
    const storageKey = `uploads/${new Date().getFullYear()}/${randomUUID()}-${dto.originalFilename}`;
    const file = await this.prisma.fileObject.create({
      data: {
        storageKey,
        originalFilename: dto.originalFilename,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        uploadedById: actor.id,
      },
    });

    if (dto.assetId || dto.modelId) {
      await this.prisma.equipmentImage.create({
        data: {
          assetId: dto.assetId,
          modelId: dto.modelId,
          fileKey: storageKey,
          originalFilename: dto.originalFilename,
          mimeType: dto.mimeType,
          sizeBytes: dto.sizeBytes,
          uploadedById: actor.id,
        },
      });
    }

    return ok(
      {
        ...file,
        uploadHint:
          'Store binary at storageKey via S3-compatible storage; metadata is registered',
      },
      { created: true },
    );
  }

  async findOne(id: string) {
    const file = await this.prisma.fileObject.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('File not found');
    return ok(file);
  }

  async saveUpload(file: UploadedImage | undefined, link: ImageLinkDto, actor: AuthUser) {
    if (!file) throw new BadRequestException('Choose an image file');
    if (!IMAGE_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Use a JPEG, PNG, WebP or GIF image');
    }
    const extension = extname(file.originalname).toLowerCase() || '.img';
    const storageKey = `uploads/${randomUUID()}${extension}`;
    await mkdir(UPLOAD_ROOT, { recursive: true });
    await writeFile(join(process.cwd(), storageKey), file.buffer);
    return this.persist(
      {
        storageKey,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
      link,
      actor,
    );
  }

  async saveUrl(dto: ImageUrlDto, actor: AuthUser) {
    const filename = dto.url.split('/').pop()?.split('?')[0] || 'remote-image';
    return this.persist(
      {
        storageKey: dto.url,
        originalFilename: filename,
        mimeType: 'image/remote',
        sizeBytes: 0,
      },
      dto,
      actor,
    );
  }

  private async persist(
    file: {
      storageKey: string;
      originalFilename: string;
      mimeType: string;
      sizeBytes: number;
    },
    link: ImageLinkDto,
    actor: AuthUser,
  ) {
    const stored = await this.prisma.fileObject.create({
      data: {
        storageKey: file.storageKey,
        originalFilename: file.originalFilename.slice(0, 180),
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        uploadedById: actor.id,
      },
    });
    const image =
      link.assetId || link.modelId
        ? await this.prisma.equipmentImage.create({
            data: {
              assetId: link.assetId,
              modelId: link.modelId,
              fileKey: file.storageKey,
              originalFilename: file.originalFilename.slice(0, 180),
              mimeType: file.mimeType,
              sizeBytes: file.sizeBytes,
              uploadedById: actor.id,
            },
          })
        : null;
    return ok({ ...stored, image, publicUrl: publicUrl(file.storageKey) }, { created: true });
  }
}

function publicUrl(storageKey: string) {
  if (storageKey.startsWith('http://') || storageKey.startsWith('https://')) return storageKey;
  return `/${storageKey}`;
}

@ApiTags('Files')
@ApiBearerAuth()
@Controller('files')
class FilesController {
  constructor(private readonly service: FilesService) {}

  @Post('upload')
  @Permissions('equipment.update')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  @ApiOperation({ summary: 'Upload an equipment image file' })
  upload(
    @UploadedFile() file: UploadedImage,
    @Body() dto: ImageLinkDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.saveUpload(file, dto, user);
  }

  @Post('from-url')
  @Permissions('equipment.update')
  @ApiOperation({ summary: 'Attach an equipment image from a URL' })
  fromUrl(@Body() dto: ImageUrlDto, @CurrentUser() user: AuthUser) {
    return this.service.saveUrl(dto, user);
  }

  @Post('register')
  @Permissions('equipment.update')
  @ApiOperation({
    summary: 'Register uploaded file metadata (photos, PDFs, evidence)',
  })
  register(@Body() dto: RegisterFileDto, @CurrentUser() user: AuthUser) {
    return this.service.register(dto, user);
  }

  @Get(':id')
  @Permissions('equipment.read')
  @ApiOperation({ summary: 'Get file metadata' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }
}

@Module({
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
