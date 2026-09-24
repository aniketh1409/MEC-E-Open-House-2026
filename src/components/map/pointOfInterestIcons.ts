import { IconDoorEnter, IconElevator, IconStairs, IconToiletPaper, type Icon } from "@tabler/icons-react";
import type { PointOfInterestType } from "../../types/content";

export const pointOfInterestIcons: Record<PointOfInterestType, { icon: Icon; label: string }> = {
  elevator: { icon: IconElevator, label: "Elevator" },
  stairs: { icon: IconStairs, label: "Stairs" },
  washroom: { icon: IconToiletPaper, label: "Washroom" },
  entrance: { icon: IconDoorEnter, label: "Entrance" },
};
