import { useMediaQuery } from "@mantine/hooks";

/** Matches the layout breakpoint where the app switches to its bottom navigation. */
export const MOBILE_QUERY = "(max-width: 47.99em)";

export function useIsMobile(): boolean {
  // Read synchronously so phones never flash the desktop layout first.
  return useMediaQuery(MOBILE_QUERY, false, { getInitialValueInEffect: false });
}
