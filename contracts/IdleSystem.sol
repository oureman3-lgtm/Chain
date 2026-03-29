// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title IdleSystem
 * @notice Handles two categories of real-time-gated actions:
 *
 *  A. REST (short rest, ~2 min real time)
 *     • Costs 20 AP (game-time equivalent)
 *     • Grants: sanityRestore=15, apBonus=10
 *     • Enforced: caller must wait ≥ REST_DURATION seconds between rests
 *
 *  B. IDLE (sleep / extended explore, ~10 min real time)
 *     • Costs 50 AP
 *     • Grants passive resource draws from the tile's shared pool
 *     • Enforced: caller must wait ≥ IDLE_DURATION seconds between idles
 *     • Resource draw determined by character luck + on-chain RNG
 *
 * All timestamps are block.timestamp (EVM wall clock).
 * AP deduction is tracked locally by the frontend and verified by GameRegistry.commitDay().
 */
contract IdleSystem is AccessControl {
    bytes32 public constant GAME_ROLE = keccak256("GAME_ROLE");

    // ── Timing constants ──────────────────────────────────────────────────────

    uint256 public constant REST_DURATION  = 2  minutes; // 120 s
    uint256 public constant IDLE_DURATION  = 10 minutes; // 600 s

    // ── AP costs (must match GameRegistry.AP_* constants) ────────────────────

    uint256 public constant REST_AP_COST = 20;
    uint256 public constant IDLE_AP_COST = 50;

    // ── Rewards ───────────────────────────────────────────────────────────────

    uint256 public constant REST_SANITY_RESTORE = 15;
    uint256 public constant REST_AP_BONUS       = 10; // extra AP added to today's budget

    // ── Per-character cooldown tracking ───────────────────────────────────────

    /// characterId → last rest timestamp
    mapping(uint256 => uint256) public lastRestTime;
    /// characterId → last idle timestamp
    mapping(uint256 => uint256) public lastIdleTime;

    // ── Nonce for RNG uniqueness ──────────────────────────────────────────────

    mapping(uint256 => uint256) private _idleNonce;

    // ── External deps ─────────────────────────────────────────────────────────

    address public tileResource; // TileResource contract

    // ── Events ────────────────────────────────────────────────────────────────

    event Rested(
        uint256 indexed characterId,
        uint256 sanityRestored,
        uint256 apBonus,
        uint256 timestamp
    );

    event IdleCompleted(
        uint256 indexed characterId,
        uint256 tileId,
        uint8   resourceType,
        uint256 amount,
        uint256 timestamp
    );

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(address admin, address _tileResource) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GAME_ROLE, admin);
        tileResource = _tileResource;
    }

    // ── Rest ──────────────────────────────────────────────────────────────────

    /**
     * @notice Perform a short rest.
     *         Caller must have waited ≥ REST_DURATION since their last rest.
     * @param characterId  The character NFT token ID.
     * @return sanityRestored  Amount of sanity points restored (fixed 15).
     * @return apBonus         Extra AP points granted (fixed 10).
     */
    function rest(uint256 characterId)
        external
        onlyRole(GAME_ROLE)
        returns (uint256 sanityRestored, uint256 apBonus)
    {
        require(
            block.timestamp >= lastRestTime[characterId] + REST_DURATION,
            "IdleSystem: rest cooldown active"
        );

        lastRestTime[characterId] = block.timestamp;
        sanityRestored = REST_SANITY_RESTORE;
        apBonus        = REST_AP_BONUS;

        emit Rested(characterId, sanityRestored, apBonus, block.timestamp);
    }

    /**
     * @notice Check whether a character can perform a rest right now.
     */
    function canRest(uint256 characterId) external view returns (bool, uint256 cooldownRemaining) {
        uint256 nextAllowed = lastRestTime[characterId] + REST_DURATION;
        if (block.timestamp >= nextAllowed) return (true, 0);
        return (false, nextAllowed - block.timestamp);
    }

    // ── Idle (sleep / extended explore) ──────────────────────────────────────

    /**
     * @notice Perform an idle action (sleep / extended exploration).
     *         Caller must have waited ≥ IDLE_DURATION since their last idle.
     *         Draws a random resource from the tile pool; amount scales with `luck`.
     *
     * @param characterId  The character NFT token ID.
     * @param tileId       Current tile of the character (validated by caller/GameRegistry).
     * @param luck         Character's luck stat (fetched by GameRegistry from CharacterNFT).
     * @param gameDay      Current game day (for TileResource regen).
     * @return resourceType  Which resource type was drawn (0-11; 255 = nothing found).
     * @return amount        How many units were drawn from the tile pool.
     */
    function idle(
        uint256 characterId,
        uint256 tileId,
        uint256 luck,
        uint256 gameDay
    )
        external
        onlyRole(GAME_ROLE)
        returns (uint8 resourceType, uint256 amount)
    {
        require(
            block.timestamp >= lastIdleTime[characterId] + IDLE_DURATION,
            "IdleSystem: idle cooldown active"
        );

        lastIdleTime[characterId] = block.timestamp;

        // ── Determine outcome via on-chain RNG ─────────────────────────────
        uint256 nonce = _idleNonce[characterId]++;
        uint256 seed  = uint256(
            keccak256(abi.encodePacked(blockhash(block.number - 1), characterId, tileId, nonce))
        );

        // 30% chance of finding nothing (luck reduces this floor)
        // nothingThreshold: baseline 30, reduced 1% per 5 luck points
        uint256 luckBonus = luck / 5;
        uint256 nothingThreshold = luckBonus >= 25 ? 5 : 30 - luckBonus;
        uint256 roll = seed % 100;

        if (roll < nothingThreshold) {
            // Nothing found – return sentinel
            resourceType = 255;
            amount       = 0;
            emit IdleCompleted(characterId, tileId, resourceType, 0, block.timestamp);
            return (resourceType, amount);
        }

        // Determine resource type (weighted by tile region – caller passes tileId)
        // Simple: use (seed >> 8) % 8 for basic types 0-7; higher luck unlocks rarer types
        uint256 maxType = luck >= 30 ? 11 : luck >= 20 ? 8 : luck >= 10 ? 5 : 3;
        resourceType = uint8((seed >> 8) % (maxType + 1));

        // Amount: 1 base + luck bonus (max 3)
        amount = 1 + (seed >> 16) % (1 + luck / 20);
        if (amount > 3) amount = 3;

        // ── Attempt to draw from tile pool ─────────────────────────────────
        if (tileResource != address(0)) {
            // Check available stock (view call)
            (bool ok, bytes memory stockData) = tileResource.staticcall(
                abi.encodeWithSignature(
                    "getStock(uint256,uint8,uint256)",
                    tileId, resourceType, gameDay
                )
            );
            if (ok && stockData.length >= 32) {
                uint256 available = abi.decode(stockData, (uint256));
                if (available < amount) amount = available; // clamp to available

                if (amount > 0) {
                    // Consume from pool (state-changing call)
                    (bool consumeOk,) = tileResource.call(
                        abi.encodeWithSignature(
                            "consume(uint256,uint8,uint256,uint256)",
                            tileId, resourceType, amount, gameDay
                        )
                    );
                    if (!consumeOk) amount = 0;
                }
            } else {
                amount = 0;
            }
        }

        emit IdleCompleted(characterId, tileId, resourceType, amount, block.timestamp);
    }

    /**
     * @notice Check whether a character can perform an idle action right now.
     */
    function canIdle(uint256 characterId) external view returns (bool, uint256 cooldownRemaining) {
        uint256 nextAllowed = lastIdleTime[characterId] + IDLE_DURATION;
        if (block.timestamp >= nextAllowed) return (true, 0);
        return (false, nextAllowed - block.timestamp);
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setTileResource(address _tileResource) external onlyRole(DEFAULT_ADMIN_ROLE) {
        tileResource = _tileResource;
    }
}
