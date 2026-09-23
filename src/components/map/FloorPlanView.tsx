import { ActionIcon, Box, Tooltip } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { IconArrowsMinimize, IconFocusCentered, IconZoomIn, IconZoomOut } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, type KeyboardEvent } from "react";
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchContentRef,
} from "react-zoom-pan-pinch";
import { routeArrows, splitRoute, type RouteProgress, type TourStop } from "../../lib/map";
import type { FloorPlan, PlanPoint } from "../../types/content";
import { pointOfInterestIcons } from "./pointOfInterestIcons";
import { renderStopIcon } from "./stopIcons";

/** Pin and icon sizes in floor plan units. */
const PIN_SIZE = 58;
const POI_SIZE = 42;
/** Smallest on-screen pin (px) at the default zoom: a comfortable finger target. */
const MIN_PIN_PIXELS = 44;
const ARROW_SPACING = 110;
/** Used before the viewport has been measured (and in tests). */
const FALLBACK_HEIGHT = 420;
const FOCUS_SCALE = 1;

interface FloorPlanViewProps {
  floorPlan: FloorPlan;
  stops: TourStop[];
  selectedBoothId?: string;
  currentBoothId?: string;
  visitedStampIds: ReadonlySet<string>;
  /** How much of this floor's route the visitor has already walked. */
  progress: RouteProgress;
  onSelectStop: (boothId: string) => void;
  /** Fill the parent's height instead of using a fixed height. */
  fill?: boolean;
  /** Space (px) covered by overlays, kept clear when centering a stop. */
  insetTop?: number;
  insetBottom?: number;
  /** "compact" drops the zoom buttons (pinch works) for small screens. */
  controls?: "full" | "compact";
}

