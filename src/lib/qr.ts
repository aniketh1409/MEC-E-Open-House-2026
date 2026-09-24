const COLLECTION_PATH = "/passport/collect/";

export function getCollectionUrl(qrCode: string, origin: string): string {
  return new URL(`${COLLECTION_PATH}${encodeURIComponent(qrCode)}`, origin).toString();
}

export function getQrCodeFromScan(value: string): string | undefined {
  const scannedValue = value.trim();

  if (!scannedValue) {
    return undefined;
  }

  try {
    const url = new URL(scannedValue);

    if (
      !["http:", "https:"].includes(url.protocol) ||
      !url.pathname.startsWith(COLLECTION_PATH)
    ) {
      return undefined;
    }

    const qrCode = decodeURIComponent(url.pathname.slice(COLLECTION_PATH.length));
    return qrCode && !qrCode.includes("/") ? qrCode : undefined;
  } catch {
    return scannedValue.includes("/") ? undefined : scannedValue;
  }
}
