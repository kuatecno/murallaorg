import { Injectable } from '@nestjs/common';

export interface PaginationArgs {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

export interface Connection<T> {
  edges: Edge<T>[];
  pageInfo: PageInfo;
  totalCount: number;
}

export interface Edge<T> {
  node: T;
  cursor: string;
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

@Injectable()
export class PaginationService {
  /**
   * Creates a cursor-based pagination connection
   */
  createConnection<T extends { id: string; createdAt: Date }>(
    items: T[],
    args: PaginationArgs,
    totalCount: number,
  ): Connection<T> {
    const edges = items.map((item) => ({
      node: item,
      cursor: this.encodeCursor(item.id, item.createdAt),
    }));

    const pageInfo: PageInfo = {
      hasNextPage: this.hasNextPage(items, args, totalCount),
      hasPreviousPage: this.hasPreviousPage(args),
      startCursor: edges.length > 0 ? edges[0].cursor : undefined,
      endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : undefined,
    };

    return {
      edges,
      pageInfo,
      totalCount,
    };
  }

  /**
   * Encodes cursor from id and timestamp
   */
  encodeCursor(id: string, createdAt: Date): string {
    const data = JSON.stringify({ id, createdAt: createdAt.toISOString() });
    return Buffer.from(data).toString('base64');
  }

  /**
   * Decodes cursor to get id and timestamp
   */
  decodeCursor(cursor: string): { id: string; createdAt: Date } {
    try {
      const data = JSON.parse(Buffer.from(cursor, 'base64').toString());
      return {
        id: data.id,
        createdAt: new Date(data.createdAt),
      };
    } catch (error) {
      throw new Error('Invalid cursor format');
    }
  }

  /**
   * Builds Prisma where clause for cursor-based pagination
   */
  buildCursorWhere(args: PaginationArgs) {
    const where: any = {};

    if (args.after) {
      const { id, createdAt } = this.decodeCursor(args.after);
      where.OR = [
        { createdAt: { lt: createdAt } },
        { createdAt: createdAt, id: { lt: id } },
      ];
    }

    if (args.before) {
      const { id, createdAt } = this.decodeCursor(args.before);
      where.OR = [
        { createdAt: { gt: createdAt } },
        { createdAt: createdAt, id: { gt: id } },
      ];
    }

    return where;
  }

  /**
   * Gets the limit for Prisma query
   */
  getLimit(args: PaginationArgs): number {
    const defaultLimit = 20;
    const maxLimit = 100;

    if (args.first) {
      return Math.min(args.first, maxLimit);
    }

    if (args.last) {
      return Math.min(args.last, maxLimit);
    }

    return defaultLimit;
  }

  /**
   * Gets the order by clause for Prisma query
   */
  getOrderBy(args: PaginationArgs) {
    if (args.last || args.before) {
      return [{ createdAt: 'asc' as const }, { id: 'asc' as const }];
    }

    return [{ createdAt: 'desc' as const }, { id: 'desc' as const }];
  }

  /**
   * Determines if there's a next page
   */
  private hasNextPage<T>(
    items: T[],
    args: PaginationArgs,
    totalCount: number,
  ): boolean {
    if (args.first) {
      return items.length === args.first;
    }

    if (args.last) {
      return false; // When using 'last', we're going backwards
    }

    return items.length === this.getLimit(args);
  }

  /**
   * Determines if there's a previous page
   */
  private hasPreviousPage(args: PaginationArgs): boolean {
    return !!args.after || !!args.last;
  }

  /**
   * Helper method for paginated queries
   */
  async paginate<T extends { id: string; createdAt: Date }>(
    queryFn: (where: any, orderBy: any, take: number) => Promise<T[]>,
    countFn: () => Promise<number>,
    args: PaginationArgs,
    additionalWhere: any = {},
  ): Promise<Connection<T>> {
    const where = {
      ...additionalWhere,
      ...this.buildCursorWhere(args),
    };

    const orderBy = this.getOrderBy(args);
    const limit = this.getLimit(args);

    const [items, totalCount] = await Promise.all([
      queryFn(where, orderBy, limit + 1), // +1 to check if there's more
      countFn(),
    ]);

    // If we got more items than requested, there's another page
    const hasMore = items.length > limit;
    if (hasMore) {
      items.pop(); // Remove the extra item
    }

    // Reverse items if we're paginating backwards
    if (args.last || args.before) {
      items.reverse();
    }

    return this.createConnection(items, args, totalCount);
  }
}