function toPoints(points: PlanPoint[]): string {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

function labelPosition(points: PlanPoint[]): PlanPoint {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}

function clampOffset(offset: number, viewport: number, content: number): number {
  if (content <= viewport) {
    return (viewport - content) / 2;
  }
  return Math.min(0, Math.max(viewport - content, offset));
}

export function FloorPlanView({
  floorPlan,
  stops,
  selectedBoothId,
  currentBoothId,
  visitedStampIds,
  progress,
  onSelectStop,
  fill = false,
  insetTop = 0,
  insetBottom = 0,
  controls = "full",
}: FloorPlanViewProps) {
  const { ref: viewportRef, width: measuredWidth, height: measuredHeight } = useElementSize();
  const zoomRef = useRef<ReactZoomPanPinchContentRef>(null);

  const viewportHeight = measuredHeight || FALLBACK_HEIGHT;
  const viewportWidth = measuredWidth || viewportHeight * 2;
  const pixelsPerUnit = viewportHeight / floorPlan.height;
  const contentWidth = floorPlan.width * pixelsPerUnit;
  const fitScale = Math.min(1, viewportWidth / contentWidth);
  const pinSize = Math.max(PIN_SIZE, MIN_PIN_PIXELS / pixelsPerUnit);
  const selectedStop = stops.find((stop) => stop.booth.id === selectedBoothId);

  const route = useMemo(() => {
    const { walked, ahead } = splitRoute(floorPlan.route, progress);
    return { walked, ahead, arrows: routeArrows(ahead, ARROW_SPACING) };
  }, [floorPlan.route, progress]);

  const showWholeFloor = useCallback(
    (animationTime = 300) => {
      zoomRef.current?.setTransform(
        (viewportWidth - contentWidth * fitScale) / 2,
        (viewportHeight - viewportHeight * fitScale) / 2,
        fitScale,
        animationTime,
      );
    },
    [contentWidth, fitScale, viewportHeight, viewportWidth],
  );

  const focusSelectedStop = useCallback(
    (animationTime = 300) => {
      if (!selectedStop) {
        showWholeFloor(animationTime);
        return;
      }

      const [x, y] = selectedStop.point;
      const visibleCenterY = insetTop + (viewportHeight - insetTop - insetBottom) / 2;
      zoomRef.current?.setTransform(
        clampOffset(viewportWidth / 2 - x * pixelsPerUnit * FOCUS_SCALE, viewportWidth, contentWidth * FOCUS_SCALE),
        clampOffset(visibleCenterY - y * pixelsPerUnit * FOCUS_SCALE, viewportHeight, viewportHeight * FOCUS_SCALE),
        FOCUS_SCALE,
        animationTime,
      );
    },
    [contentWidth, insetBottom, insetTop, pixelsPerUnit, selectedStop, showWholeFloor, viewportHeight, viewportWidth],
  );

  // Animate when the visitor picks another stop; jump instantly when only the size changed.
  // The frame delay lets the zoom library finish re-measuring resized content first.
  const lastFocusKey = useRef<string>(undefined);
  useEffect(() => {
    const focusKey = `${floorPlan.id}:${selectedStop?.booth.id ?? ""}`;
    const animationTime = lastFocusKey.current && lastFocusKey.current !== focusKey ? 300 : 0;
    lastFocusKey.current = focusKey;

    const frame = requestAnimationFrame(() => focusSelectedStop(animationTime));
    return () => cancelAnimationFrame(frame);
  }, [floorPlan.id, focusSelectedStop, selectedStop]);

  const handlePinKeyDown = (event: KeyboardEvent<SVGGElement>, boothId: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelectStop(boothId);
    }
  };

  return (
    <Box ref={viewportRef} className="floor-plan-viewport" data-fill={fill || undefined}>
      <TransformWrapper
        ref={zoomRef}
        minScale={fitScale}
        maxScale={4}
        limitToBounds
        centerZoomedOut
        doubleClick={{ mode: "zoomIn" }}
        wheel={{ step: 0.15 }}
      >
        <TransformComponent wrapperClass="floor-plan-transform" wrapperStyle={{ width: "100%", height: "100%" }}>
          <svg
            className="floor-plan"
            width={contentWidth}
            height={viewportHeight}
            viewBox={`0 0 ${floorPlan.width} ${floorPlan.height}`}
            role="group"
            aria-label={`${floorPlan.label} plan of the Mechanical Engineering Building`}
          >
            <polygon className="plan-outline" points={toPoints(floorPlan.outline)} />

            {floorPlan.rooms.map((room, index) => {
              const [labelX, labelY] = labelPosition(room.points);
              return (
                <g key={`${room.label ?? "room"}-${index}`} aria-hidden="true">
                  <polygon className="plan-room" points={toPoints(room.points)} />
                  {room.label && (
                    <text className="plan-room-label" x={labelX} y={labelY} textAnchor="middle" dominantBaseline="central">
                      {room.label}
                    </text>
                  )}
                </g>
              );
            })}

            <g aria-hidden="true">
              <polyline className="plan-route-casing" points={toPoints(floorPlan.route)} />
              {route.walked.length > 1 && <polyline className="plan-route-walked" points={toPoints(route.walked)} />}
              {route.ahead.length > 1 && <polyline className="plan-route" points={toPoints(route.ahead)} />}
              {route.arrows.map((arrow, index) => (
                <path
                  key={index}
                  className="plan-route-arrow"
                  d="M -6 -9 L 5 0 L -6 9"
                  transform={`translate(${arrow.x} ${arrow.y}) rotate(${arrow.angle})`}
                />
              ))}
            </g>

            {floorPlan.pointsOfInterest.map((poi, index) => {
              const { icon: PoiIcon, label } = pointOfInterestIcons[poi.type];
              return (
                <g
                  key={`${poi.type}-${index}`}
                  className="plan-poi"
                  data-type={poi.type}
                  transform={`translate(${poi.x} ${poi.y})`}
                  aria-hidden="true"
                >
                  <title>{poi.label ?? label}</title>
                  <rect x={-POI_SIZE / 2} y={-POI_SIZE / 2} width={POI_SIZE} height={POI_SIZE} rx={10} />
                  <PoiIcon x={-POI_SIZE * 0.36} y={-POI_SIZE * 0.36} size={POI_SIZE * 0.72} stroke={2} />
                  {poi.label && (
                    <text className="plan-poi-label" x={0} y={-POI_SIZE / 2 - 12} textAnchor="middle">
                      {poi.label}
                    </text>
                  )}
                </g>
              );
            })}

            {stops.map((stop) => {
              const isSelected = stop.booth.id === selectedBoothId;
              const isCurrent = stop.booth.id === currentBoothId;
              const isVisited = visitedStampIds.has(stop.booth.stamp.id);
              const half = pinSize / 2;
              const badge = pinSize * 0.27;
              const [x, y] = stop.point;

              return (
                <g key={stop.booth.id} transform={`translate(${x} ${y})`}>
                  <g
                    className="plan-pin"
                    data-selected={isSelected || undefined}
                    data-visited={isVisited || undefined}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`Stop ${stop.number}: ${stop.booth.name}${isVisited ? ", visited" : ""}${isCurrent ? ", you are here" : ""}`}
                    onClick={() => onSelectStop(stop.booth.id)}
                    onKeyDown={(event) => handlePinKeyDown(event, stop.booth.id)}
                  >
                    {isCurrent && <circle className="plan-pin-pulse" r={pinSize * 0.85} />}
                    <rect className="plan-pin-box" x={-half} y={-half} width={pinSize} height={pinSize} rx={pinSize * 0.16} />
                    <text
                      className="plan-pin-number"
                      textAnchor="middle"
                      dominantBaseline="central"
                      style={{ fontSize: pinSize * 0.52 }}
                    >
                      {stop.number}
                    </text>
                    <g className="plan-pin-icon" transform={`translate(${-half + 2} ${half - 2})`}>
                      <circle r={badge} />
                      {renderStopIcon(stop.booth, { x: -badge * 0.68, y: -badge * 0.68, size: badge * 1.36, stroke: 2.2 })}
                    </g>
                    {isVisited && (
                      <g className="plan-pin-check" transform={`translate(${half - 2} ${-half + 2}) scale(${pinSize / PIN_SIZE})`}>
                        <circle r={15} />
                        <path d="M -7 0 L -2 5 L 7 -5" />
                      </g>
                    )}
                  </g>
                </g>
              );
            })}
          </svg>
        </TransformComponent>
      </TransformWrapper>

      <div className="floor-plan-controls" data-compact={controls === "compact" || undefined}>
        {controls === "full" && (
          <>
            <Tooltip label="Zoom in" position="left">
              <ActionIcon variant="default" size="lg" aria-label="Zoom in" onClick={() => zoomRef.current?.zoomIn(0.5)}>
                <IconZoomIn size={18} stroke={1.8} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Zoom out" position="left">
              <ActionIcon variant="default" size="lg" aria-label="Zoom out" onClick={() => zoomRef.current?.zoomOut(0.5)}>
                <IconZoomOut size={18} stroke={1.8} />
              </ActionIcon>
            </Tooltip>
          </>
        )}
        <Tooltip label="Show whole floor" position="left">
          <ActionIcon
            variant="default"
            size={controls === "compact" ? 44 : "lg"}
            radius={controls === "compact" ? "xl" : undefined}
            aria-label="Show whole floor"
            onClick={() => showWholeFloor()}
          >
            <IconArrowsMinimize size={18} stroke={1.8} />
          </ActionIcon>
        </Tooltip>
        {selectedStop && (
          <Tooltip label="Center on selected stop" position="left">
            <ActionIcon
              variant="default"
              size={controls === "compact" ? 44 : "lg"}
              radius={controls === "compact" ? "xl" : undefined}
              aria-label="Center on selected stop"
              onClick={() => focusSelectedStop()}
            >
              <IconFocusCentered size={18} stroke={1.8} />
            </ActionIcon>
          </Tooltip>
        )}
      </div>
    </Box>
  );
}
