/**
 * Feature switches. Set one to `false` to fall back to the earlier behaviour
 * without removing any code.
 */
export const features = {
  /**
   * "Where to?" walking directions between campus buildings, calculated in the
   * browser from OpenStreetMap paths. Off: the campus map shows only the fixed
   * VVC → ETLC → MEC E journey, with directions handed to Google Maps.
   */
  campusRouting: true,
  /**
   * "Reset passport" button at the bottom of the Passport page, which wipes every collected
   * sticker. Hidden for visitors; set to `true` to show it again (e.g. for testing).
   */
  passportReset: false,
};
