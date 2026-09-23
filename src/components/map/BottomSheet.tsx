import { useElementSize } from "@mantine/hooks";
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";

/** How far (px) a finger must move before a drag or swipe is recognized. */
const GESTURE_THRESHOLD = 8;
const SWIPE_DISTANCE = 56;
/** Flick speed (px/ms) that toggles the sheet regardless of distance. */
const FLICK_VELOCITY = 0.5;

interface BottomSheetProps {
  label: string;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  /** Always-visible top of the sheet. */
  peek: ReactNode;
  /** Horizontal swipes on the peek area. */
  onSwipe?: (direction: "previous" | "next") => void;
  onPeekHeightChange?: (height: number) => void;
  children: ReactNode;
}

interface Gesture {
  startX: number;
  startY: number;
  startTime: number;
  axis?: "x" | "y";
}

export function BottomSheet({
  label,
  expanded,
  onExpandedChange,
  peek,
  onSwipe,
  onPeekHeightChange,
  children,
}: BottomSheetProps) {
  const { ref: sheetRef, height: sheetHeight } = useElementSize();
  const { ref: headerRef, height: peekHeight } = useElementSize();
  const gesture = useRef<Gesture>(undefined);
  const suppressClick = useRef(false);
  const [dragOffset, setDragOffset] = useState<number>();

  useEffect(() => {
    if (peekHeight > 0) {
      onPeekHeightChange?.(peekHeight);
    }
  }, [onPeekHeightChange, peekHeight]);

  const travel = Math.max(0, sheetHeight - peekHeight);
  const baseOffset = expanded ? 0 : travel;
  const offset = dragOffset === undefined ? undefined : Math.min(travel, Math.max(0, baseOffset + dragOffset));

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    gesture.current = { startX: event.clientX, startY: event.clientY, startTime: event.timeStamp };
    suppressClick.current = false;
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current) {
      return;
    }

    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    if (!current.axis) {
      if (Math.abs(dx) < GESTURE_THRESHOLD && Math.abs(dy) < GESTURE_THRESHOLD) {
        return;
      }
      current.axis = Math.abs(dy) > Math.abs(dx) ? "y" : "x";
      suppressClick.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    if (current.axis === "y") {
      setDragOffset(dy);
    }
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    gesture.current = undefined;
    if (!current?.axis) {
      return;
    }

    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;

    if (current.axis === "y") {
      const velocity = dy / Math.max(1, event.timeStamp - current.startTime);
      const isFlick = Math.abs(velocity) > FLICK_VELOCITY;
      const passedHalfway = Math.abs(dy) > travel * 0.3;
      if ((isFlick || passedHalfway) && (dy < 0) !== expanded) {
        onExpandedChange(dy < 0);
      }
      setDragOffset(undefined);
    } else if (Math.abs(dx) > SWIPE_DISTANCE) {
      onSwipe?.(dx < 0 ? "next" : "previous");
    }
  };

  const handlePointerCancel = () => {
    gesture.current = undefined;
    setDragOffset(undefined);
  };

  return (
    <section
      ref={sheetRef}
      className="bottom-sheet"
      aria-label={label}
      data-expanded={expanded || undefined}
      data-dragging={dragOffset !== undefined || undefined}
      style={offset === undefined ? undefined : { transform: `translateY(${offset}px)` }}
    >
      <div
        ref={headerRef}
        className="bottom-sheet-header"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClickCapture={(event) => {
          // A drag or swipe that ends over a button must not also press it.
          if (suppressClick.current) {
            event.preventDefault();
            event.stopPropagation();
            suppressClick.current = false;
          }
        }}
      >
        <button
          type="button"
          className="bottom-sheet-handle"
          aria-expanded={expanded}
          aria-label={expanded ? "Hide details" : "Show details"}
          onClick={() => onExpandedChange(!expanded)}
        >
          <span />
        </button>
        {peek}
      </div>
      <div className="bottom-sheet-body" inert={!expanded}>
        {children}
      </div>
    </section>
  );
}
