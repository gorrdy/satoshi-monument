import { prisma } from "./prisma";

export interface RoadmapItemPublic {
  id: string;
  title: string;
  detail: string | null;
  dateLabel: string | null;
  status: string; // done | current | upcoming
  linkUrl: string | null;
}

/** Veřejná roadmapa, seřazená dle `order`. */
export async function getRoadmap(): Promise<RoadmapItemPublic[]> {
  return prisma.roadmapItem.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      detail: true,
      dateLabel: true,
      status: true,
      linkUrl: true,
    },
  });
}
