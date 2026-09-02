import { Election, ElectionStatus } from "@prisma/client";

export interface ElectionDto {
  id: string;
  name: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  status: ElectionStatus;
  requiredApprovals: number;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  activatedAt: Date | null;
  closedAt: Date | null;
  resultsPublishedAt: Date | null;
  archivedAt: Date | null;
}

// A plain pass-through today, but kept as an explicit mapping function
// (rather than returning the Prisma row directly from the controller) so
// that if Election ever gains an internal-only field, there is exactly
// one place to stop exposing it.
export function toElectionDto(election: Election): ElectionDto {
  return {
    id: election.id,
    name: election.name,
    description: election.description,
    startDate: election.startDate,
    endDate: election.endDate,
    status: election.status,
    requiredApprovals: election.requiredApprovals,
    createdById: election.createdById,
    createdAt: election.createdAt,
    updatedAt: election.updatedAt,
    activatedAt: election.activatedAt,
    closedAt: election.closedAt,
    resultsPublishedAt: election.resultsPublishedAt,
    archivedAt: election.archivedAt,
  };
}

export interface PaginatedElectionsDto {
  elections: ElectionDto[];
  pagination: { page: number; pageSize: number; totalCount: number; totalPages: number };
}