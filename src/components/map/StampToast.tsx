import { CloseButton } from "@mantine/core";
import { IconTicket } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { celebrateStamp } from "../../lib/celebrate";
import { getActiveBoothById } from "../../lib/content";
import { Sticker } from "../passport/Sticker";

const VISIBLE_FOR_MS = 4500;

/** Announces the result of a scan started from the map (`?stamp=collected&booth=…`). */
export function StampToast() {
  const [searchParams] = useSearchParams();
  const result = searchParams.get("stamp");
  const booth = getActiveBoothById(searchParams.get("booth") ?? "");
  const [isVisible, setIsVisible] = useState(true);

  const isNew = result === "collected";
  const hasBooth = Boolean(booth);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsVisible(false), VISIBLE_FOR_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isNew && hasBooth) {
      celebrateStamp();
    }
  }, [hasBooth, isNew]);

  if (!booth || (result !== "collected" && result !== "duplicate") || !isVisible) {
    return null;
  }

  return (
    <div className="stamp-toast" role="status" data-new={isNew || undefined}>
      {isNew ? (
        <Sticker stampId={booth.stamp.id} name={booth.stamp.name} size={46} animate tilt={-6} className="stamp-toast-sticker" />
      ) : (
        <IconTicket size={22} aria-hidden="true" />
      )}
      <div>
        <strong>{isNew ? "Stamp collected!" : "Already collected"}</strong>
        <span>{booth.stamp.name}</span>
      </div>
      <CloseButton size="sm" aria-label="Dismiss" onClick={() => setIsVisible(false)} />
    </div>
  );
}
