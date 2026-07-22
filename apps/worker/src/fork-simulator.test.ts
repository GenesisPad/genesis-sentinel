import { describe, expect, it } from "vitest";
import { calculateTaxBps, toJsonRpcQuantity } from "./fork-simulator.js";

describe("toJsonRpcQuantity", () => {
  /**
   * Regression guard. The fork account balance was previously passed as a decimal string, which
   * Ganache rejects while constructing the server. Because that happens before the fork starts
   * and the caller catches fork errors, every scan silently fell back to route-quote and
   * reported honeypot and tax as "unknown" — with nothing recording that the simulator had
   * crashed. The format is the whole bug, so it is asserted directly.
   */
  it("formats the fork account balance as 0x-prefixed hex, never decimal", () => {
    const oneHundredEther = 100_000_000_000_000_000_000n;

    const formatted = toJsonRpcQuantity(oneHundredEther);

    expect(formatted).toBe("0x56bc75e2d63100000");
    expect(formatted.startsWith("0x")).toBe(true);
    expect(formatted).not.toBe(oneHundredEther.toString());
  });

  it("round-trips through BigInt", () => {
    for (const value of [0n, 1n, 255n, 10n ** 18n, 100_000_000_000_000_000_000n]) {
      expect(BigInt(toJsonRpcQuantity(value))).toBe(value);
    }
  });
});

describe("calculateTaxBps", () => {
  /**
   * Regression guard for a real production bug: buy tax was computed against
   * input.expectedBuyTokenOutRaw, a baseline the worker derives from a tiny separate
   * route-probe amount (reserveQuote / 1000), while the fork always buys with
   * SIMULATION_FORK_NATIVE_AMOUNT_WEI — a materially different amount. Comparing a real
   * trade's output against a baseline computed for a different input size produces a bogus
   * tax whenever the two amounts diverge, since AMM output is not linear in the input amount.
   * Observed live: a token with no real tax read as ~79% buy tax. The fix (in
   * runGanacheForkTradeSimulation) is to compute the expected baseline for the same amount
   * the fork actually spent; this test locks the arithmetic that comparison relies on.
   */
  it("reports 0% tax when actual output matches a baseline computed for the same input amount", () => {
    // A healthy pool: buying with the fork's real input amount should quote ~ what was received.
    expect(calculateTaxBps(1_000n, 1_000n)).toBe(0);
  });

  it("would have reported a false tax under the old mismatched-baseline bug", () => {
    // The old code compared real output against a baseline sized for a ~1000x smaller probe
    // amount. Constant-product slippage alone makes that baseline much larger than what a
    // materially bigger real buy receives, so the (wrong) comparison read as a large "tax"
    // even with zero real fee. This asserts the mechanism, not the bug itself: an
    // artificially inflated expected value manufactures a tax percentage.
    const proportionalBaseline = 1_000n; // what buying 1000 units of quote should yield
    const inflatedProbeBaseline = 4_878n; // proportional output for a ~1000x smaller probe amount, scaled up incorrectly
    expect(calculateTaxBps(proportionalBaseline, 1_000n)).toBe(0);
    expect(calculateTaxBps(inflatedProbeBaseline, 1_000n)).toBeGreaterThan(7_000);
  });

  it("reports a real tax correctly when the baseline matches the executed amount", () => {
    expect(calculateTaxBps(1_000n, 980n)).toBe(200);
  });

  it("never reports negative tax when execution beats the quote", () => {
    expect(calculateTaxBps(1_000n, 1_010n)).toBe(0);
  });

  it("reports null rather than fabricating a tax without a usable baseline", () => {
    expect(calculateTaxBps(0n, 0n)).toBeNull();
  });
});
