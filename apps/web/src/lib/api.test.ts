import { afterEach, describe, expect, it, vi } from "vitest";
import { recordAnalyticsVisit } from "./api";

describe("recordAnalyticsVisit", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends valid JSON and accepts the endpoint's empty 204 response", async () => {
    let receivedInput: RequestInfo | URL | undefined;
    let receivedInit: RequestInit | undefined;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      receivedInput = input;
      receivedInit = init;
      return Promise.resolve(new Response(null, { status: 204 }));
    });
    vi.stubGlobal("window", {});
    vi.stubGlobal("fetch", fetchMock);

    await expect(recordAnalyticsVisit()).resolves.toBeUndefined();
    expect(receivedInput).toBe("/v1/analytics/visit");
    expect(receivedInit?.method).toBe("POST");
    expect(receivedInit?.body).toBe("{}");
    expect(receivedInit?.headers).toEqual(
      expect.objectContaining({ "content-type": "application/json" })
    );
  });
});
