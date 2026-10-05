import { useEffect, useState } from "react";

interface CompassEvent extends DeviceOrientationEvent {
  /** iOS Safari: degrees clockwise from north. */
  webkitCompassHeading?: number;
}

type PermissionApi = { requestPermission?: () => Promise<"granted" | "denied"> };

/**
 * iPhones only share the compass after the visitor allows it, and the prompt must come from a tap.
 * Call this from a button's click handler; elsewhere it does nothing.
 */
export async function requestCompassPermission(): Promise<void> {
  const api = (window.DeviceOrientationEvent as unknown as PermissionApi | undefined)?.requestPermission;
  if (api) {
    try {
      await api.call(window.DeviceOrientationEvent);
    } catch {
      // Denied or unavailable: the map falls back to the walking direction from GPS.
    }
  }
}

/** Which way the phone is pointing (degrees clockwise from north), while `enabled`. */
export function useCompassHeading(enabled: boolean): number | undefined {
  const [heading, setHeading] = useState<number>();

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const onAbsolute = (event: DeviceOrientationEvent) => {
      if (event.absolute && event.alpha !== null) {
        setHeading((360 - event.alpha) % 360);
      }
    };
    const onRelative = (event: CompassEvent) => {
      if (typeof event.webkitCompassHeading === "number") {
        setHeading(event.webkitCompassHeading);
      }
    };
    window.addEventListener("deviceorientationabsolute", onAbsolute as EventListener);
    window.addEventListener("deviceorientation", onRelative as EventListener);
    return () => {
      window.removeEventListener("deviceorientationabsolute", onAbsolute as EventListener);
      window.removeEventListener("deviceorientation", onRelative as EventListener);
    };
  }, [enabled]);

  return enabled ? heading : undefined;
}
