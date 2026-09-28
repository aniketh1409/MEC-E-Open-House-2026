import { ActionIcon, Alert, Badge, Button, Group, Loader, Paper, Select, Stack, Text, Title } from "@mantine/core";
import {
  IconArrowBackUp,
  IconArrowBearLeft,
  IconArrowBearRight,
  IconArrowsUpDown,
  IconArrowUp,
  IconBuildingBridge2,
  IconCornerUpLeft,
  IconCornerUpRight,
  IconExternalLink,
  IconFlag,
  IconNavigation,
  IconRoute,
  IconStairs,
  IconTrafficLights,
  IconX,
  type Icon,
} from "@tabler/icons-react";
import type { CampusRouteStatus } from "../../hooks/useCampusRoute";
import type { CampusRoute, Maneuver } from "../../lib/campusRouter";
import { walkingDirectionsUrl } from "../../lib/map";
import type { Building } from "../../types/content";

export const MY_LOCATION = "my-location";

const maneuverIcons: Record<Maneuver, Icon> = {
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

interface RoutePlannerProps {
  buildings: Building[];
  fromId: string;
  toId?: string;
  onChange: (next: { fromId: string; toId?: string }) => void;
  route?: CampusRoute;
  status: CampusRouteStatus;
  /** Set while "My location" is the start and the phone hasn't reported a position yet. */
  isFindingLocation: boolean;
  locationError?: string;
}

export function RoutePlanner({
  buildings,
  fromId,
  toId,
  onChange,
  route,
  status,
  isFindingLocation,
  locationError,
}: RoutePlannerProps) {
  const destination = buildings.find((building) => building.id === toId);
  const buildingOptions = buildings.map((building) => ({ value: building.id, label: building.name }));
  const isSamePlace = Boolean(toId) && fromId === toId;
  const usesMyLocation = fromId === MY_LOCATION;

  return (
    <Paper className="route-planner" withBorder radius="md" p="md">
      <Group gap="xs" mb="sm">
        <IconRoute size={20} stroke={1.8} className="route-planner-icon" aria-hidden="true" />
        <Title order={2} size="h4">Where to?</Title>
      </Group>

      <Group gap="xs" wrap="nowrap" align="flex-end">
        <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
          <Select
            label="From"
            value={fromId}
            onChange={(value) => onChange({ fromId: value ?? MY_LOCATION, toId })}
            allowDeselect={false}
            data={[{ value: MY_LOCATION, label: "My location" }, ...buildingOptions]}
          />
          <Select
            label="To"
            placeholder="Choose a building"
            value={toId ?? null}
            onChange={(value) => onChange({ fromId, toId: value ?? undefined })}
            data={buildingOptions}
          />
        </Stack>
        <ActionIcon
          variant="default"
          size="lg"
          mb={4}
          aria-label="Swap start and destination"
          disabled={!toId || usesMyLocation}
          onClick={() => toId && onChange({ fromId: toId, toId: fromId })}
        >
          <IconArrowsUpDown size={18} />
        </ActionIcon>
      </Group>

      {toId && (
        <div className="route-planner-result" aria-live="polite">
          {isSamePlace ? (
            <Text size="sm" c="dimmed">You're already there.</Text>
          ) : usesMyLocation && locationError ? (
            <Alert color="orange" variant="light" p="sm">
              {locationError} Choose a starting building instead.
            </Alert>
          ) : (isFindingLocation || status === "loading") && !route ? (
            <Group gap="xs">
              <Loader size="xs" color="ualbertaGreen" />
              <Text size="sm" c="dimmed">{isFindingLocation ? "Finding your location…" : "Working out the route…"}</Text>
            </Group>
          ) : status === "unavailable" ? (
            <Text size="sm" c="dimmed">No walking route found. Try Google Maps instead.</Text>
          ) : route && destination ? (
            <RouteDetails route={route} />
          ) : null}

          {destination && !isSamePlace && (
            <Group gap="xs" mt="sm">
              <Button
                component="a"
                href={walkingDirectionsUrl(destination.position)}
                target="_blank"
                rel="noreferrer"
                size="xs"
                variant="default"
                rightSection={<IconExternalLink size={14} />}
              >
                Google Maps
              </Button>
              <Button size="xs" variant="subtle" color="gray" leftSection={<IconX size={14} />} onClick={() => onChange({ fromId })}>
                Clear route
              </Button>
            </Group>
          )}
        </div>
      )}
    </Paper>
  );
}

function RouteDetails({ route }: { route: CampusRoute }) {
  return (
    <>
      <Group gap="xs" align="baseline">
        <Text fw={800} size="xl">{route.minutes} min</Text>
        <Text size="sm" c="dimmed">{route.distanceMeters} m walk</Text>
        {route.usesPedway && (
          <Badge size="sm" variant="light" color="ualbertaGreen" leftSection={<IconBuildingBridge2 size={12} />}>
            Via indoor pedway
          </Badge>
        )}
      </Group>
      <ol className="route-steps">
        {route.steps.map((step, index) => {
          const StepIcon = maneuverIcons[step.maneuver];
          return (
            <li key={index} data-maneuver={step.maneuver}>
              <span className="route-step-icon" aria-hidden="true">
                <StepIcon size={16} stroke={2} />
              </span>
              <span className="route-step-text">{step.instruction}</span>
              {step.distanceMeters > 0 && <span className="route-step-distance">{step.distanceMeters} m</span>}
            </li>
          );
        })}
      </ol>
    </>
  );
}
