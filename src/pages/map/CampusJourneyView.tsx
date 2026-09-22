import {
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
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  IconArrowRight,
  IconCheck,
  IconExternalLink,
  IconMap,
  IconRoute,
  IconWalk,
} from "@tabler/icons-react";
import { Fragment, lazy, Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import printedCampusMapUrl from "../../../assets/maps/campus-map.webp";
import { usePassport } from "../../hooks/usePassport";
import {
  campusMapUrl,
  getJourneyLegs,
  getJourneySteps,
  walkingDirectionsUrl,
  type JourneyStepDetails,
} from "../../lib/map";

const CampusMap = lazy(() => import("../../components/map/CampusMap"));

export function CampusJourneyView() {
  const [attendsPresentation, setAttendsPresentation] = useState(true);
  const [printedMapOpened, { open: openPrintedMap, close: closePrintedMap }] = useDisclosure(false);
  const isMobile = useMediaQuery("(max-width: 48em)");
  const { state } = usePassport();
  const visitedStampIds = useMemo(() => new Set(state.collectedStamps), [state.collectedStamps]);

  const steps = useMemo(() => getJourneySteps(attendsPresentation), [attendsPresentation]);
  const legs = useMemo(() => getJourneyLegs(steps), [steps]);
  const totalMinutes = legs.reduce((sum, leg) => sum + leg.minutes, 0);
  const hasOptionalStep = getJourneySteps(true).some((step) => step.optional);

  return (
    <Box className="campus-layout">
      <Stack gap="sm" className="campus-map-column">
        <Paper className="campus-map-card" withBorder radius="md">
          <Suspense fallback={<Group className="campus-map-loading" justify="center"><Loader color="ualbertaGreen" /></Group>}>
            <CampusMap steps={steps} legs={legs} visitedStampIds={visitedStampIds} />
          </Suspense>
        </Paper>
        <Group justify="space-between" gap="xs">
          <Text size="sm" c="dimmed">
            <IconWalk size={15} className="inline-icon" aria-hidden="true" /> About {totalMinutes} min of walking in total
          </Text>
          <Button variant="subtle" size="compact-sm" leftSection={<IconMap size={16} />} onClick={openPrintedMap}>
            View printed campus map
          </Button>
        </Group>
      </Stack>

      <Stack gap="md" className="campus-side-column">
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
              {index > 0 && legs[index - 1] && (
                <li className="journey-leg" aria-label={`Walk ${legs[index - 1]!.minutes} minutes`}>
                  <IconWalk size={16} stroke={1.8} aria-hidden="true" />
                  <Text size="sm" c="dimmed" fw={600}>
                    {legs[index - 1]!.minutes} min walk · {legs[index - 1]!.distanceMeters} m
                  </Text>
                </li>
              )}
              <JourneyStepCard step={step} isVisited={Boolean(step.booth && visitedStampIds.has(step.booth.stamp.id))} />
            </Fragment>
          ))}
        </Stack>
      </Stack>

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
    </Box>
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
              <Badge ml={6} size="xs" color="ualbertaGold" c="ualbertaGreen.9" variant="filled">Room TBD</Badge>
            )}
          </Text>
          <Text size="sm" c="dimmed" mt={4}>{step.description}</Text>

          <Group gap="xs" mt="sm">
            {isTour ? (
              <Button component={Link} to="/map/tour" size="xs" rightSection={<IconArrowRight size={15} />}>
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
