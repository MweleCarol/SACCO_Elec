/**
 * Pagination DTO — cross-module response shape
 *
 * Layer: Shared Infrastructure (dto/)
 *
 * WHY this lives here: response.helper.ts's sendSuccess<T> wraps
 * whatever `data` a controller passes it, but doesn't itself define
 * what a *list* response's data should look like. Without one shared
 * shape, five modules' list endpoints (elections, candidates, users,
 * audit logs) would each invent their own — items vs results vs data,
 * page vs offset, total vs totalCount. Defining it once here means
 * every list endpoint in the system returns the identical shape.
 *
 * USAGE in a service/controller:
 *   const result: PaginatedResult<Election> = {
 *     items: elections,
 *     pagination: buildPaginationMeta(page, limit, totalCount),
 *   };
 *   sendSuccess(res, result);
 */

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

/**
 * Builds the pagination metadata block from a page/limit/total triple —
 * the one place totalPages gets computed, so no module reimplements
 * (and potentially miscalculates, e.g. off-by-one on exact multiples)
 * Math.ceil(total / limit) independently.
 */
export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}