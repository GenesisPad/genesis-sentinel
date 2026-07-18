import {
  addressValue,
  booleanValue,
  dateValue,
  decimalStringValue,
  fetchJson,
  hexStringValue,
  isRecord,
  numberValue,
  stringValue
} from "./http.js";
import type {
  ContractSourceResult,
  EnrichedHolder,
  ExplorerProvider,
  ExplorerTokenProfile,
  HolderConcentration,
  HolderProvider,
  HolderProviderContext,
  HolderSnapshotResult,
  SourceProvider
} from "./types.js";

const knownBurnAddresses = [
  "0x000000000000000000000000000000000000dead",
  "0x0000000000000000000000000000000000000000"
] as const;

export interface BlockscoutChainConfig {
  chainId: number;
  /** Blockscout v2 API base, e.g. https://robinhoodchain.blockscout.com/api/v2 */
  apiBaseUrl: string;
  /** Legacy Etherscan-compatible API base, e.g. https://robinhoodchain.blockscout.com/api */
  legacyApiBaseUrl: string;
}

/**
 * Creates Blockscout-backed source, explorer, and holder providers scoped to a single chain.
 * Blockscout is the primary/only source provider today; see docs/architecture/providers.md
 * for the planned Sourcify/Etherscan-compatible fallback order.
 */
export function createBlockscoutSourceProvider(config: BlockscoutChainConfig): SourceProvider {
  return {
    id: "blockscout-source",
    supportsChain: (chainId) => chainId === config.chainId,
    async getContractSource({ chainId, address }) {
      if (chainId !== config.chainId) {
        return { status: "UNAVAILABLE", address, sourceFiles: [] };
      }

      const response = await fetchJson(
        `${config.legacyApiBaseUrl}?module=contract&action=getsourcecode&address=${address}`
      );
      if (
        !isRecord(response) ||
        !Array.isArray(response.result) ||
        !isRecord(response.result[0])
      ) {
        return { status: "UNAVAILABLE", address, sourceFiles: [] };
      }

      const record = response.result[0];
      const sourceFiles = extractSourceFiles(record);
      if (sourceFiles.length === 0) {
        return {
          status: "UNAVAILABLE",
          address,
          contractName: stringValue(record.ContractName),
          compilerVersion: stringValue(record.CompilerVersion),
          sourceFiles: []
        };
      }

      return {
        status: "VERIFIED",
        address,
        contractName: stringValue(record.ContractName),
        compilerVersion: stringValue(record.CompilerVersion),
        language: stringValue(record.Language),
        abi: parseMaybeJson(stringValue(record.ABI)),
        sourceFiles
      };
    }
  };
}

export function createBlockscoutExplorerProvider(config: BlockscoutChainConfig): ExplorerProvider {
  return {
    id: "blockscout-explorer",
    supportsChain: (chainId) => chainId === config.chainId,
    async getTokenProfile({ chainId, address }) {
      if (chainId !== config.chainId) {
        return null;
      }

      const [token, search, addressInfo] = await Promise.all([
        fetchJson(`${config.apiBaseUrl}/tokens/${address}`),
        fetchJson(`${config.apiBaseUrl}/search?q=${encodeURIComponent(address)}`),
        fetchJson(`${config.apiBaseUrl}/addresses/${address}`)
      ]);

      const tokenRecord = isRecord(token) ? token : {};
      const searchItem = firstMatchingSearchItem(search, address);
      const addressRecord = isRecord(addressInfo) ? addressInfo : {};
      const creationTxHash = hexStringValue(addressRecord.creation_transaction_hash);
      const creationTx = creationTxHash
        ? await fetchJson(`${config.apiBaseUrl}/transactions/${creationTxHash}`).catch(() => null)
        : null;
      const creationTxRecord = isRecord(creationTx) ? creationTx : {};

      const profile: ExplorerTokenProfile = {
        name: stringValue(tokenRecord.name) ?? stringValue(searchItem?.name) ?? null,
        symbol: stringValue(tokenRecord.symbol) ?? stringValue(searchItem?.symbol) ?? null,
        decimals: numberValue(tokenRecord.decimals),
        totalSupply:
          stringValue(tokenRecord.total_supply) ?? stringValue(searchItem?.total_supply) ?? null,
        holderCount:
          numberValue(tokenRecord.holders_count) ?? numberValue(searchItem?.holder_count),
        sourceVerified:
          booleanValue(addressRecord.is_verified) ??
          booleanValue(searchItem?.is_smart_contract_verified),
        deployerAddress: addressValue(addressRecord.creator_address_hash),
        contractCreatedAt: dateValue(creationTxRecord.timestamp),
        creationTxHash,
        tokenType: stringValue(tokenRecord.type),
        iconUrl: stringValue(tokenRecord.icon_url),
        reputation: stringValue(addressRecord.reputation) ?? stringValue(tokenRecord.reputation),
        priceUsd:
          decimalStringValue(tokenRecord.exchange_rate) ??
          decimalStringValue(searchItem?.exchange_rate),
        marketCapUsd:
          decimalStringValue(tokenRecord.circulating_market_cap) ??
          decimalStringValue(searchItem?.circulating_market_cap),
        volume24hUsd: decimalStringValue(tokenRecord.volume_24h)
      };

      return profile;
    },
    async getTokenPriceUsd({ chainId, address }) {
      if (chainId !== config.chainId) {
        return null;
      }

      const token = await fetchJson(`${config.apiBaseUrl}/tokens/${address}`);
      if (!isRecord(token)) {
        return null;
      }
      const price = decimalStringValue(token.exchange_rate);
      return price !== null ? Number(price) : null;
    }
  };
}

