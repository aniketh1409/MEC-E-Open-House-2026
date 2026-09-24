import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

interface SheetState {
  sheetOpen?: boolean;
}

/** React Router's browser history records each entry's position as `idx`. */
function hasPreviousEntry(): boolean {
  const entry = window.history.state as { idx?: number } | null;
  return (entry?.idx ?? 0) > 0;
}

/**
 * Keeps a bottom sheet's expanded state in browser history, so the Back
 * button collapses the sheet before it leaves the page.
 */
export function useSheetHistory(): [boolean, (expanded: boolean) => void] {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as SheetState | null;
  const expanded = Boolean(state?.sheetOpen);

  const setExpanded = useCallback(
    (next: boolean) => {
      if (next === expanded) {
        return;
      }
      if (next) {
        navigate(
          { pathname: location.pathname, search: location.search },
          { state: { ...state, sheetOpen: true } },
        );
      } else if (hasPreviousEntry()) {
        navigate(-1);
      } else {
        // Opened with the sheet already expanded (e.g. after a reload): nothing to go back to.
        navigate(
          { pathname: location.pathname, search: location.search },
          { replace: true, state: { ...state, sheetOpen: false } },
        );
      }
    },
    [expanded, location.pathname, location.search, navigate, state],
  );

  return [expanded, setExpanded];
}
