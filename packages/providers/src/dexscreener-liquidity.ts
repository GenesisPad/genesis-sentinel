import { erc20Abi, getAddress } from "viem";
import { fetchJson, isRecord, stringValue } from "./http.js";
import type { LockerProvider } from "./locker.js";
import type { DiscoveredPool, LiquidityProvider, LiquidityProviderCoverage } from "./types.js";

const pairAbi = [
  {
    inputs: [],
    name: "getReserves",
    outputs: [
      { type: "uint112", name: "_reserve0" },
      { type: "uint112", name: "_reserve1" },
      { type: "uint32", name: "_blockTimestampLast" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "token0",
    outputs: [{ type: "address", name: "" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "token1",
    outputs: [{ type: "address", name: "" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ type: "address", name: "account" }],
    name: "balanceOf",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function"
  }
] as const;

const knownBurnAddresses = [
  "0x000000000000000000000000000000000000dead",
  "0x0000000000000000000000000000000000000000"
] as const;

export function createDexScreenerLiquidityProvider(
  chainId: number,
  networkSlug: string,
  getQuoteTokenPriceUsd: (address: `0x${string}`) => Promise<number | null>,
  locker: LockerProvider
): LiquidityProvider {
  let coverage: LiquidityProviderCoverage = {
    discoveryTool: `dexscreener-${networkSlug}`,
    checkedDexes: [],
    checkedQuoteSymbols: []
  };

  return {
    id: `dexscreener-liquidity-${chainId}`,
    supportsChain: (candidate) => candidate === chainId,
    describeCoverage() {
      return coverage;
    },
    async discoverPools({ adapter, chainId: detectedChainId, tokenAddress }) {
      if (detectedChainId !== chainId) {
        return [];
      }

      const response = await fetchJson(
        `https://api.dexscreener.com/token-pairs/v1/${networkSlug}/${tokenAddress}`
      ).catch(() => null);

      if (!Array.isArray(response)) {
        return [];
      }

      const pairs = response.filter(isRecord);
      const dexes = new Set<string>();
      const quoteSymbols = new Set<string>();

      const discovered: DiscoveredPool[] = [];

      for (const pair of pairs) {
        const pairAddress = stringValue(pair.pairAddress)?.toLowerCase();
        if (!pairAddress || !/^0x[a-f0-9]{40}$/.test(pairAddress)) continue;

        const baseToken = isRecord(pair.baseToken) ? pair.baseToken : null;
        const quoteToken = isRecord(pair.quoteToken) ? pair.quoteToken : null;
        if (!baseToken || !quoteToken) continue;

        const baseAddress = stringValue(baseToken.address)?.toLowerCase();
        if (baseAddress !== tokenAddress.toLowerCase()) continue;

        const quoteAddress = stringValue(quoteToken.address);
        const quoteSymbol = stringValue(quoteToken.symbol);
        const dexLabel = stringValue(pair.dexId) ?? "Unknown";
        if (!quoteAddress) continue;
        dexes.add(dexLabel);
        if (quoteSymbol) quoteSymbols.add(quoteSymbol);

        try {
          const resolvedPairAddress = getAddress(pairAddress);
          const [reserves, token0, lpTotalSupplyRaw] = await Promise.all([
            adapter.readContract<[bigint, bigint, number]>({
              address: resolvedPairAddress,
              abi: pairAbi,
              functionName: "getReserves"
            }),
            adapter.readContract<`0x${string}`>({
              address: resolvedPairAddress,
              abi: pairAbi,
              functionName: "token0"
            }),
            adapter.readContract<bigint>({
              address: resolvedPairAddress,
              abi: pairAbi,
              functionName: "totalSupply"
            })
          ]);

          const tokenIsToken0 = token0.toLowerCase() === tokenAddress.toLowerCase();
          const reserveToken = tokenIsToken0 ? reserves[0] : reserves[1];
          const reserveQuote = tokenIsToken0 ? reserves[1] : reserves[0];

          const quoteDecimals = await adapter
            .readContract<number>({
              address: getAddress(quoteAddress),
              abi: erc20Abi,
              functionName: "decimals"
            })
            .catch(() => 18);

          const [burnedBalances] = await Promise.all([
            Promise.all(
              knownBurnAddresses.map((burnAddress) =>
                adapter
                  .readContract<bigint>({
                    address: resolvedPairAddress,
                    abi: pairAbi,
                    functionName: "balanceOf",
                    args: [burnAddress]
                  })
                  .catch(() => 0n)
              )
            )
          ]);

          const burnedTotal = burnedBalances.reduce((sum, balance) => sum + balance, 0n);
          const lpBurnedPct =
            lpTotalSupplyRaw > 0n ? Number((burnedTotal * 10_000n) / lpTotalSupplyRaw) / 100 : null;

          const quotePriceUsd = await getQuoteTokenPriceUsd(
            getAddress(quoteAddress as `0x${string}`)
          ).catch(() => null);
          const totalLiquidityUsd =
            quotePriceUsd !== null
              ? (Number(reserveQuote) / 10 ** quoteDecimals) * 2 * quotePriceUsd
              : null;

          const lockStatus = await locker
            .getLockStatus({
              adapter,
              chainId,
              lpTokenAddress: resolvedPairAddress
            })
            .catch(() => ({
              status: "UNSUPPORTED" as const,
              reason: "Locker lookup failed."
            }));

          const lockedAmount =
            lockStatus.status === "LOCKED" && lockStatus.lockedAmountRaw
              ? BigInt(lockStatus.lockedAmountRaw)
              : 0n;
          const protectedTotal = burnedTotal + lockedAmount;
          const protectedPct =
            lpTotalSupplyRaw > 0n
              ? Math.min(100, Number((protectedTotal * 10_000n) / lpTotalSupplyRaw) / 100)
              : null;
          const lockedPct =
            lpTotalSupplyRaw > 0n && lockedAmount > 0n
              ? Math.min(100, Number((lockedAmount * 10_000n) / lpTotalSupplyRaw) / 100)
              : null;

          discovered.push({
            poolAddress: resolvedPairAddress,
            dex: dexLabel,
            quoteTokenAddress: getAddress(quoteAddress),
            quoteSymbol: quoteSymbol ?? "Unknown",
            quoteDecimals,
            liquidityData: {
              protocol: "UNISWAP_V2",
              quoteSymbol: quoteSymbol ?? "Unknown",
              quoteDecimals,
              reserveTokenRaw: reserveToken.toString(),
              reserveQuoteRaw: reserveQuote.toString(),
              lpTotalSupplyRaw: lpTotalSupplyRaw.toString(),
              lpBurnedRaw: burnedTotal.toString(),
              lpBurnedPct,
              lpLockedRaw: lockedAmount.toString(),
              lpLockedPct: lockedPct,
              lpBurnedOrLockedRaw: protectedTotal.toString(),
              lpBurnedOrLockedPct: protectedPct,
              totalLiquidityUsd,
              lockStatus
            }
          });
        } catch {
          continue;
        }
      }

      coverage = {
        discoveryTool: `dexscreener-${networkSlug}`,
        checkedDexes: [...dexes],
        checkedQuoteSymbols: [...quoteSymbols]
      };

      return discovered;
    }
  };
}
