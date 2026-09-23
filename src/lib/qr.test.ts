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
      getQrCodeFromScan("https://openhouse.example.ca/passport/collect/mece-design-01"),
    ).toBe("mece-design-01");
  });

  it("accepts a raw booth code", () => {
    expect(getQrCodeFromScan("mece-design-01")).toBe("mece-design-01");
  });

  it("accepts collection links generated on an earlier deployment host", () => {
    expect(
      getQrCodeFromScan(
        "https://old-preview.trycloudflare.com/passport/collect/mece-design-01",
      ),
    ).toBe("mece-design-01");
  });

  it("rejects unrelated links", () => {
    expect(getQrCodeFromScan("https://openhouse.example.ca/booths")).toBeUndefined();
  });
});