/**
 * Uses Blockscout's token holders endpoint to rank real balances — no fabricated
 * distribution. Contract-owned balances (pools, lockers) are excluded so the percentages
 * reflect wallet concentration, matching "excluding pools" in the UI.
 */
export function createBlockscoutHolderProvider(config: BlockscoutChainConfig): HolderProvider {
  return {
    id: "blockscout-holder",
    supportsChain: (chainId) => chainId === config.chainId,
    async getHolderSnapshot({ chainId, address, totalSupply, context }) {
      if (chainId !== config.chainId) {
        return null;
      }
      return discoverBlockscoutHolderConcentration(config, address, totalSupply, context ?? {});
    }
  };
}

async function discoverBlockscoutHolderConcentration(
  config: BlockscoutChainConfig,
  address: `0x${string}`,
  totalSupply: string | null,
  context: HolderProviderContext
): Promise<HolderSnapshotResult | null> {
  if (!totalSupply || totalSupply === "0") {
    return null;
  }

  const holders = await fetchJson(`${config.apiBaseUrl}/tokens/${address}/holders?items_count=25`);
  if (!isRecord(holders) || !Array.isArray(holders.items)) {
    return null;
  }

  const rows = holders.items
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((item) => {
      const addressRecord = isRecord(item.address) ? item.address : {};
      return {
        address: addressValue(addressRecord.hash),
        balanceRaw: stringValue(item.value),
        isContract: booleanValue(addressRecord.is_contract) ?? false
      };
    })
    .filter(
      (row): row is { address: `0x${string}`; balanceRaw: string; isContract: boolean } =>
        row.address !== null && row.balanceRaw !== null
    );

  let total: bigint;
  try {
    total = BigInt(totalSupply);
  } catch {
    return null;
  }
  if (total === 0n) {
    return null;
  }

  const normalizedBurnAddresses = knownBurnAddresses.map((burnAddress) => burnAddress.toLowerCase());
  const normalizedPools = (context.liquidityPoolAddresses ?? []).map((pool) => pool.toLowerCase());
  const normalizedDeployer = context.deployerAddress?.toLowerCase();
  const normalizedOwner = context.ownerAddress?.toLowerCase();
  const pctOfBalance = (balanceRaw: string): number => {
    try {
      return Number((BigInt(balanceRaw) * 10_000n) / total) / 100;
    } catch {
      return 0;
    }
  };
  const pctOfRows = (candidateRows: typeof rows): number => {
    const sum = candidateRows.reduce((acc, row) => acc + BigInt(row.balanceRaw), 0n);
    return Number((sum * 10_000n) / total) / 100;
  };
  const enrichedRows: EnrichedHolder[] = rows.map((row) => {
    const normalized = row.address.toLowerCase();
    const labels: string[] = [];
    if (normalized === normalizedDeployer) labels.push("DEPLOYER");
    if (normalized === normalizedOwner) labels.push("OWNER");
    if (normalizedBurnAddresses.includes(normalized)) labels.push("BURN");
    if (normalizedPools.includes(normalized)) labels.push("LIQUIDITY_POOL");
    labels.push(row.isContract ? "CONTRACT" : "EOA");

    return {
      ...row,
      labels,
      totalSupplyPct: pctOfBalance(row.balanceRaw)
    };
  });
  const distributionRows = enrichedRows.filter(
    (row) => !row.isContract && !row.labels.includes("BURN") && !row.labels.includes("LIQUIDITY_POOL")
  );
  const pctOfTopN = (n: number): number => {
    const sum = distributionRows.slice(0, n).reduce((acc, row) => acc + BigInt(row.balanceRaw), 0n);
    return Number((sum * 10_000n) / total) / 100;
  };
  const deployerPct = normalizedDeployer
    ? (enrichedRows.find((row) => row.address.toLowerCase() === normalizedDeployer)
        ?.totalSupplyPct ?? 0)
    : null;
  const ownerPct = normalizedOwner
    ? (enrichedRows.find((row) => row.address.toLowerCase() === normalizedOwner)?.totalSupplyPct ??
      0)
    : null;
  const liquidityPoolPct = pctOfRows(enrichedRows.filter((row) => row.labels.includes("LIQUIDITY_POOL")));
  const burnedPct = pctOfRows(enrichedRows.filter((row) => row.labels.includes("BURN")));
  const excludedContractPct = pctOfRows(enrichedRows.filter((row) => row.isContract));
  const top1Pct = pctOfTopN(1);
  const top5Pct = pctOfTopN(5);
  const top10Pct = pctOfTopN(10);
  const suspiciousFlags = [
    ...(top1Pct >= 20 ? ["TOP_1_WALLET_HIGH"] : []),
    ...(top10Pct >= 60 ? ["TOP_10_WALLETS_CRITICAL"] : []),
    ...(top10Pct >= 35 && top10Pct < 60 ? ["TOP_10_WALLETS_HIGH"] : []),
    ...(deployerPct !== null && deployerPct >= 5 ? ["DEPLOYER_BALANCE_HIGH"] : []),
    ...(ownerPct !== null && ownerPct >= 5 ? ["OWNER_BALANCE_HIGH"] : [])
  ];

  const concentration: HolderConcentration = {
    top1Pct,
    top5Pct,
    top10Pct,
    top1Address: distributionRows[0]?.address ?? null,
    deployerPct,
    ownerPct,
    liquidityPoolPct,
    burnedPct,
    excludedContractPct,
    suspiciousFlags
  };

  return {
    holderCount: context.holderCount ?? null,
    topHolders: enrichedRows.slice(0, 25),
    concentration
  };
}

