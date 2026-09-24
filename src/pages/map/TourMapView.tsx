import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Paper,
  RingProgress,
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
import { useMemo, useRef, useState, type CSSProperties } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BottomSheet } from "../../components/map/BottomSheet";
import { FloorPlanView } from "../../components/map/FloorPlanView";
import { pointOfInterestIcons } from "../../components/map/pointOfInterestIcons";
import { ScanStampButton } from "../../components/map/ScanStampButton";
import { StampToast } from "../../components/map/StampToast";
import { renderStopIcon } from "../../components/map/stopIcons";
import { useIsMobile } from "../../hooks/useIsMobile";
import { usePassport } from "../../hooks/usePassport";
import { useSheetHistory } from "../../hooks/useSheetHistory";
import {
  getTourFloorPlans,
  getTourStopByBoothId,
  getTourStops,
  type RouteProgress,
  type TourStop,
} from "../../lib/map";
import type { FloorPlan } from "../../types/content";

const stops = getTourStops();
const floorPlans = getTourFloorPlans();
/** Height (px) of the overlays across the top of the mobile map. */
const MOBILE_TOP_OVERLAY = 64;

function initialStop(requestedBoothId: string | null, visitedStampIds: ReadonlySet<string>): TourStop | undefined {
  const requestedStop = requestedBoothId ? getTourStopByBoothId(requestedBoothId) : undefined;
  return (
    requestedStop ??
    stops.find((stop) => !visitedStampIds.has(stop.booth.stamp.id)) ??
    stops[0]
  );
}

/** The most recently collected tour stop: the best guess of where the visitor is. */
function lastCollectedStop(collectedStamps: string[]): TourStop | undefined {
  for (const stampId of [...collectedStamps].reverse()) {
    const stop = stops.find((candidate) => candidate.booth.stamp.id === stampId);
    if (stop) {
      return stop;
    }
  }
  return undefined;
}

function routeProgress(plan: FloorPlan, anchor: TourStop | undefined): RouteProgress {
  if (!anchor) {
    return "none";
  }
  if (anchor.floorPlan.floor === plan.floor) {
    return anchor.point;
  }
  return anchor.floorPlan.floor > plan.floor ? "all" : "none";
}

