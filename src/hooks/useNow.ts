import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { parsePreviewTime } from "../lib/schedule";

/**
 * The current time, refreshed periodically. `?now=10:15` (or `?now=2026-10-17T10:15`)
 * previews the page at that event-day time, for testing and demos.
 */
export function useNow(refreshMs = 30_000): Date {
  const [searchParams] = useSearchParams();
  const previewValue = searchParams.get("now");
  const previewTime = useMemo(() => (previewValue ? parsePreviewTime(previewValue) : undefined), [previewValue]);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (previewTime) {
      return;
    }
    const timer = window.setInterval(() => setNow(new Date()), refreshMs);
    return () => window.clearInterval(timer);
  }, [previewTime, refreshMs]);

  return previewTime ?? now;
}