function extractSourceFiles(
  record: Record<string, unknown>
): ContractSourceResult["sourceFiles"] {
  const files: ContractSourceResult["sourceFiles"] = [];
  const primarySource = stringValue(record.SourceCode);
  if (primarySource) {
    const parsedPrimary = parseSourceCodePayload(primarySource);
    if (parsedPrimary.length > 0) {
      files.push(...parsedPrimary);
    } else {
      files.push({
        filename: stringValue(record.FileName) ?? stringValue(record.ContractName) ?? "Contract.sol",
        sourceCode: primarySource
      });
    }
  }

  if (Array.isArray(record.AdditionalSources)) {
    for (const item of record.AdditionalSources) {
      if (!isRecord(item)) continue;
      const sourceCode = stringValue(item.SourceCode);
      if (!sourceCode) continue;
      files.push({
        filename: stringValue(item.Filename) ?? "AdditionalSource.sol",
        sourceCode
      });
    }
  }

  return dedupeSourceFiles(files).slice(0, 80);
}

function parseSourceCodePayload(sourceCode: string): ContractSourceResult["sourceFiles"] {
  const trimmed = sourceCode.trim();
  const normalized =
    trimmed.startsWith("{{") && trimmed.endsWith("}}") ? trimmed.slice(1, -1) : trimmed;
  const parsed = parseMaybeJson(normalized);
  if (!isRecord(parsed)) {
    return [];
  }

  const sources = isRecord(parsed.sources) ? parsed.sources : parsed;
  const files: ContractSourceResult["sourceFiles"] = [];
  for (const [filename, value] of Object.entries(sources)) {
    if (typeof value === "string") {
      files.push({ filename, sourceCode: value });
    } else if (isRecord(value) && typeof value.content === "string") {
      files.push({ filename, sourceCode: value.content });
    }
  }

  return files;
}

function dedupeSourceFiles(
  files: ContractSourceResult["sourceFiles"]
): ContractSourceResult["sourceFiles"] {
  const seen = new Set<string>();
  return files.filter((file) => {
    const key = `${file.filename}:${file.sourceCode.length}:${file.sourceCode.slice(0, 64)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseMaybeJson(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function firstMatchingSearchItem(
  value: unknown,
  address: `0x${string}`
): Record<string, unknown> | null {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    return null;
  }

  const normalizedAddress = address.toLowerCase();
  const items: unknown[] = value.items;
  const match = items.find((item) => {
    return isRecord(item) && stringValue(item.address_hash)?.toLowerCase() === normalizedAddress;
  });

  return isRecord(match) ? match : null;
}
