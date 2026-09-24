import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Loader,
  Modal,
  Paper,
  Stack,
  Switch,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconArrowRight,
  IconCheck,
  IconExternalLink,
  IconMap,
  IconRoute,
  IconWalk,
  IconX,
} from "@tabler/icons-react";
import { Fragment, lazy, Suspense, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import printedCampusMapUrl from "../../../assets/maps/campus-map.webp";
import { BottomSheet } from "../../components/map/BottomSheet";
import type { PlannedRoute } from "../../components/map/CampusMap";
import { MY_LOCATION, RoutePlanner } from "../../components/map/RoutePlanner";
import { ScanStampButton } from "../../components/map/ScanStampButton";
import { StampToast } from "../../components/map/StampToast";
import { features } from "../../config/features";
import { useCampusRoute, type CampusRouteStatus } from "../../hooks/useCampusRoute";
import { useIsMobile } from "../../hooks/useIsMobile";
import { usePassport } from "../../hooks/usePassport";
import { useSheetHistory } from "../../hooks/useSheetHistory";
import { useVisitorPosition } from "../../hooks/useVisitorPosition";
import type { CampusRoute } from "../../lib/campusRouter";
import { getBuildings } from "../../lib/content";
import {
  campusMapUrl,
  getJourneyLegs,
  getJourneySteps,
  TOUR_MAP_PATH,
  walkingDirectionsUrl,
  type JourneyStepDetails,
} from "../../lib/map";
import type { Building, JourneyLeg } from "../../types/content";

const CampusMap = lazy(() => import("../../components/map/CampusMap"));
const buildings = getBuildings();

export function CampusJourneyView() {
  const [attendsPresentation, setAttendsPresentation] = useState(true);
  const [printedMapOpened, { open: openPrintedMap, close: closePrintedMap }] = useDisclosure(false);
  const isMobile = useIsMobile();
  const [sheetExpanded, setSheetExpanded] = useSheetHistory();
  const [peekHeight, setPeekHeight] = useState(0);
  const { state } = usePassport();
  const visitedStampIds = useMemo(() => new Set(state.collectedStamps), [state.collectedStamps]);

  const steps = useMemo(() => getJourneySteps(attendsPresentation), [attendsPresentation]);
  const legs = useMemo(() => getJourneyLegs(steps), [steps]);
  const totalMinutes = legs.reduce((sum, leg) => sum + leg.minutes, 0);
  const hasOptionalStep = getJourneySteps(true).some((step) => step.optional);
  const isStepVisited = (step: JourneyStepDetails) => Boolean(step.booth && visitedStampIds.has(step.booth.stamp.id));
  const nextStep = steps.find((step) => !isStepVisited(step)) ?? steps[steps.length - 1];

  const [isLocating, setIsLocating] = useState(false);
  const { position, error: locationError } = useVisitorPosition(isLocating);

  // "Where to?" directions (features.campusRouting).
  const [planner, setPlanner] = useState<{ fromId: string; toId?: string }>({ fromId: MY_LOCATION });
  const destination = features.campusRouting ? buildings.find((building) => building.id === planner.toId) : undefined;
  const startsAtMe = planner.fromId === MY_LOCATION;
  const origin = startsAtMe
    ? position && { lat: position.center[0], lng: position.center[1] }
    : buildings.find((building) => building.id === planner.fromId)?.position;
  const { route, status: routeStatus } = useCampusRoute(
    destination && planner.fromId !== planner.toId ? origin : undefined,
    destination,
  );
  const plannedRoute: PlannedRoute | undefined = destination
    ? { key: `${planner.fromId}>${destination.id}`, route, destination, isLive: startsAtMe }
    : undefined;
  const isFindingLocation = startsAtMe && !position && !locationError;

  const changePlanner = (next: { fromId: string; toId?: string }) => {
    if (next.toId && next.fromId === MY_LOCATION) {
      setIsLocating(true);
    }
    if (isMobile && next.toId && next.toId !== planner.toId) {
      setSheetExpanded(false); // Show the new route on the map.
    }
    setPlanner(next);
  };

  const routePlanner = features.campusRouting ? (
    <RoutePlanner
      buildings={buildings}
      fromId={planner.fromId}
      toId={planner.toId}
      onChange={changePlanner}
      route={route}
      status={routeStatus}
      isFindingLocation={isFindingLocation}
      locationError={locationError}
    />
  ) : null;

  const campusMap = (
    <Suspense fallback={<Group className="campus-map-loading" justify="center"><Loader color="ualbertaGreen" /></Group>}>
      <CampusMap
        steps={steps}
        legs={legs}
        visitedStampIds={visitedStampIds}
        targetStep={nextStep}
        isLocating={isLocating}
        onLocatingChange={setIsLocating}
        position={position}
        locationError={locationError}
        plannedRoute={plannedRoute}
        insetBottom={isMobile ? peekHeight : 0}
        showZoomControl={!isMobile}
      />
    </Suspense>
  );

  const journeyDetails = (
    <Stack gap="md">
      {hasOptionalStep && (
        <Paper withBorder radius="md" p="md" className="journey-toggle">
          <Switch
            checked={attendsPresentation}
            onChange={(event) => setAttendsPresentation(event.currentTarget.checked)}
            label="I'm attending the MEC E program presentation"
            description="Turn off to walk straight to the building tour."
            color="ualbertaGreen"
          />
        </Paper>
      )}

      <Stack component="ol" gap={0} className="journey-steps" aria-label="Your route">
        {steps.map((step, index) => (
          <Fragment key={step.id}>
            {index > 0 && legs[index - 1] && <WalkingLeg leg={legs[index - 1]!} />}
            <JourneyStepCard step={step} isVisited={isStepVisited(step)} />
          </Fragment>
        ))}
      </Stack>

      <Group justify="space-between" gap="xs">
        <Text size="sm" c="dimmed">
          <IconWalk size={15} className="inline-icon" aria-hidden="true" /> About {totalMinutes} min of walking in total
        </Text>
        <Button variant="subtle" size="compact-sm" leftSection={<IconMap size={16} />} onClick={openPrintedMap}>
          View printed campus map
        </Button>
      </Group>
    </Stack>
  );

  const printedMapModal = (
    <Modal
      opened={printedMapOpened}
      onClose={closePrintedMap}
      title="Printed campus map"
      size="xl"
      fullScreen={isMobile}
      centered
    >
      <Text size="sm" c="dimmed" mb="sm">Pinch or scroll to zoom. The Butterdome is building 1.</Text>
      <Box className="printed-map-viewport">
        <TransformWrapper minScale={1} maxScale={5} centerOnInit>
          <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
            <img
              src={printedCampusMapUrl}
              alt="University of Alberta North Campus map for Open House, showing the Butterdome, ECHA, and other event buildings"
              className="printed-map-image"
            />
          </TransformComponent>
        </TransformWrapper>
      </Box>
    </Modal>
  );

  if (isMobile) {
    const nextIndex = nextStep ? steps.indexOf(nextStep) : -1;
    return (
      <div className="map-stage" style={{ "--sheet-peek": `${peekHeight}px` } as CSSProperties}>
        {campusMap}
        <StampToast />
        {features.campusRouting && !plannedRoute && (
          <div className="map-overlay-top-left">
            <Button
              className="map-fab"
              variant="white"
              radius="xl"
              leftSection={<IconRoute size={18} />}
              onClick={() => setSheetExpanded(true)}
            >
              Where to?
            </Button>
          </div>
        )}
        <div className="map-overlay-bottom-left">
          <ScanStampButton floating />
        </div>
        {nextStep && (
          <BottomSheet
            label="Your route"
            expanded={sheetExpanded}
            onExpandedChange={setSheetExpanded}
            onPeekHeightChange={setPeekHeight}
            peek={
              plannedRoute ? (
                <RoutePeek
                  destination={plannedRoute.destination}
                  route={route}
                  status={routeStatus}
                  isFindingLocation={isFindingLocation}
                  onClear={() => setPlanner({ fromId: planner.fromId })}
                />
              ) : (
                <JourneyPeek
                  step={nextStep}
                  legToStep={nextIndex > 0 ? legs[nextIndex - 1] : undefined}
                  isVisited={isStepVisited(nextStep)}
                />
              )
            }
          >
            <Stack gap="md">
              {routePlanner}
              {journeyDetails}
            </Stack>
          </BottomSheet>
        )}
        {printedMapModal}
      </div>
    );
  }

  return (
    <Box className="campus-layout">
      <Paper className="campus-map-card" withBorder radius="md">
        {campusMap}
        <StampToast />
      </Paper>
      <Stack gap="md" className="campus-side-column">
        <Group justify="flex-end">
          <ScanStampButton />
        </Group>
        {routePlanner}
        {journeyDetails}
      </Stack>
      {printedMapModal}
    </Box>
  );
}

function RoutePeek({
  destination,
  route,
  status,
  isFindingLocation,
  onClear,
}: {
  destination: Building;
  route?: CampusRoute;
  status: CampusRouteStatus;
  isFindingLocation: boolean;
  onClear: () => void;
}) {
  const summary = route
    ? `${route.minutes} min · ${route.distanceMeters} m`
    : isFindingLocation
      ? "Finding your location…"
      : status === "unavailable"
        ? "No walking route found"
        : "Working out the route…";
  return (
    <div className="stop-peek">
      <span className="stop-badge route-peek-badge" aria-hidden="true">
        <IconRoute size={20} />
      </span>
      <div className="stop-peek-text">
        <Text size="xs" fw={750} c="dimmed" tt="uppercase" lineClamp={1}>Route to {destination.abbreviation}</Text>
        <Title order={2} size="h5" lineClamp={1}>{summary}</Title>
        <Text size="xs" c="dimmed" lineClamp={1}>
          {route?.steps[0]?.instruction ?? "Swipe up for step-by-step directions"}
        </Text>
      </div>
      <ActionIcon size={44} radius="xl" variant="default" aria-label="Clear route" onClick={onClear}>
        <IconX size={20} />
      </ActionIcon>
    </div>
  );
}

function WalkingLeg({ leg }: { leg: JourneyLeg }) {
  return (
    <li className="journey-leg" aria-label={`Walk ${leg.minutes} minutes`}>
      <IconWalk size={16} stroke={1.8} aria-hidden="true" />
      <Text size="sm" c="dimmed" fw={600}>
        {leg.minutes} min walk · {leg.distanceMeters} m
      </Text>
    </li>
  );
}

function JourneyPeek({
  step,
  legToStep,
  isVisited,
}: {
  step: JourneyStepDetails;
  legToStep?: JourneyLeg;
  isVisited: boolean;
}) {
  const isTour = step.id === "tour";
  return (
    <div className="stop-peek">
      <span className="stop-badge" data-visited={isVisited || undefined}>
        {isVisited ? <IconCheck size={16} stroke={2.8} aria-label="Visited" /> : step.number}
      </span>
      <div className="stop-peek-text">
        <Text size="xs" fw={750} c="dimmed" tt="uppercase">{step.number === 1 ? "Start here" : "Next"}</Text>
        <Title order={2} size="h5" lineClamp={1}>{step.title}</Title>
        <Text size="xs" c="dimmed" lineClamp={1}>
          {step.building.abbreviation}
          {legToStep ? ` · ${legToStep.minutes} min walk` : ""}
        </Text>
      </div>
      {isTour ? (
        <ActionIcon component={Link} to={TOUR_MAP_PATH} size={44} radius="xl" aria-label="Open tour map">
          <IconArrowRight size={22} />
        </ActionIcon>
      ) : (
        <ActionIcon
          component="a"
          href={walkingDirectionsUrl(step.building.position)}
          target="_blank"
          rel="noreferrer"
          size={44}
          radius="xl"
          aria-label={`Walking directions to ${step.building.abbreviation}`}
        >
          <IconRoute size={22} />
        </ActionIcon>
      )}
    </div>
  );
}

function JourneyStepCard({ step, isVisited }: { step: JourneyStepDetails; isVisited: boolean }) {
  const isTour = step.id === "tour";

  return (
    <Paper component="li" className="journey-step" withBorder radius="md" p="md">
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <span className="journey-step-number" data-visited={isVisited || undefined}>
          {isVisited ? <IconCheck size={17} stroke={2.6} aria-label="Visited" /> : step.number}
        </span>
        <Box miw={0} style={{ flex: 1 }}>
          <Group gap={6} justify="space-between" wrap="nowrap">
            <Title order={2} size="h4">{step.title}</Title>
            {step.optional && <Badge variant="light" color="gray" size="sm" style={{ flexShrink: 0 }}>Optional</Badge>}
          </Group>
          <Text size="sm" fw={650} mt={2}>
            {step.building.name}
            {step.booth && step.booth.location.room !== "TBD" ? ` · ${step.booth.location.room}` : ""}
            {step.booth?.location.room === "TBD" && (
              <Badge ml={6} size="xs" color="ualbertaGold.5" c="ualbertaGreen.9" variant="filled">Room TBD</Badge>
            )}
          </Text>
          <Text size="sm" c="dimmed" mt={4}>{step.description}</Text>

          <Group gap="xs" mt="sm">
            {isTour ? (
              <Button component={Link} to={TOUR_MAP_PATH} size="xs" rightSection={<IconArrowRight size={15} />}>
                Open tour map
              </Button>
            ) : null}
            <Button
              component="a"
              href={walkingDirectionsUrl(step.building.position)}
              target="_blank"
              rel="noreferrer"
              size="xs"
              variant={isTour ? "default" : "light"}
              leftSection={<IconRoute size={15} />}
            >
              Directions
            </Button>
            <Button
              component="a"
              href={campusMapUrl(step.building.position)}
              target="_blank"
              rel="noreferrer"
              size="xs"
              variant="subtle"
              rightSection={<IconExternalLink size={14} />}
            >
              UAlberta map
            </Button>
          </Group>
        </Box>
      </Group>
    </Paper>
  );
}
