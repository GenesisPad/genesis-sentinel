import { describe, expect, it } from "vitest";

describe("web foundation", () => {
  it("keeps risk language non-guaranteeing", () => {
    const copy = "Results are risk indicators, not guarantees.";

    expect(copy).not.toContain("safe");
  });
});
