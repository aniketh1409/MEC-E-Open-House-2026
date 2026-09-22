import { Alert, Button } from "@mantine/core";
import { IconCurrentLocation } from "@tabler/icons-react";
import L, { type LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { JourneyStepDetails } from "../../lib/map";
import type { JourneyLeg } from "../../types/content";

interface CampusMapProps {
  steps: JourneyStepDetails[];
  legs: JourneyLeg[];
  visitedStampIds: ReadonlySet<string>;
}

interface VisitorPosition {
  center: LatLngTuple;
  accuracy: number;
}

const routeStyle: L.PathOptions = { color: "#275d38", weight: 5, dashArray: "10 9", lineCap: "round" };
const accuracyStyle: L.PathOptions = { color: "#1f6fd1", weight: 1, opacity: 0.35, fillOpacity: 0.12 };
const visitorDotStyle: L.PathOptions = { color: "#ffffff", weight: 3, fillColor: "#1f6fd1", fillOpacity: 1 };

function stepIcon(step: JourneyStepDetails, isVisited: boolean) {
  return L.divIcon({
    className: "campus-pin-wrapper",
    html: `<span class="campus-pin"${isVisited ? " data-visited" : ""}>${step.number}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    tooltipAnchor: [16, 0],
  });
}

function FitToRoute({ bounds }: { bounds: L.LatLngBounds }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [36, 36] });
  }, [bounds, map]);
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

/** Pans to the visitor once, the first time their position arrives. */
function CenterOnVisitor({ position }: { position?: VisitorPosition }) {
  const map = useMap();
  const hasCentered = useRef(false);
  useEffect(() => {
    if (position && !hasCentered.current) {
      map.panTo(position.center);
      hasCentered.current = true;
    }
  }, [map, position]);
  return null;
}

export default function CampusMap({ steps, legs, visitedStampIds }: CampusMapProps) {
  const [isLocating, setIsLocating] = useState(false);
  const { position, error } = useVisitorPosition(isLocating);

  const bounds = useMemo(() => {
    const stepPositions = steps.map(({ building }): LatLngTuple => [building.position.lat, building.position.lng]);
    return L.latLngBounds([...legs.flatMap((leg) => leg.path), ...stepPositions]);
  }, [legs, steps]);

  return (
    <div className="campus-map">
      <MapContainer
        className="campus-map-canvas"
        bounds={bounds}
        scrollWheelZoom={false}
        maxZoom={19}
        attributionControl
      >
        <TileLayer
          className="campus-tiles"
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
        <FitToRoute bounds={bounds} />

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
            <Circle center={position.center} radius={position.accuracy} pathOptions={accuracyStyle} />
            <CircleMarker center={position.center} radius={7} pathOptions={visitorDotStyle} />
          </>
        )}
        {isLocating && <CenterOnVisitor position={position} />}
      </MapContainer>

      <Button
        className="campus-locate-button"
        size="xs"
        variant={isLocating ? "filled" : "white"}
        leftSection={<IconCurrentLocation size={16} />}
        onClick={() => setIsLocating((value) => !value)}
      >
        {isLocating ? "Hide my location" : "Show my location"}
      </Button>

      {isLocating && error && (
        <Alert className="campus-locate-error" color="orange" variant="filled" p="xs">
          {error}
        </Alert>
      )}
    </div>
  );
}
