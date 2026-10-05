import { Button, Text } from "@mantine/core";
import { IconCircleCheck, IconX } from "@tabler/icons-react";
import type { CampusRoute } from "../../lib/campusRouter";
import { formatCueDistance, getNavigationCue } from "../../lib/navigation";
import type { Building } from "../../types/content";
import { maneuverIcons } from "./maneuverIcons";

interface NavigationBannerProps {
  route?: CampusRoute;
  destination: Building;
  onEnd: () => void;
}

/** Live, turn-by-turn instructions shown across the top of the map while navigating. */
export function NavigationBanner({ route, destination, onEnd }: NavigationBannerProps) {
  const cue = route ? getNavigationCue(route) : undefined;
  const CueIcon = cue?.arrived ? IconCircleCheck : maneuverIcons[cue?.maneuver ?? "depart"];

  return (
    <section className="nav-banner" data-arrived={cue?.arrived || undefined} aria-label="Live directions" aria-live="polite">
      <div className="nav-banner-main">
        <span className="nav-banner-icon" aria-hidden="true">
          <CueIcon size={34} stroke={2.2} />
        </span>
        <div className="nav-banner-text">
          {!cue ? (
            <Text className="nav-banner-instruction">Finding your location…</Text>
          ) : cue.arrived ? (
            <>
              <Text className="nav-banner-distance">You've arrived</Text>
              <Text className="nav-banner-instruction">{destination.name}</Text>
            </>
          ) : (
            <>
              <Text className="nav-banner-distance">{formatCueDistance(cue.inMeters)}</Text>
              <Text className="nav-banner-instruction">{cue.instruction}</Text>
            </>
          )}
        </div>
      </div>
      {cue?.then && <Text className="nav-banner-then">Then: {cue.then}</Text>}
      <div className="nav-banner-footer">
        <Text size="sm" fw={700}>
          {route && !cue?.arrived ? `${route.minutes} min · ${route.distanceMeters} m to ${destination.abbreviation}` : destination.abbreviation}
        </Text>
        <Button size="compact-sm" radius="xl" variant="white" color="dark" leftSection={<IconX size={14} />} onClick={onEnd}>
          {cue?.arrived ? "Done" : "End"}
        </Button>
      </div>
    </section>
  );
}