export function TourMapView() {
  const [searchParams] = useSearchParams();
  const currentBoothId = searchParams.get("at");
  const currentStop = currentBoothId ? getTourStopByBoothId(currentBoothId) : undefined;
  const { state } = usePassport();
  const visitedStampIds = useMemo(() => new Set(state.collectedStamps), [state.collectedStamps]);
  const isMobile = useIsMobile();
  const [sheetExpanded, setSheetExpanded] = useSheetHistory();
  const [peekHeight, setPeekHeight] = useState(0);

  const [selectedBoothId, setSelectedBoothId] = useState(
    () => initialStop(currentBoothId ?? searchParams.get("stop"), visitedStampIds)?.booth.id,
  );
  const selectedStop = selectedBoothId ? getTourStopByBoothId(selectedBoothId) : undefined;
  const [floor, setFloor] = useState(() => selectedStop?.floorPlan.floor ?? floorPlans[0]?.floor ?? 0);
  const mapRef = useRef<HTMLDivElement>(null);

  const floorPlan = floorPlans.find((plan) => plan.floor === floor) ?? floorPlans[0];
  const visitedCount = stops.filter((stop) => visitedStampIds.has(stop.booth.stamp.id)).length;
  const progressAnchor = currentStop ?? lastCollectedStop(state.collectedStamps);

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

  const floorPlanView = (
    <FloorPlanView
      floorPlan={floorPlan}
      stops={floorStops}
      selectedBoothId={selectedBoothId}
      currentBoothId={currentStop?.booth.id}
      visitedStampIds={visitedStampIds}
      progress={routeProgress(floorPlan, progressAnchor)}
      onSelectStop={selectStop}
      fill={isMobile}
      controls={isMobile ? "compact" : "full"}
      insetTop={isMobile ? MOBILE_TOP_OVERLAY : 0}
      insetBottom={isMobile ? peekHeight : 0}
    />
  );
  const floorSwitcher = (
    <FloorSwitcher floor={floorPlan.floor} visitedStampIds={visitedStampIds} onChange={setFloor} />
  );
  const stopList = (
    <StopList
      selectedBoothId={selectedBoothId}
      currentStop={currentStop}
      visitedStampIds={visitedStampIds}
      onSelectStop={(boothId) => {
        selectStop(boothId, !isMobile);
        if (isMobile) {
          setSheetExpanded(false);
        }
      }}
    />
  );

  if (isMobile) {
    return (
      <div className="map-stage" style={{ "--sheet-peek": `${peekHeight}px` } as CSSProperties}>
        {floorPlanView}
        <div className="map-overlay-top">
          <ProgressChip visited={visitedCount} total={stops.length} />
          {floorSwitcher}
        </div>
        <StampToast />
        <div className="map-overlay-bottom-left">
          <ScanStampButton floating />
        </div>
        {selectedStop && (
          <BottomSheet
            label="Stop details"
            expanded={sheetExpanded}
            onExpandedChange={setSheetExpanded}
            onPeekHeightChange={setPeekHeight}
            onSwipe={(direction) => {
              const target = direction === "next" ? nextStop : previousStop;
              if (target) {
                selectStop(target.booth.id);
              }
            }}
            peek={
              <StopPeek
                stop={selectedStop}
                total={stops.length}
                isCurrent={selectedStop === currentStop}
                isVisited={visitedStampIds.has(selectedStop.booth.stamp.id)}
                nextStop={nextStop}
                onSelectStop={selectStop}
              />
            }
          >
            <Stack gap="lg">
              <StopDetails
                stop={selectedStop}
                previousStop={previousStop}
                nextStop={nextStop}
                onSelectStop={selectStop}
              />
              <div>
                <Text className="eyebrow" mb="xs">All stops</Text>
                {stopList}
              </div>
            </Stack>
          </BottomSheet>
        )}
      </div>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center" gap="sm">
        <ProgressChip visited={visitedCount} total={stops.length} />
        <ScanStampButton />
      </Group>

      <Box className="tour-layout">
        <Stack gap="sm" ref={mapRef} className="tour-map-column">
          <Paper className="floor-plan-card" withBorder radius="md">
            {floorPlanView}
            <div className="map-overlay-bottom-left">{floorSwitcher}</div>
            <StampToast />
          </Paper>
          <MapLegend />
        </Stack>

        <Stack gap="md" className="tour-side-column">
          {selectedStop && (
            <Paper className="selected-stop-card" withBorder radius="md" p="lg" aria-live="polite">
              <StopHeading
                stop={selectedStop}
                total={stops.length}
                isCurrent={selectedStop === currentStop}
                isVisited={visitedStampIds.has(selectedStop.booth.stamp.id)}
              />
              <StopDetails
                stop={selectedStop}
                previousStop={previousStop}
                nextStop={nextStop}
                onSelectStop={selectStop}
              />
            </Paper>
          )}
          <Paper className="tour-stop-list" withBorder radius="md" p="xs">
            {stopList}
          </Paper>
        </Stack>
      </Box>
    </Stack>
  );
}

function ProgressChip({ visited, total }: { visited: number; total: number }) {
  return (
    <div className="progress-chip" aria-live="polite">
      <RingProgress
        size={34}
        thickness={4}
        roundCaps
        sections={[{ value: total ? (visited / total) * 100 : 0, color: "ualbertaGreen" }]}
        aria-hidden="true"
      />
      <Text size="sm" fw={750}>
        {visited} of {total} stops visited
      </Text>
    </div>
  );
}

interface FloorSwitcherProps {
  floor: number;
  visitedStampIds: ReadonlySet<string>;
  onChange: (floor: number) => void;
}

/** Elevator-panel style floor buttons, top floor first, with unvisited stop counts. */
function FloorSwitcher({ floor, visitedStampIds, onChange }: FloorSwitcherProps) {
  return (
    <div className="floor-switcher" role="group" aria-label="Floor">
      {[...floorPlans].reverse().map((plan) => {
        const remaining = stops.filter(
          (stop) => stop.floorPlan.id === plan.id && !visitedStampIds.has(stop.booth.stamp.id),
        ).length;
        return (
          <button
            key={plan.id}
            type="button"
            className="floor-switcher-button"
            aria-pressed={plan.floor === floor}
            aria-label={`${plan.label}${remaining ? `, ${remaining} stops to visit` : ", all stops visited"}`}
            onClick={() => onChange(plan.floor)}
          >
            {plan.floor}F
            {remaining > 0 && <span className="floor-switcher-count" aria-hidden="true">{remaining}</span>}
          </button>
        );
      })}
    </div>
  );
}

function StopBadge({ stop, isVisited }: { stop: TourStop; isVisited: boolean }) {
  return (
    <span className="stop-badge" data-visited={isVisited || undefined}>
      {isVisited ? <IconCheck size={16} stroke={2.8} aria-label="Visited" /> : stop.number}
      <span className="stop-badge-icon" aria-hidden="true">
        {renderStopIcon(stop.booth, { size: 11, stroke: 2.4 })}
      </span>
    </span>
  );
}

interface StopSummaryProps {
  stop: TourStop;
  total: number;
  isCurrent: boolean;
  isVisited: boolean;
}

function StopHeading({ stop, total, isCurrent, isVisited }: StopSummaryProps) {
  return (
    <>
      <Group justify="space-between" gap="xs" mb={6}>
        <Text className="eyebrow">Stop {stop.number} of {total}</Text>
        <StatusBadges isCurrent={isCurrent} isVisited={isVisited} />
      </Group>
      <Title order={2} size="h3">{stop.booth.name}</Title>
      <Text size="sm" c="dimmed" mt={4}>
        {stop.booth.building.abbreviation} · {stop.floorPlan.label} · {stop.booth.location.room}
      </Text>
    </>
  );
}

function StatusBadges({ isCurrent, isVisited }: { isCurrent: boolean; isVisited: boolean }) {
  return (
    <Group gap={6}>
      {isCurrent && (
        <Badge color="ualbertaGold.5" variant="filled" c="ualbertaGreen.9" leftSection={<IconCurrentLocation size={13} />}>
          You are here
        </Badge>
      )}
      {isVisited && (
        <Badge color="ualbertaGreen" variant="light" leftSection={<IconCheck size={13} />}>
          Visited
        </Badge>
      )}
    </Group>
  );
}

function StopPeek({
  stop,
  total,
  isCurrent,
  isVisited,
  nextStop,
  onSelectStop,
}: StopSummaryProps & { nextStop?: TourStop; onSelectStop: (boothId: string) => void }) {
  return (
    <div className="stop-peek" aria-live="polite">
      <StopBadge stop={stop} isVisited={isVisited} />
      <div className="stop-peek-text">
        <Title order={2} size="h5" lineClamp={1}>{stop.booth.name}</Title>
        <Text size="xs" c="dimmed" lineClamp={1}>
          {isCurrent ? "You are here · " : ""}Stop {stop.number} of {total} · {stop.floorPlan.label} · {stop.booth.location.room}
        </Text>
      </div>
      <ActionIcon
        size={44}
        radius="xl"
        aria-label="Next stop"
        disabled={!nextStop}
        onClick={() => nextStop && onSelectStop(nextStop.booth.id)}
      >
        <IconChevronRight size={22} />
      </ActionIcon>
    </div>
  );
}

interface StopDetailsProps {
  stop: TourStop;
  previousStop?: TourStop;
  nextStop?: TourStop;
  onSelectStop: (boothId: string) => void;
}

function StopDetails({ stop, previousStop, nextStop, onSelectStop }: StopDetailsProps) {
  const changesFloor = nextStop && nextStop.floorPlan.floor !== stop.floorPlan.floor;

  return (
    <div>
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
    </div>
  );
}

interface StopListProps {
  selectedBoothId?: string;
  currentStop?: TourStop;
  visitedStampIds: ReadonlySet<string>;
  onSelectStop: (boothId: string) => void;
}

function StopList({ selectedBoothId, currentStop, visitedStampIds, onSelectStop }: StopListProps) {
  return (
    <nav aria-label="Tour stops">
      <Stack gap={2} component="ol" m={0} p={0} className="tour-stop-items">
        {stops.map((stop) => {
          const isVisited = visitedStampIds.has(stop.booth.stamp.id);
          return (
            <li key={stop.booth.id}>
              <UnstyledButton
                className="tour-stop-item"
                data-selected={stop.booth.id === selectedBoothId || undefined}
                aria-current={stop.booth.id === selectedBoothId ? "step" : undefined}
                onClick={() => onSelectStop(stop.booth.id)}
              >
                <StopBadge stop={stop} isVisited={isVisited} />
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
    </nav>
  );
}

function MapLegend() {
  return (
    <Group className="map-legend" gap="md" component="ul" aria-label="Map legend">
      <li><span className="legend-pin" aria-hidden="true">1</span>Tour stop</li>
      <li><span className="legend-pin" data-visited aria-hidden="true"><IconCheck size={11} stroke={3} /></span>Visited</li>
      <li><span className="legend-route" aria-hidden="true" />Route ahead</li>
      <li><span className="legend-route" data-walked aria-hidden="true" />Walked</li>
      {Object.entries(pointOfInterestIcons).map(([type, { icon: LegendIcon, label }]) => (
        <li key={type}>
          <span className="legend-poi" data-type={type} aria-hidden="true"><LegendIcon size={13} stroke={2} /></span>
          {label}
        </li>
      ))}
    </Group>
  );
}
