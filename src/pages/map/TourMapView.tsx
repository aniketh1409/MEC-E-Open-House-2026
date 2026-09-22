import {
  Badge,
  Box,
  Button,
  Group,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
  UnstyledButton,
} from "@mantine/core";
import {
  IconArrowRight,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconCurrentLocation,
  IconInfoCircle,
  IconWalk,
} from "@tabler/icons-react";
import { useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FloorPlanView } from "../../components/map/FloorPlanView";
import { pointOfInterestIcons } from "../../components/map/pointOfInterestIcons";
import { usePassport } from "../../hooks/usePassport";
import { getTourFloorPlans, getTourStopByBoothId, getTourStops, type TourStop } from "../../lib/map";

const stops = getTourStops();
const floorPlans = getTourFloorPlans();

function initialStop(requestedBoothId: string | null, visitedStampIds: ReadonlySet<string>): TourStop | undefined {
  const requestedStop = requestedBoothId ? getTourStopByBoothId(requestedBoothId) : undefined;
  return (
    requestedStop ??
    stops.find((stop) => !visitedStampIds.has(stop.booth.stamp.id)) ??
    stops[0]
  );
}

export function TourMapView() {
  const [searchParams] = useSearchParams();
  const currentBoothId = searchParams.get("at");
  const currentStop = currentBoothId ? getTourStopByBoothId(currentBoothId) : undefined;
  const { state } = usePassport();
  const visitedStampIds = useMemo(() => new Set(state.collectedStamps), [state.collectedStamps]);

  const [selectedBoothId, setSelectedBoothId] = useState(
    () => initialStop(currentBoothId ?? searchParams.get("stop"), visitedStampIds)?.booth.id,
  );
  const selectedStop = selectedBoothId ? getTourStopByBoothId(selectedBoothId) : undefined;
  const [floor, setFloor] = useState(() => selectedStop?.floorPlan.floor ?? floorPlans[0]?.floor ?? 0);
  const mapRef = useRef<HTMLDivElement>(null);

  const floorPlan = floorPlans.find((plan) => plan.floor === floor) ?? floorPlans[0];
  const visitedCount = stops.filter((stop) => visitedStampIds.has(stop.booth.stamp.id)).length;

  if (!floorPlan || stops.length === 0) {
    return (
      <Paper className="empty-state" withBorder radius="md" p="xl">
        <Title order={2} size="h3">Tour map coming soon</Title>
        <Text c="dimmed" mt={4}>Tour stops will appear here once they are confirmed.</Text>
      </Paper>
    );
  }

  const selectStop = (boothId: string, scrollToMap = false) => {
    const stop = getTourStopByBoothId(boothId);
    if (!stop) {
      return;
    }
    setSelectedBoothId(boothId);
    setFloor(stop.floorPlan.floor);
    if (scrollToMap) {
      mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const floorStops = stops.filter((stop) => stop.floorPlan.id === floorPlan.id);
  const selectedIndex = selectedStop ? stops.indexOf(selectedStop) : -1;
  const previousStop = selectedIndex > 0 ? stops[selectedIndex - 1] : undefined;
  const nextStop = selectedIndex >= 0 ? stops[selectedIndex + 1] : undefined;

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" gap="sm">
        <div>
          <Text size="sm" c="dimmed" fw={650}>Suggested route · visit in any order</Text>
          <Text fw={750} size="lg" aria-live="polite">
            {visitedCount} of {stops.length} stops visited
          </Text>
        </div>
        <SegmentedControl
          value={String(floorPlan.floor)}
          onChange={(value) => setFloor(Number(value))}
          aria-label="Floor"
          data={floorPlans.map((plan) => ({ value: String(plan.floor), label: plan.label }))}
        />
      </Group>

      <Box className="tour-layout">
        <Stack gap="sm" ref={mapRef} className="tour-map-column">
          <Paper className="floor-plan-card" withBorder radius="md">
            <FloorPlanView
              floorPlan={floorPlan}
              stops={floorStops}
              selectedBoothId={selectedBoothId}
              currentBoothId={currentStop?.booth.id}
              visitedStampIds={visitedStampIds}
              onSelectStop={selectStop}
            />
          </Paper>
          <MapLegend />
        </Stack>

        <Stack gap="md" className="tour-side-column">
          {selectedStop && (
            <SelectedStopCard
              stop={selectedStop}
              total={stops.length}
              isCurrent={selectedStop === currentStop}
              isVisited={visitedStampIds.has(selectedStop.booth.stamp.id)}
              previousStop={previousStop}
              nextStop={nextStop}
              onSelectStop={selectStop}
            />
          )}

          <Paper className="tour-stop-list" withBorder radius="md" p="xs" component="nav" aria-label="Tour stops">
            <Stack gap={2} component="ol" m={0} p={0}>
              {stops.map((stop) => {
                const isVisited = visitedStampIds.has(stop.booth.stamp.id);
                return (
                  <li key={stop.booth.id}>
                    <UnstyledButton
                      className="tour-stop-item"
                      data-selected={stop.booth.id === selectedBoothId || undefined}
                      aria-current={stop.booth.id === selectedBoothId ? "step" : undefined}
                      onClick={() => selectStop(stop.booth.id, true)}
                    >
                      <span className="tour-stop-number" data-visited={isVisited || undefined}>
                        {isVisited ? <IconCheck size={15} stroke={2.6} aria-label="Visited" /> : stop.number}
                      </span>
                      <span className="tour-stop-text">
                        <Text component="span" size="sm" fw={650} lineClamp={1}>{stop.booth.name}</Text>
                        <Text component="span" size="xs" c="dimmed">
                          {stop.floorPlan.label} · {stop.booth.location.room}
                        </Text>
                      </span>
                      {stop === currentStop && (
                        <IconCurrentLocation size={17} className="tour-stop-here" aria-label="You are here" />
                      )}
                    </UnstyledButton>
                  </li>
                );
              })}
            </Stack>
          </Paper>
        </Stack>
      </Box>
    </Stack>
  );
}

interface SelectedStopCardProps {
  stop: TourStop;
  total: number;
  isCurrent: boolean;
  isVisited: boolean;
  previousStop?: TourStop;
  nextStop?: TourStop;
  onSelectStop: (boothId: string) => void;
}

function SelectedStopCard({
  stop,
  total,
  isCurrent,
  isVisited,
  previousStop,
  nextStop,
  onSelectStop,
}: SelectedStopCardProps) {
  const changesFloor = nextStop && nextStop.floorPlan.floor !== stop.floorPlan.floor;

  return (
    <Paper className="selected-stop-card" withBorder radius="md" p="lg" aria-live="polite">
      <Group justify="space-between" gap="xs" mb={6}>
        <Text className="eyebrow">Stop {stop.number} of {total}</Text>
        <Group gap={6}>
          {isCurrent && (
            <Badge color="ualbertaGold" variant="filled" c="ualbertaGreen.9" leftSection={<IconCurrentLocation size={13} />}>
              You are here
            </Badge>
          )}
          {isVisited && (
            <Badge color="ualbertaGreen" variant="light" leftSection={<IconCheck size={13} />}>
              Visited
            </Badge>
          )}
        </Group>
      </Group>
      <Title order={2} size="h3">{stop.booth.name}</Title>
      <Text size="sm" c="dimmed" mt={4}>
        {stop.booth.building.abbreviation} · {stop.floorPlan.label} · {stop.booth.location.room}
      </Text>
      <Text size="sm" mt="sm">{stop.booth.shortDescription}</Text>

      {nextStop && stop.directionsToNext && (
        <Group className="next-directions" gap="sm" wrap="nowrap" align="flex-start" mt="md">
          <ThemeIcon variant="light" color="ualbertaGreen" size="md" radius="xl">
            <IconWalk size={16} stroke={1.8} />
          </ThemeIcon>
          <div>
            <Text size="xs" fw={750} c="dimmed" tt="uppercase">
              Next: Stop {nextStop.number}{changesFloor ? ` · ${nextStop.floorPlan.label}` : ""}
            </Text>
            <Text size="sm" fw={650}>{nextStop.booth.name}</Text>
            <Text size="sm" c="dimmed">{stop.directionsToNext}</Text>
          </div>
        </Group>
      )}
      {!nextStop && stop.directionsToNext && (
        <Text size="sm" c="dimmed" mt="md">{stop.directionsToNext}</Text>
      )}

      <SimpleGrid cols={2} spacing="xs" mt="lg">
        <Button
          variant="default"
          leftSection={<IconChevronLeft size={16} />}
          disabled={!previousStop}
          onClick={() => previousStop && onSelectStop(previousStop.booth.id)}
        >
          Previous
        </Button>
        <Button
          rightSection={<IconChevronRight size={16} />}
          disabled={!nextStop}
          onClick={() => nextStop && onSelectStop(nextStop.booth.id)}
        >
          Next stop
        </Button>
      </SimpleGrid>
      <Button
        component={Link}
        to={`/booths/${stop.booth.id}`}
        variant="subtle"
        fullWidth
        mt="xs"
        leftSection={<IconInfoCircle size={17} />}
        rightSection={<IconArrowRight size={16} />}
      >
        About this stop
      </Button>
    </Paper>
  );
}

function MapLegend() {
  return (
    <Group className="map-legend" gap="md" component="ul" aria-label="Map legend">
      <li><span className="legend-pin" aria-hidden="true">1</span>Tour stop</li>
      <li><span className="legend-pin" data-visited aria-hidden="true"><IconCheck size={11} stroke={3} /></span>Visited</li>
      <li><span className="legend-route" aria-hidden="true" />Suggested route</li>
      {Object.entries(pointOfInterestIcons).map(([type, { icon: LegendIcon, label }]) => (
        <li key={type}>
          <span className="legend-poi" data-type={type} aria-hidden="true"><LegendIcon size={13} stroke={2} /></span>
          {label}
        </li>
      ))}
    </Group>
  );
}
