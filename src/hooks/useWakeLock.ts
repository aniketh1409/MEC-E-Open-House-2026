import { useEffect } from "react";

type WakeLockSentinel = { release: () => Promise<void> };
type WakeLockApi = { request: (type: "screen") => Promise<WakeLockSentinel> };

/** Keeps the phone's screen on while `enabled` (e.g. during live navigation), where supported. */
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    const wakeLock = (navigator as Navigator & { wakeLock?: WakeLockApi }).wakeLock;
    if (!enabled || !wakeLock) {
      return;
    }
    let sentinel: WakeLockSentinel | undefined;
    let released = false;
    const acquire = () => {
      wakeLock
        .request("screen")
        .then((lock) => {
          if (released) {
            void lock.release();
          } else {
            sentinel = lock;
          }
        })
        .catch(() => undefined);
    };
    // The lock drops when the tab is hidden; take it again when the visitor comes back.
    const onVisible = () => document.visibilityState === "visible" && acquire();
    acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release();
    };
  }, [enabled]);
}
