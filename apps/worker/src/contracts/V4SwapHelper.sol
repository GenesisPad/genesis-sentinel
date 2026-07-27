// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Minimal test-only helper deployed fresh on a local Ganache fork to execute one real
/// swap against a live Uniswap V4 pool via the PoolManager's unlock/settle/take flow, so
/// Sentinel's fork trade simulator can test buy/sell success on V4 the same way it already does
/// for V2 (router) and V3 (SwapRouter02) — neither of which V4 supports, since V4 has no per-pool
/// contract to call and instead requires the caller itself to be a contract implementing
/// IUnlockCallback. Never deployed anywhere but a disposable local fork; no access control is
/// needed since the fork is single-use and torn down after each simulation.
///
/// Field/function names and encodings match Uniswap v4-core's real IPoolManager, PoolKey,
/// SwapParams, and BalanceDelta types exactly (fetched from
/// https://github.com/Uniswap/v4-core/blob/main/src/interfaces/IPoolManager.sol and sibling
/// files) so calldata is fully compatible with the real deployed PoolManager — `Currency` and
/// `BalanceDelta` are Solidity user-defined value types wrapping `address` and `int256`
/// respectively, which ABI-encode identically to their underlying type, so plain `address`/
/// `int256` here produce the same selectors and calldata without needing the v4-core package.

struct PoolKey {
    address currency0;
    address currency1;
    uint24 fee;
    int24 tickSpacing;
    address hooks;
}

struct SwapParams {
    bool zeroForOne;
    int256 amountSpecified;
    uint160 sqrtPriceLimitX96;
}

interface IERC20Minimal {
    function transfer(address to, uint256 amount) external returns (bool);
}

interface IPoolManagerMinimal {
    function unlock(bytes calldata data) external returns (bytes memory);
    function swap(PoolKey memory key, SwapParams memory params, bytes calldata hookData)
        external
        returns (int256 swapDelta);
    function sync(address currency) external;
    function settle() external payable returns (uint256 paid);
    function take(address currency, address to, uint256 amount) external;
}

contract V4SwapHelper {
    address public immutable poolManager;

    error UnexpectedCaller(address caller);
    error InputTransferFailed(address currency);

    constructor(address _poolManager) {
        poolManager = _poolManager;
    }

    /// @notice Executes one swap and sends the output directly to `recipient`.
    /// For an ERC20 input currency, this contract must already hold at least `amountIn` of it
    /// (the fork test transfers it in immediately before calling this). Native-ETH input isn't
    /// supported by this helper — Sentinel's fork simulator only ever calls this for WETH(ERC20)
    /// -quoted V4 pools, matching its existing V2/V3 scope.
    /// @return swapDelta The raw BalanceDelta (packed int128 amount0 << 128 | int128 amount1)
    /// returned by PoolManager.swap, for the caller to decode if it wants exact amounts.
    function swap(
        PoolKey calldata key,
        bool zeroForOne,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96,
        address recipient
    ) external returns (int256 swapDelta) {
        bytes memory result = IPoolManagerMinimal(poolManager).unlock(
            abi.encode(key, zeroForOne, amountIn, sqrtPriceLimitX96, recipient)
        );
        swapDelta = abi.decode(result, (int256));
    }

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        if (msg.sender != poolManager) revert UnexpectedCaller(msg.sender);

        (PoolKey memory key, bool zeroForOne, uint256 amountIn, uint160 sqrtPriceLimitX96, address recipient) =
            abi.decode(data, (PoolKey, bool, uint256, uint160, address));

        int256 swapDelta = IPoolManagerMinimal(poolManager).swap(
            key,
            SwapParams({
                zeroForOne: zeroForOne,
                amountSpecified: -int256(amountIn),
                sqrtPriceLimitX96: sqrtPriceLimitX96
            }),
            bytes("")
        );

        // BalanceDelta: upper 128 bits = amount0 (arithmetic-shifted, matches
        // BalanceDeltaLibrary.amount0's `sar(128, delta)`), lower 128 bits = amount1
        // (reinterpreted as signed, matches BalanceDeltaLibrary.amount1's `signextend(15, delta)`
        // — an explicit int256->int128 narrowing conversion in Solidity truncates the same way).
        int128 amount0 = int128(swapDelta >> 128);
        int128 amount1 = int128(swapDelta);

        address inputCurrency = zeroForOne ? key.currency0 : key.currency1;
        address outputCurrency = zeroForOne ? key.currency1 : key.currency0;
        int128 inputDelta = zeroForOne ? amount0 : amount1;
        int128 outputDelta = zeroForOne ? amount1 : amount0;

        // Settle what we owe the pool for the input currency (a negative delta = owed to pool).
        if (inputDelta < 0) {
            uint256 owed = uint256(uint128(-inputDelta));
            IPoolManagerMinimal(poolManager).sync(inputCurrency);
            bool ok = IERC20Minimal(inputCurrency).transfer(poolManager, owed);
            if (!ok) revert InputTransferFailed(inputCurrency);
            IPoolManagerMinimal(poolManager).settle();
        }

        // Take what the pool owes us for the output currency (a positive delta = owed to us) and
        // send it straight to the recipient — no need to route proceeds through this contract.
        if (outputDelta > 0) {
            IPoolManagerMinimal(poolManager).take(outputCurrency, recipient, uint256(uint128(outputDelta)));
        }

        return abi.encode(swapDelta);
    }
}
