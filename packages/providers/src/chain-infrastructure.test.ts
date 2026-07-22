import { describe, expect, it } from "vitest";
import { findChainInfrastructure, isChainInfrastructure } from "./chain-infrastructure.js";

const robinhoodChainId = 4663;

describe("chain infrastructure registry", () => {
  // These two collect gas on every Robinhood Chain transaction. They were once misread as a
  // scam operator's "fee-splitter fleet"; pivoting on them would associate every address on
  // the chain with every other. This test exists to keep that regression from returning.
  it("recognizes Robinhood Chain gas fee collectors as infrastructure, not operator wallets", () => {
    for (const address of [
      "0x5a2B80a9b7effc06129bD5462D77BC20A8A59BE7",
      "0xbC5C3a7Adecf54D34169fd90dbD1B7d3142DF067"
    ] as const) {
      const entry = findChainInfrastructure(robinhoodChainId, address);
      expect(entry?.role).toBe("GAS_FEE_COLLECTOR");
    }
  });

  it("recognizes the ArbOS L1 pricer pool", () => {
    expect(
      findChainInfrastructure(robinhoodChainId, "0xa4B00000000000000000000000000000000000F6")?.role
    ).toBe("GAS_FEE_COLLECTOR");
  });

  it("matches Arbitrum system precompiles by range rather than enumeration", () => {
    // ArbSys (0x64) and ArbGasInfo (0x6c) both sit in the precompile range.
    expect(
      findChainInfrastructure(robinhoodChainId, "0x0000000000000000000000000000000000000064")?.role
    ).toBe("SYSTEM_PRECOMPILE");
    expect(
      findChainInfrastructure(robinhoodChainId, "0x000000000000000000000000000000000000006c")?.role
    ).toBe("SYSTEM_PRECOMPILE");
  });

  it("recognizes cross-chain shared protocol addresses on any chain", () => {
    expect(
      findChainInfrastructure(1, "0x0000000071727De22E5E9d8BAf0edAc6f37da032")?.role
    ).toBe("ACCOUNT_ABSTRACTION");
    expect(
      findChainInfrastructure(1, "0x000000000022D473030F116dDEE9F6B43aC78BA3")?.role
    ).toBe("SHARED_PROTOCOL");
  });

  it("is case-insensitive", () => {
    expect(isChainInfrastructure(robinhoodChainId, "0x5A2B80A9B7EFFC06129BD5462D77BC20A8A59BE7")).toBe(
      true
    );
  });

  it("does not classify an ordinary wallet or token as infrastructure", () => {
    // The uhood scam operator and token must stay attributable.
    expect(
      isChainInfrastructure(robinhoodChainId, "0xaeeddc8ec2bbb7772f00fa4c735d1a7063f11e5f")
    ).toBe(false);
    expect(
      isChainInfrastructure(robinhoodChainId, "0x645cae0e8f1f20b061bcc5b208e3178b324c56f5")
    ).toBe(false);
  });

  it("does not treat a low-but-not-precompile address as a precompile", () => {
    expect(
      isChainInfrastructure(robinhoodChainId, "0x0000000000000000000000000000000000000001")
    ).toBe(false);
  });
});
