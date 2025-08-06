"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaginationService = void 0;
const common_1 = require("@nestjs/common");
let PaginationService = class PaginationService {
    /**
     * Creates a cursor-based pagination connection
     */
    createConnection(items, args, totalCount) {
        const edges = items.map((item) => ({
            node: item,
            cursor: this.encodeCursor(item.id, item.createdAt),
        }));
        const pageInfo = {
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
    encodeCursor(id, createdAt) {
        const data = JSON.stringify({ id, createdAt: createdAt.toISOString() });
        return Buffer.from(data).toString('base64');
    }
    /**
     * Decodes cursor to get id and timestamp
     */
    decodeCursor(cursor) {
        try {
            const data = JSON.parse(Buffer.from(cursor, 'base64').toString());
            return {
                id: data.id,
                createdAt: new Date(data.createdAt),
            };
        }
        catch (error) {
            throw new Error('Invalid cursor format');
        }
    }
    /**
     * Builds Prisma where clause for cursor-based pagination
     */
    buildCursorWhere(args) {
        const where = {};
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
    getLimit(args) {
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
    getOrderBy(args) {
        if (args.last || args.before) {
            return [{ createdAt: 'asc' }, { id: 'asc' }];
        }
        return [{ createdAt: 'desc' }, { id: 'desc' }];
    }
    /**
     * Determines if there's a next page
     */
    hasNextPage(items, args, totalCount) {
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
    hasPreviousPage(args) {
        return !!args.after || !!args.last;
    }
    /**
     * Helper method for paginated queries
     */
    async paginate(queryFn, countFn, args, additionalWhere = {}) {
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
};
exports.PaginationService = PaginationService;
exports.PaginationService = PaginationService = __decorate([
    (0, common_1.Injectable)()
], PaginationService);
