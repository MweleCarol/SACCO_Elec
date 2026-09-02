import { prisma } from "../../config/prisma";
import { Position } from "@prisma/client";

export function findPositionById(id: string): Promise<Position | null> {
  return prisma.position.findUnique({ where: { id } });
}

export function listPositionsByElection(electionId: string): Promise<Position[]> {
  return prisma.position.findMany({ where: { electionId }, orderBy: { order: "asc" } });
}

export function createPosition(data: {
  electionId: string; name: string; description?: string; seats: number; order: number;
}): Promise<Position> {
  return prisma.position.create({ data });
}

export function updatePosition(
  id: string, data: Partial<{ name: string; description: string; seats: number; order: number }>
): Promise<Position> {
  return prisma.position.update({ where: { id }, data });
}

export function deletePosition(id: string): Promise<Position> {
  return prisma.position.delete({ where: { id } });
}

export function countCandidatesForPosition(positionId: string): Promise<number> {
  return prisma.candidate.count({ where: { positionId } });
}