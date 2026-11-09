import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import type { AuthUser } from '../decorators/current-user.decorator.js';

/**
 * Deletes are destructive and permanent, so they stay with the administrator
 * role even when a staff account can create and update the same records.
 */
export function assertCanDelete(actor: AuthUser) {
  if (!actor.roles.includes('ADMIN')) {
    throw new ForbiddenException(
      'Only an administrator can delete records',
    );
  }
}

/** A friendly "this record still has history" rejection. */
export function blockedByHistory(message: string): never {
  throw new ConflictException(message);
}

/** Postgres restrict violation raised by a foreign key that is still in use. */
export function isForeignKeyViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2003'
  );
}

/** Join counts into "2 hire cards, 1 invoice and 3 payments". */
export function describeCounts(
  parts: Array<[count: number, singular: string, plural?: string]>,
) {
  const words = parts
    .filter(([count]) => count > 0)
    .map(([count, singular, plural]) => `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`);
  if (words.length === 0) return 'history';
  if (words.length === 1) return words[0]!;
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}
