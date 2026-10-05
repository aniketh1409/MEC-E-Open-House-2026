import { ActionIcon, Alert, Button } from "@mantine/core";
import { IconCurrentLocation, IconNavigation, IconWalk } from "@tabler/icons-react";
import L, { type LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import type { VisitorPosition } from "../../hooks/useVisitorPosition";
import type { CampusRoute } from "../../lib/campusRouter";
import { distanceMeters, walkingMinutes, type JourneyStepDetails } from "../../lib/map";
import type { Building, JourneyLeg, Place, PlaceCategory } from "../../types/content";

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
  /** Nearby places to show (food, parking, …). */
  places?: Place[];
  /** "Walk here" from a place's popup. */
  onPlaceSelect?: (placeId: string) => void;
  /** Phones: round icon-only location buttons, stacked, to leave the map visible. */
  compactControls?: boolean;
  /** Compass heading (degrees from north) for the direction cone, when the phone shares it. */
  heading?: number;
  /** Live navigation: follow the visitor closely. */
  navigating?: boolean;
}

/** Below this GPS accuracy (m) the accuracy circle adds noise rather than information. */
const SHOW_ACCURACY_ABOVE = 40;
const ARRIVED_WITHIN = 40;

const journeyStyle: L.PathOptions = { color: "#275d38", weight: 5, dashArray: "10 9", lineCap: "round" };
const plannedCasingStyle: L.PathOptions = { color: "#ffffff", weight: 10, opacity: 0.95, lineCap: "round", lineJoin: "round" };
const plannedStyle: L.PathOptions = { color: "#1f6fd1", weight: 6, lineCap: "round", lineJoin: "round" };
const accuracyStyle: L.PathOptions = { color: "#1f6fd1", weight: 1, opacity: 0.25, fillOpacity: 0.05, dashArray: "4 6" };

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

