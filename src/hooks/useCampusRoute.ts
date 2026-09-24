import { useEffect, useState } from "react";
import type { CampusRoute } from "../lib/campusRouter";
import { loadCampusRouter } from "../lib/loadCampusRouter";
import type { Building, LatLng } from "../types/content";

export type CampusRouteStatus = "idle" | "loading" | "ready" | "unavailable";

interface RouteResult {
  key: string;
  route?: CampusRoute;
}

/**
 * Walking route from a point to a building. Recalculates as `from` moves (e.g. live GPS),
 * keeping the previous route on screen while the next one is worked out.
 */
export function useCampusRoute(from: LatLng | undefined, to: Building | undefined) {
  // Round to ~1 m so GPS jitter doesn't trigger needless recalculation.
  const fromLat = from ? Math.round(from.lat * 1e5) / 1e5 : undefined;
  const fromLng = from ? Math.round(from.lng * 1e5) / 1e5 : undefined;
  const requestKey = fromLat !== undefined && fromLng !== undefined && to ? `${fromLat},${fromLng}>${to.id}` : undefined;
  const [result, setResult] = useState<RouteResult>();

  useEffect(() => {
    if (fromLat === undefined || fromLng === undefined || !to) {
      return;
    }
    let isCurrent = true;
    const key = `${fromLat},${fromLng}>${to.id}`;
    void loadCampusRouter().then((router) => {
      if (isCurrent) {
        setResult({ key, route: router.route({ lat: fromLat, lng: fromLng }, to.position, to.name) });
      }
    });
    return () => {
      isCurrent = false;
    };
  }, [fromLat, fromLng, to]);

  if (!requestKey) {
    return { status: "idle" as CampusRouteStatus, route: undefined };
  }
  const isForThisDestination = result?.key.endsWith(`>${to!.id}`);
  if (result?.key !== requestKey) {
    return { status: "loading" as CampusRouteStatus, route: isForThisDestination ? result?.route : undefined };
  }
  return { status: (result.route ? "ready" : "unavailable") as CampusRouteStatus, route: result.route };
}
