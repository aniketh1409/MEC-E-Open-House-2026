import { describe, expect, it } from "vitest";
import { getCollectionUrl, getQrCodeFromScan } from "./qr";

const origin = "https://openhouse.example.ca";

describe("QR helpers", () => {
  it("builds a booth collection URL", () => {
    expect(getCollectionUrl("mece-design-01", origin)).toBe(
      "https://openhouse.example.ca/passport/collect/mece-design-01",
    );
  });

  it("reads a booth code from a collection URL", () => {
    expect(
      getQrCodeFromScan(
        "https://openhouse.example.ca/passport/collect/mece-design-01",
        origin,
      ),
    ).toBe("mece-design-01");
  });

  it("accepts a raw booth code", () => {
    expect(getQrCodeFromScan("mece-design-01", origin)).toBe("mece-design-01");
  });

  it("rejects collection links from another website", () => {
    expect(
      getQrCodeFromScan("https://malicious.example/passport/collect/mece-design-01", origin),
    ).toBeUndefined();
  });

  it("rejects unrelated links", () => {
    expect(getQrCodeFromScan("https://openhouse.example.ca/booths", origin)).toBeUndefined();
  });
});
