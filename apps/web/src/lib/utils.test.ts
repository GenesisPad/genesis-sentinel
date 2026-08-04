import { describe, expect, it } from "vitest";
import { formatUtcDateTime } from "./utils";

describe("formatUtcDateTime", () => {
  it("renders a stable, human-readable UTC lock expiry", () => {
    expect(formatUtcDateTime("2027-01-01T19:58:00.000Z")).toBe(
      "January 1, 2027 at 7:58 PM UTC"
    );
  });

  it("returns null for an invalid timestamp", () => {
    expect(formatUtcDateTime("not-a-date")).toBeNull();
  });
});
