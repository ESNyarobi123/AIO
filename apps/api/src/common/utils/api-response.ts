import { randomUUID } from 'node:crypto';

export function ok<T>(data: T, meta: Record<string, unknown> = {}) {
  return {
    data,
    meta: {
      requestId: randomUUID(),
      ...meta,
    },
  };
}

export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return ok(data, {
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  });
}