const placeGlyphs: Record<PlaceCategory, string> = {
  parking: `<b>P</b>`,
  help: `<b>?</b>`,
  food: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v8a2 2 0 0 0 4 0V3M9 3v18M17 3c-2 1-3 3.5-3 7h3v11" /></svg>`,
  transit: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="3" width="12" height="13" rx="3" /><path d="M6 10h12M9 20l-2 2M15 20l2 2M9 13h.01M15 13h.01" /></svg>`,
};

const busGlyph = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="13" rx="2" /><path d="M5 11h14M8 20v-3M16 20v-3" /></svg>`;

const placeIconCache = new Map<string, L.DivIcon>();

/** Round category pin; organizer picks get a star, bus stops a smaller pin. */
function placeIcon(place: Place): L.DivIcon {
  const key = `${place.category}:${place.kind ?? ""}:${place.official ? 1 : 0}`;
  let icon = placeIconCache.get(key);
  if (!icon) {
    const size = place.kind === "bus" ? 22 : 28;
    icon = L.divIcon({
      className: "campus-pin-wrapper",
      html: `<span class="campus-place-pin" data-category="${place.category}"${place.kind ? ` data-kind="${place.kind}"` : ""}>${
        place.kind === "bus" ? busGlyph : placeGlyphs[place.category]
      }${place.official ? `<i class="campus-place-star">★</i>` : ""}</span>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2 + 2],
    });
    placeIconCache.set(key, icon);
  }
  return icon;
}

/** Tracks the map's zoom so detail pins appear only when zoomed in. */
function ZoomWatcher({ onZoom }: { onZoom: (zoom: number) => void }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) });
  useEffect(() => onZoom(map.getZoom()), [map, onZoom]);
  return null;
}

const visitorIcons = new Map<string, L.DivIcon>();

/** Blue "you" dot; a soft cone shows which way the visitor is facing when the heading is known. */
function visitorIcon(heading?: number): L.DivIcon {
  const key = heading === undefined ? "none" : String(Math.round(heading / 10) * 10);
  let icon = visitorIcons.get(key);
  if (!icon) {
    const cone =
      heading === undefined
        ? ""
        : `<svg class="visitor-cone" viewBox="0 0 80 80" style="transform: rotate(${key}deg)" aria-hidden="true">
             <defs><radialGradient id="cone-${key}" cx="50%" cy="100%" r="100%"><stop offset="0" stop-color="#1f6fd1" stop-opacity="0.55"/><stop offset="1" stop-color="#1f6fd1" stop-opacity="0"/></radialGradient></defs>
             <path d="M40 40 L22 4 A40 40 0 0 1 58 4 Z" fill="url(#cone-${key})"/>
           </svg>`;
    icon = L.divIcon({
      className: "visitor-dot-wrapper",
      html: `${cone}<span class="visitor-dot-pulse"></span><span class="visitor-dot"></span><span class="visitor-dot-label">You</span>`,
      iconSize: [80, 80],
      iconAnchor: [40, 40],
    });
    visitorIcons.set(key, icon);
  }
  return icon;
}

/** A soft ring pulsing under the destination, so the eye goes to where you're heading. */
const destinationPulseIcon = L.divIcon({
  className: "campus-pin-wrapper",
  html: `<span class="destination-pulse"></span>`,
  iconSize: [60, 60],
  iconAnchor: [30, 30],
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
  closeUp = false,
}: {
  position?: VisitorPosition;
  following: boolean;
  onManualMove: () => void;
  /** Navigation: zoom in closer so the next turn is easy to see. */
  closeUp?: boolean;
}) {
  const map = useMapEvents({ dragstart: onManualMove });
  const hasZoomedIn = useRef(false);

  useEffect(() => {
    if (!position || !following) {
      return;
    }
    const targetZoom = closeUp ? 18 : 17;
    if (!hasZoomedIn.current || map.getZoom() < targetZoom) {
      hasZoomedIn.current = true;
      map.setView(position.center, Math.max(map.getZoom(), targetZoom), { animate: true });
    } else {
      map.panTo(position.center, { animate: true });
    }
  }, [closeUp, following, map, position]);

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
  places = [],
  onPlaceSelect,
  compactControls = false,
  heading,
  navigating = false,
}: CampusMapProps) {
  // Following is remembered per planned route: a new route starts zoomed out to show all of it,
  // while starting navigation starts following again.
  const routeKey = `${plannedRoute?.key ?? ""}${navigating ? ":nav" : ""}`;
  const [followState, setFollowState] = useState({ routeKey, following: true });
  const following = followState.routeKey === routeKey ? followState.following : !plannedRoute || navigating;
  const setFollowing = (value: boolean) => setFollowState({ routeKey, following: value });

  const journeyBounds = useMemo(() => {
    const stepPositions = steps.map(({ building }): LatLngTuple => [building.position.lat, building.position.lng]);
    return L.latLngBounds([...legs.flatMap((leg) => leg.path), ...stepPositions]);
  }, [legs, steps]);
  const routePath = plannedRoute?.route?.path;
  const bounds = routePath ? L.latLngBounds(routePath) : journeyBounds;
  const fitKey = routePath ? `route:${plannedRoute?.key}` : `journey:${steps.map((step) => step.id).join(",")}`;

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

  const [zoom, setZoom] = useState(16);
  const visiblePlaces = places.filter((place) => (place.minZoom ?? 0) <= zoom);

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
        {!navigating && <FitToView bounds={bounds} fitKey={fitKey} insetBottom={insetBottom} />}
        <ZoomWatcher onZoom={setZoom} />

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

        {visiblePlaces
          .filter((place) => place.id !== destination?.id)
          .map((place) => (
            <Marker
              key={place.id}
              position={[place.position.lat, place.position.lng]}
              icon={placeIcon(place)}
              title={place.name}
            >
              <Popup className="campus-place-popup">
                <strong>{place.name}</strong>
                {place.note && <span>{place.note}</span>}
                {place.official && <span className="campus-place-official">★ Recommended by the organizers</span>}
                {onPlaceSelect && (
                  <Button className="campus-walk-button" color="ualbertaGold.5" c="ualbertaGreen.9" size="sm" mt={8} fullWidth leftSection={<IconWalk size={17} />} onClick={() => onPlaceSelect(place.id)}>
                    Walk here
                  </Button>
                )}
              </Popup>
            </Marker>
          ))}

        {destination && (
          <Marker
            position={[destination.position.lat, destination.position.lng]}
            icon={destinationPulseIcon}
            interactive={false}
            keyboard={false}
            zIndexOffset={-100}
          />
        )}

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
              icon={visitorIcon(heading ?? position.heading)}
              zIndexOffset={1000}
              interactive={false}
              keyboard={false}
              title="Your location"
            />
          </>
        )}
        {isLocating && (
          <FollowVisitor position={position} following={following} closeUp={navigating} onManualMove={() => setFollowing(false)} />
        )}
      </MapContainer>

      {readout && (
        <div className="campus-distance-chip" role="status">
          <IconWalk size={16} stroke={2} aria-hidden="true" />
          {readout}
        </div>
      )}

      <div className="campus-map-controls" data-compact={compactControls || undefined}>
        {!isLocating && compactControls && (
          <ActionIcon
            className="map-fab"
            size={44}
            radius="xl"
            variant="white"
            aria-label="Show my location"
            onClick={() => {
              setFollowing(true);
              onLocatingChange(true);
            }}
          >
            <IconCurrentLocation size={21} />
          </ActionIcon>
        )}
        {isLocating && !following && compactControls && (
          <ActionIcon className="map-fab" size={44} radius="xl" variant="white" aria-label="Re-center" onClick={() => setFollowing(true)}>
            <IconNavigation size={20} />
          </ActionIcon>
        )}
        {!isLocating && !compactControls && (
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
        {isLocating && !following && !compactControls && (
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
