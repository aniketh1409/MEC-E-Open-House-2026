import { ActionIcon, Alert, Button } from "@mantine/core";
import { IconCurrentLocation, IconNavigation, IconWalk } from "@tabler/icons-react";
import L, { type LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { distanceMeters, walkingMinutes, type JourneyStepDetails } from "../../lib/map";
import type { JourneyLeg } from "../../types/content";

interface CampusMapProps {
  steps: JourneyStepDetails[];
  legs: JourneyLeg[];
  visitedStampIds: ReadonlySet<string>;
  /** Where the visitor is heading next; used for the live distance readout. */
  targetStep?: JourneyStepDetails;
  /** Space (px) covered by a bottom sheet, kept clear when fitting the route. */
  insetBottom?: number;
  showZoomControl?: boolean;
}

interface VisitorPosition {
  center: LatLngTuple;
  accuracy: number;
}

/** Below this GPS accuracy (m) the accuracy circle adds noise rather than information. */
const SHOW_ACCURACY_ABOVE = 15;
const ARRIVED_WITHIN = 40;

const routeStyle: L.PathOptions = { color: "#275d38", weight: 5, dashArray: "10 9", lineCap: "round" };
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

function FitToRoute({ bounds, insetBottom }: { bounds: L.LatLngBounds; insetBottom: number }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { paddingTopLeft: [36, 48], paddingBottomRight: [36, 36 + insetBottom] });
  }, [bounds, insetBottom, map]);
  return null;
}

function useVisitorPosition(enabled: boolean) {
  const [position, setPosition] = useState<VisitorPosition>();
  const [error, setError] = useState<string>();
  const isSupported = "geolocation" in navigator;

  useEffect(() => {
    if (!enabled || !isSupported) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setError(undefined);
        setPosition({ center: [coords.latitude, coords.longitude], accuracy: coords.accuracy });
      },
      () => setError("We couldn't get your location. Check that location access is allowed."),
      { enableHighAccuracy: true, maximumAge: 10_000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled, isSupported]);

  return { position, error: isSupported ? error : "Location isn't available on this device." };
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
  insetBottom = 0,
  showZoomControl = true,
}: CampusMapProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [following, setFollowing] = useState(true);
  const { position, error } = useVisitorPosition(isLocating);

  const bounds = useMemo(() => {
    const stepPositions = steps.map(({ building }): LatLngTuple => [building.position.lat, building.position.lng]);
    return L.latLngBounds([...legs.flatMap((leg) => leg.path), ...stepPositions]);
  }, [legs, steps]);

  const distanceToTarget =
    isLocating && position && targetStep
      ? distanceMeters({ lat: position.center[0], lng: position.center[1] }, targetStep.building.position)
      : undefined;

  const startLocating = () => {
    setFollowing(true);
    setIsLocating(true);
  };

  return (
    <div className="campus-map">
      <MapContainer
        className="campus-map-canvas"
        bounds={bounds}
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
        <FitToRoute bounds={bounds} insetBottom={insetBottom} />

        {legs.map((leg) => (
          <Polyline key={`${leg.from}-${leg.to}`} positions={leg.path} pathOptions={routeStyle} />
        ))}

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

      {distanceToTarget !== undefined && targetStep && (
        <div className="campus-distance-chip" role="status">
          <IconWalk size={16} stroke={2} aria-hidden="true" />
          {distanceToTarget <= ARRIVED_WITHIN
            ? `You've arrived at ${targetStep.building.abbreviation}`
            : `${Math.round(distanceToTarget / 10) * 10} m to ${targetStep.building.abbreviation} · ~${walkingMinutes(distanceToTarget)} min`}
        </div>
      )}

      <div className="campus-map-controls">
        {!isLocating && (
          <Button
            className="map-fab"
            variant="white"
            radius="xl"
            leftSection={<IconCurrentLocation size={18} />}
            onClick={startLocating}
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
            onClick={() => setIsLocating(false)}
          >
            <IconCurrentLocation size={20} />
          </ActionIcon>
        )}
      </div>

      {isLocating && error && (
        <Alert className="campus-locate-error" color="orange" variant="filled" p="xs">
          {error}
        </Alert>
      )}
    </div>
  );
}
