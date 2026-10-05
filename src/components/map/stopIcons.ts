import {
  IconDoorEnter,
  IconDrone,
  IconFlag,
  IconFlask,
  IconLeaf,
  IconMapPin,
  IconMicroscope,
  IconPlane,
  IconPlanet,
  IconPlant2,
  IconPresentation,
  IconRobot,
  IconRocket,
  IconRuler2,
  IconSatellite,
  IconSteeringWheel,
  IconSubmarine,
  IconTrophy,
  IconUsers,
  type Icon,
  type IconProps,
} from "@tabler/icons-react";
import { createElement, type ReactElement } from "react";
import type { Booth } from "../../types/content";

/** Icons booths can reference by key in booths.json. */
const stopIcons: Record<string, Icon> = {
  door: IconDoorEnter,
  drone: IconDrone,
  flag: IconFlag,
  flask: IconFlask,
  leaf: IconLeaf,
  microscope: IconMicroscope,
  plane: IconPlane,
  planet: IconPlanet,
  plant: IconPlant2,
  presentation: IconPresentation,
  robot: IconRobot,
  rocket: IconRocket,
  ruler: IconRuler2,
  satellite: IconSatellite,
  "steering-wheel": IconSteeringWheel,
  submarine: IconSubmarine,
  trophy: IconTrophy,
  users: IconUsers,
};

function getStopIcon(booth: Pick<Booth, "icon">): Icon {
  return (booth.icon && stopIcons[booth.icon]) || IconMapPin;
}

/** Renders a booth's icon; the icon components themselves are static module-level components. */
export function renderStopIcon(booth: Pick<Booth, "icon">, props: IconProps): ReactElement {
  return createElement(getStopIcon(booth), props);
}
