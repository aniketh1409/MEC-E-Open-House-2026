import {
  IconArrowBackUp,
  IconArrowBearLeft,
  IconArrowBearRight,
  IconArrowUp,
  IconBuildingBridge2,
  IconCornerUpLeft,
  IconCornerUpRight,
  IconFlag,
  IconNavigation,
  IconStairs,
  IconTrafficLights,
  type Icon,
} from "@tabler/icons-react";
import type { Maneuver } from "../../lib/campusRouter";

/** The arrow shown for each kind of turn, in the step list and the live navigation banner. */
export const maneuverIcons: Record<Maneuver, Icon> = {
  depart: IconNavigation,
  straight: IconArrowUp,
  "slight-left": IconArrowBearLeft,
  "slight-right": IconArrowBearRight,
  left: IconCornerUpLeft,
  right: IconCornerUpRight,
  "u-turn": IconArrowBackUp,
  stairs: IconStairs,
  cross: IconTrafficLights,
  pedway: IconBuildingBridge2,
  arrive: IconFlag,
};
