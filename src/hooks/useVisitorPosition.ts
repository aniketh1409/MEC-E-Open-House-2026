import { useEffect, useState } from "react";

export interface VisitorPosition {
  center: [lat: number, lng: number];
  /** Radius (m) the phone is confident about. */
  accuracy: number;
}

/** Watches the phone's GPS position while `enabled`; asks for permission the first time. */
export function useVisitorPosition(enabled: boolean) {
  const [position, setPosition] = useState<VisitorPosition>();
  const [error, setError] = useState<string>();
  const isSupported = "geolocation" in navigator;

  useEffect(() => {
    if (!enabled || !isSupported) {
      return;
    }

    const { geolocation } = navigator;
    const watchId = geolocation.watchPosition(
      ({ coords }) => {
        setError(undefined);
        setPosition({ center: [coords.latitude, coords.longitude], accuracy: coords.accuracy });
      },
      () => setError("We couldn't get your location. Check that location access is allowed."),
      { enableHighAccuracy: true, maximumAge: 10_000 },
    );
    return () => geolocation.clearWatch(watchId);
  }, [enabled, isSupported]);

  return { position, error: isSupported ? error : "Location isn't available on this device." };
}
