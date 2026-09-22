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
    passportId: createAnonymousId(),
    collectedStamps: [],
  };
}

function createAnonymousId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
  }

  return `passport-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
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
