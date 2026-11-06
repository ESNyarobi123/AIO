import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../generated/prisma/client.js';
import { paginated, ok } from '../common/utils/api-response.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async findAll(page = 1, limit = 20, search?: string) {
    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { username: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          userRoles: { include: { role: true } },
        },
      }),
    ]);

    return paginated(
      users.map((user) => this.serialize(user)),
      total,
      page,
      limit,
    );
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    return ok(this.serialize(user));
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email.toLowerCase() },
          { username: dto.username.toLowerCase() },
        ],
      },
    });
    if (existing) {
      throw new ConflictException('Email or username already exists');
    }

    const role = await this.prisma.role.findUnique({
      where: { name: dto.role },
    });
    if (!role) throw new NotFoundException(`Role ${dto.role} not found`);

    const passwordHash = await bcrypt.hash(
      dto.password,
      this.config.get<number>('bcryptSaltRounds') ?? 12,
    );

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        username: dto.username.toLowerCase(),
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        passwordHash,
        userRoles: {
          create: { roleId: role.id },
        },
      },
      include: { userRoles: { include: { role: true } } },
    });

    return ok(this.serialize(user), { created: true });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.ensureExists(id);
    const data: Prisma.UserUpdateInput = {
      fullName: dto.fullName,
      phone: dto.phone,
      status: dto.status,
    };
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(
        dto.password,
        this.config.get<number>('bcryptSaltRounds') ?? 12,
      );
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
      include: { userRoles: { include: { role: true } } },
    });
    return ok(this.serialize(user));
  }

  private async ensureExists(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
  }

  private serialize(
    user: Prisma.UserGetPayload<{
      include: { userRoles: { include: { role: true } } };
    }>,
  ) {
    return {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      phone: user.phone,
      status: user.status,
      roles: user.userRoles.map((ur) => ur.role.name),
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
