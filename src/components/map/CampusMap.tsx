import { ActionIcon, Alert, Button } from "@mantine/core";
import { IconCurrentLocation, IconNavigation, IconWalk } from "@tabler/icons-react";
import L, { type LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import type { VisitorPosition } from "../../hooks/useVisitorPosition";
import type { CampusRoute } from "../../lib/campusRouter";
import { distanceMeters, walkingMinutes, type JourneyStepDetails } from "../../lib/map";
import type { Building, JourneyLeg } from "../../types/content";

export interface PlannedRoute {
  /** Changes whenever the visitor picks a new start or destination. */
  key: string;
  route?: CampusRoute;
  destination: Building;
  /** True when the route starts from the visitor's live position. */
  isLive: boolean;
}

interface CampusMapProps {
  steps: JourneyStepDetails[];
  legs: JourneyLeg[];
  visitedStampIds: ReadonlySet<string>;
  /** Where the visitor is heading next; used for the live distance readout. */
  targetStep?: JourneyStepDetails;
  isLocating: boolean;
  onLocatingChange: (isLocating: boolean) => void;
  position?: VisitorPosition;
  locationError?: string;
  /** A "Where to?" route, drawn over the fixed journey. */
  plannedRoute?: PlannedRoute;
  /** Space (px) covered by a bottom sheet, kept clear when fitting the route. */
  insetBottom?: number;
  showZoomControl?: boolean;
}

/** Below this GPS accuracy (m) the accuracy circle adds noise rather than information. */
const SHOW_ACCURACY_ABOVE = 15;
const ARRIVED_WITHIN = 40;

const journeyStyle: L.PathOptions = { color: "#275d38", weight: 5, dashArray: "10 9", lineCap: "round" };
const plannedCasingStyle: L.PathOptions = { color: "#ffffff", weight: 10, opacity: 0.95, lineCap: "round", lineJoin: "round" };
const plannedStyle: L.PathOptions = { color: "#1f6fd1", weight: 6, lineCap: "round", lineJoin: "round" };
const accuracyStyle: L.PathOptions = { color: "#1f6fd1", weight: 1, opacity: 0.35, fillOpacity: 0.12 };

function stepIcon(step: JourneyStepDetails, isVisited: boolean) {
  return L.divIcon({
    className: "campus-pin-wrapper",
    html: `<span class="campus-pin"${isVisited ? " data-visited" : ""}>${step.number}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    tooltipAnchor: [16, 0],
  });
}

/** Flag for a "Where to?" destination that isn't one of the journey's numbered stops. */
const destinationIcon = L.divIcon({
  className: "campus-pin-wrapper",
  html: `<span class="campus-destination-pin">★</span>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  tooltipAnchor: [14, 0],
});

/** Teardrop pin whose tip marks the visitor's exact position at every zoom level. */
const visitorIcon = L.divIcon({
  className: "visitor-pin-wrapper",
  html: `
    <span class="visitor-pin-pulse"></span>
    <span class="visitor-pin-label">You</span>
    <svg class="visitor-pin" viewBox="0 0 36 46" aria-hidden="true">
      <path d="M18 44.5C18 44.5 3 27.5 3 17.5a15 15 0 1 1 30 0c0 10-15 27-15 27Z" />
      <circle cx="18" cy="17.5" r="6" />
    </svg>`,
  iconSize: [36, 46],
  iconAnchor: [18, 45],
});

/** Fits the map to the journey, or to a planned route when one is chosen. Refits only when that choice changes. */
function FitToView({ bounds, fitKey, insetBottom }: { bounds: L.LatLngBounds; fitKey: string; insetBottom: number }) {
  const map = useMap();
  const latestBounds = useRef(bounds);
  useEffect(() => {
    latestBounds.current = bounds;
  });
  useEffect(() => {
    map.fitBounds(latestBounds.current, { paddingTopLeft: [36, 56], paddingBottomRight: [36, 36 + insetBottom] });
  }, [fitKey, insetBottom, map]);
  return null;
}

/** Keeps the visitor centred while following; a manual drag pauses following. */
function FollowVisitor({
  position,
  following,
  onManualMove,
}: {
  position?: VisitorPosition;
  following: boolean;
  onManualMove: () => void;
}) {
  const map = useMapEvents({ dragstart: onManualMove });
  const hasZoomedIn = useRef(false);

  useEffect(() => {
    if (!position || !following) {
      return;
    }
    if (!hasZoomedIn.current) {
      hasZoomedIn.current = true;
      map.setView(position.center, Math.max(map.getZoom(), 17), { animate: true });
    } else {
      map.panTo(position.center, { animate: true });
    }
  }, [following, map, position]);

  return null;
}

export default function CampusMap({
  steps,
  legs,
  visitedStampIds,
  targetStep,
  isLocating,
  onLocatingChange,
  position,
  locationError,
  plannedRoute,
  insetBottom = 0,
  showZoomControl = true,
}: CampusMapProps) {
  // Following is remembered per planned route: a new route starts zoomed out to show all of it.
  const routeKey = plannedRoute?.key ?? "";
  const [followState, setFollowState] = useState({ routeKey, following: true });
  const following = followState.routeKey === routeKey ? followState.following : !plannedRoute;
  const setFollowing = (value: boolean) => setFollowState({ routeKey, following: value });

  const journeyBounds = useMemo(() => {
    const stepPositions = steps.map(({ building }): LatLngTuple => [building.position.lat, building.position.lng]);
    return L.latLngBounds([...legs.flatMap((leg) => leg.path), ...stepPositions]);
  }, [legs, steps]);
  const routePath = plannedRoute?.route?.path;
  const bounds = routePath ? L.latLngBounds(routePath) : journeyBounds;
  const fitKey = routePath ? `route:${routeKey}` : `journey:${steps.map((step) => step.id).join(",")}`;

  const readout = (() => {
    if (!isLocating || !position) return undefined;
    if (plannedRoute?.isLive && plannedRoute.route) {
      const { distanceMeters: meters, minutes } = plannedRoute.route;
      return meters <= ARRIVED_WITHIN
        ? `You've arrived at ${plannedRoute.destination.abbreviation}`
        : `${Math.round(meters / 10) * 10} m to ${plannedRoute.destination.abbreviation} · ${minutes} min`;
    }
    if (!targetStep) return undefined;
    const meters = distanceMeters({ lat: position.center[0], lng: position.center[1] }, targetStep.building.position);
    return meters <= ARRIVED_WITHIN
      ? `You've arrived at ${targetStep.building.abbreviation}`
      : `${Math.round(meters / 10) * 10} m to ${targetStep.building.abbreviation} · ~${walkingMinutes(meters)} min`;
  })();

  const destination = plannedRoute?.destination;
  const destinationIsJourneyStop = destination && steps.some((step) => step.building.id === destination.id);

  return (
    <div className="campus-map">
      <MapContainer
        className="campus-map-canvas"
        bounds={journeyBounds}
        scrollWheelZoom={false}
        zoomControl={showZoomControl}
        maxZoom={19}
        attributionControl
      >
        <TileLayer
          className="campus-tiles"
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
        <FitToView bounds={bounds} fitKey={fitKey} insetBottom={insetBottom} />

        {legs.map((leg) => (
          <Polyline
            key={`${leg.from}-${leg.to}`}
            positions={leg.path}
            pathOptions={routePath ? { ...journeyStyle, opacity: 0.3 } : journeyStyle}
          />
        ))}

        {routePath && (
          <>
            <Polyline positions={routePath} pathOptions={plannedCasingStyle} interactive={false} />
            <Polyline positions={routePath} pathOptions={plannedStyle} interactive={false} />
          </>
        )}

        {steps.map((step) => (
          <Marker
            key={step.id}
            position={[step.building.position.lat, step.building.position.lng]}
            icon={stepIcon(step, Boolean(step.booth && visitedStampIds.has(step.booth.stamp.id)))}
            title={`${step.number}. ${step.title}`}
          >
            <Tooltip direction="right" permanent className="campus-pin-tooltip">
              {step.building.abbreviation}
            </Tooltip>
          </Marker>
        ))}

        {destination && !destinationIsJourneyStop && (
          <Marker position={[destination.position.lat, destination.position.lng]} icon={destinationIcon} title={destination.name}>
            <Tooltip direction="right" permanent className="campus-pin-tooltip">
              {destination.abbreviation}
            </Tooltip>
          </Marker>
        )}

        {isLocating && position && (
          <>
            {position.accuracy > SHOW_ACCURACY_ABOVE && (
              <Circle center={position.center} radius={position.accuracy} pathOptions={accuracyStyle} interactive={false} />
            )}
            <Marker
              position={position.center}
              icon={visitorIcon}
              zIndexOffset={1000}
              interactive={false}
              keyboard={false}
              title="Your location"
            />
          </>
        )}
        {isLocating && (
          <FollowVisitor position={position} following={following} onManualMove={() => setFollowing(false)} />
        )}
      </MapContainer>

      {readout && (
        <div className="campus-distance-chip" role="status">
          <IconWalk size={16} stroke={2} aria-hidden="true" />
          {readout}
        </div>
      )}

      <div className="campus-map-controls">
        {!isLocating && (
          <Button
            className="map-fab"
            variant="white"
            radius="xl"
            leftSection={<IconCurrentLocation size={18} />}
            onClick={() => {
              setFollowing(true);
              onLocatingChange(true);
            }}
          >
            Show my location
          </Button>
        )}
        {isLocating && !following && (
          <Button
            className="map-fab"
            variant="white"
            radius="xl"
            leftSection={<IconNavigation size={18} />}
            onClick={() => setFollowing(true)}
          >
            Re-center
          </Button>
        )}
        {isLocating && (
          <ActionIcon
            className="map-fab"
            size={44}
            radius="xl"
            variant="filled"
            color="blue"
            aria-label="Stop showing my location"
            onClick={() => onLocatingChange(false)}
          >
            <IconCurrentLocation size={20} />
          </ActionIcon>
        )}
      </div>

      {isLocating && locationError && (
        <Alert className="campus-locate-error" color="orange" variant="filled" p="xs">
          {locationError}
        </Alert>
      )}
    </div>
  );
}
