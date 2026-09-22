import { ActionIcon, Box, Tooltip } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { IconArrowsMinimize, IconFocusCentered, IconZoomIn, IconZoomOut } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, type KeyboardEvent } from "react";
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchContentRef,
} from "react-zoom-pan-pinch";
import type { TourStop } from "../../lib/map";
import type { FloorPlan, PlanPoint } from "../../types/content";
import { pointOfInterestIcons } from "./pointOfInterestIcons";

/** Pin and icon sizes in floor plan units. */
const PIN_SIZE = 58;
const POI_SIZE = 42;
/** Used before the viewport has been measured (and in tests). */
const FALLBACK_HEIGHT = 420;
const FOCUS_SCALE = 1;

interface FloorPlanViewProps {
  floorPlan: FloorPlan;
  stops: TourStop[];
  selectedBoothId?: string;
  currentBoothId?: string;
  visitedStampIds: ReadonlySet<string>;
  onSelectStop: (boothId: string) => void;
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
  onSelectStop,
}: FloorPlanViewProps) {
  const { ref: viewportRef, width: measuredWidth, height: measuredHeight } = useElementSize();
  const zoomRef = useRef<ReactZoomPanPinchContentRef>(null);

  const viewportHeight = measuredHeight || FALLBACK_HEIGHT;
  const viewportWidth = measuredWidth || viewportHeight * 2;
  const pixelsPerUnit = viewportHeight / floorPlan.height;
  const contentWidth = floorPlan.width * pixelsPerUnit;
  const fitScale = Math.min(1, viewportWidth / contentWidth);
  const selectedStop = stops.find((stop) => stop.booth.id === selectedBoothId);

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
      zoomRef.current?.setTransform(
        clampOffset(viewportWidth / 2 - x * pixelsPerUnit * FOCUS_SCALE, viewportWidth, contentWidth * FOCUS_SCALE),
        clampOffset(viewportHeight / 2 - y * pixelsPerUnit * FOCUS_SCALE, viewportHeight, viewportHeight * FOCUS_SCALE),
        FOCUS_SCALE,
        animationTime,
      );
    },
    [contentWidth, pixelsPerUnit, selectedStop, showWholeFloor, viewportHeight, viewportWidth],
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
    <Box ref={viewportRef} className="floor-plan-viewport">
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
              <polyline className="plan-route" points={toPoints(floorPlan.route)} />
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
                    {isCurrent && <circle className="plan-pin-pulse" r={PIN_SIZE * 0.85} />}
                    <rect
                      className="plan-pin-box"
                      x={-PIN_SIZE / 2}
                      y={-PIN_SIZE / 2}
                      width={PIN_SIZE}
                      height={PIN_SIZE}
                      rx={9}
                    />
                    <text className="plan-pin-number" textAnchor="middle" dominantBaseline="central">
                      {stop.number}
                    </text>
                    {isVisited && (
                      <g className="plan-pin-check" transform={`translate(${PIN_SIZE / 2 - 2} ${-PIN_SIZE / 2 + 2})`}>
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

      <div className="floor-plan-controls">
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
        <Tooltip label="Show whole floor" position="left">
          <ActionIcon variant="default" size="lg" aria-label="Show whole floor" onClick={() => showWholeFloor()}>
            <IconArrowsMinimize size={18} stroke={1.8} />
          </ActionIcon>
        </Tooltip>
        {selectedStop && (
          <Tooltip label="Center on selected stop" position="left">
            <ActionIcon
              variant="default"
              size="lg"
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
