import type { VisitorPassportState } from "../types/content";

export const PASSPORT_STORAGE_KEY = "mece-open-house-passport-v1";

interface StoredPassport extends VisitorPassportState {
  version: 1;
}

export interface PassportLoadResult {
  state: VisitorPassportState;
  isPersistent: boolean;
}

function createPassport(): VisitorPassportState {
  return {
    passportId: crypto.randomUUID(),
    collectedStamps: [],
  };
}

function isStoredPassport(value: unknown): value is StoredPassport {
  if (!value || typeof value !== "object") {
    return false;
  }

  const passport = value as Partial<StoredPassport>;
  return (
    passport.version === 1 &&
    typeof passport.passportId === "string" &&
    passport.passportId.length > 0 &&
    Array.isArray(passport.collectedStamps) &&
    passport.collectedStamps.every((stampId) => typeof stampId === "string") &&
    new Set(passport.collectedStamps).size === passport.collectedStamps.length
  );
}

export function savePassport(
  state: VisitorPassportState,
  storage: Storage = window.localStorage,
): boolean {
  try {
    const storedPassport: StoredPassport = { version: 1, ...state };
    storage.setItem(PASSPORT_STORAGE_KEY, JSON.stringify(storedPassport));
    return true;
  } catch {
    return false;
  }
}

export function loadPassport(storage: Storage = window.localStorage): PassportLoadResult {
  try {
    const storedValue = storage.getItem(PASSPORT_STORAGE_KEY);

    if (storedValue) {
      const parsedValue: unknown = JSON.parse(storedValue);
      if (isStoredPassport(parsedValue)) {
        return {
          state: {
            passportId: parsedValue.passportId,
            collectedStamps: parsedValue.collectedStamps,
          },
          isPersistent: true,
        };
      }
    }

    const state = createPassport();
    return { state, isPersistent: savePassport(state, storage) };
  } catch {
    return { state: createPassport(), isPersistent: false };
  }
}

export function addStamp(
  state: VisitorPassportState,
  stampId: string,
): { state: VisitorPassportState; added: boolean } {
  if (state.collectedStamps.includes(stampId)) {
    return { state, added: false };
  }

  return {
    state: {
      ...state,
      collectedStamps: [...state.collectedStamps, stampId],
    },
    added: true,
  };
}

export function resetPassport(storage: Storage = window.localStorage): PassportLoadResult {
  const state = createPassport();
  return { state, isPersistent: savePassport(state, storage) };
}
