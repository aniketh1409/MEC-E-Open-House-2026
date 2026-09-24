import { CloseButton } from "@mantine/core";
import { IconCircleCheck, IconTicket } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getActiveBoothById } from "../../lib/content";

const VISIBLE_FOR_MS = 4500;

/** Announces the result of a scan started from the map (`?stamp=collected&booth=…`). */
export function StampToast() {
  const [searchParams] = useSearchParams();
  const result = searchParams.get("stamp");
  const booth = getActiveBoothById(searchParams.get("booth") ?? "");
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsVisible(false), VISIBLE_FOR_MS);
    return () => window.clearTimeout(timer);
  }, []);

  if (!booth || (result !== "collected" && result !== "duplicate") || !isVisible) {
    return null;
  }

  const isNew = result === "collected";
  return (
    <div className="stamp-toast" role="status" data-new={isNew || undefined}>
      {isNew ? <IconCircleCheck size={22} aria-hidden="true" /> : <IconTicket size={22} aria-hidden="true" />}
      <div>
        <strong>{isNew ? "Stamp collected!" : "Already collected"}</strong>
        <span>{booth.stamp.name}</span>
      </div>
      <CloseButton size="sm" aria-label="Dismiss" onClick={() => setIsVisible(false)} />
    </div>
  );
}
