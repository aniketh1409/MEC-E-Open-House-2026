/**
 * Feature switches. Set one to `false` to fall back to the earlier behaviour
 * without removing any code.
 */
export const features = {
  /**
   * "Where to?" walking directions between campus buildings, calculated in the
   * browser from OpenStreetMap paths. Off: the campus map shows only the fixed
   * Butterdome → ETLC → MEC E journey, with directions handed to Google Maps.
   */
  campusRouting: true,
};
