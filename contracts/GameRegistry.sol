// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./CharacterNFT.sol";
import "./ItemNFT.sol";

/**
 * @title GameRegistry
 * @notice Central registry for player registration and daily progress commits.
 *
 * Anti-tamper: commitDay validates that declared action counts do not exceed
 * the daily AP budget (MAX_DAILY_AP = 100).
 *
 * AP costs:
 *   gather  = 5 AP
 *   craft   = 10 AP
 *   combat  = varies per monster (tracked in CombatSystem)
 *             but player reports combatAP here for total AP accounting
 *   eat     = 2 AP
 */
contract GameRegistry is AccessControl {
    bytes32 public constant GAME_ROLE = keccak256("GAME_ROLE");

    CharacterNFT public characterNFT;
    ItemNFT      public itemNFT;

    uint256 public constant MAX_DAILY_AP    = 100;
    uint256 public constant AP_PER_GATHER   = 5;
    uint256 public constant AP_PER_CRAFT    = 10;
    uint256 public constant AP_PER_EAT      = 2;

    struct PlayerState {
        uint256 characterId;
        bool    registered;
        uint256 lastCommitDay; // logical day counter
    }

    mapping(address => PlayerState) public players;

    event PlayerRegistered(address indexed player, uint256 characterId, string characterClass);
    event DayCommitted(
        address indexed player,
        uint256 indexed characterId,
        uint256 day,
        bool    died
    );

    constructor(address admin, address _characterNFT, address _itemNFT) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GAME_ROLE, admin);
        characterNFT = CharacterNFT(_characterNFT);
        itemNFT      = ItemNFT(_itemNFT);
    }

    function registerPlayer(string calldata characterClass) external {
        require(!players[msg.sender].registered, "GameRegistry: already registered");

        uint256 characterId = characterNFT.mintCharacter(msg.sender, characterClass);
        players[msg.sender] = PlayerState({
            characterId:    characterId,
            registered:     true,
            lastCommitDay:  0
        });

        emit PlayerRegistered(msg.sender, characterId, characterClass);
    }

    /**
     * @notice Commit end-of-day progress.
     * @param gatherCount   Number of gather actions this day
     * @param craftCount    Number of craft actions this day
     * @param eatCount      Number of eat actions this day
     * @param combatAP      Total AP consumed in combat this day (reported by client)
     * @param daysSurvived  Total lifetime days survived (monotonically increasing)
     * @param newLevel      New character level (can only increase)
     * @param died          Whether the player died this day
     * @param itemIdsToDestroy Item NFT IDs consumed/dropped this day (non-craft)
     */
    function commitDay(
        uint256   gatherCount,
        uint256   craftCount,
        uint256   eatCount,
        uint256   combatAP,
        uint256   daysSurvived,
        uint256   newLevel,
        bool      died,
        uint256[] calldata itemIdsToDestroy
    ) external {
        PlayerState storage state = players[msg.sender];
        require(state.registered, "GameRegistry: not registered");

        // --- AP budget validation ---
        uint256 apUsed = gatherCount * AP_PER_GATHER
                       + craftCount  * AP_PER_CRAFT
                       + eatCount    * AP_PER_EAT
                       + combatAP;
        require(apUsed <= MAX_DAILY_AP, "GameRegistry: AP budget exceeded");

        // daysSurvived must be monotonically non-decreasing
        CharacterNFT.CharacterStats memory stats = characterNFT.getStats(state.characterId);
        require(daysSurvived >= stats.daysSurvived, "GameRegistry: invalid daysSurvived");
        require(newLevel >= stats.level, "GameRegistry: level cannot decrease");

        // Burn consumed items (food eaten, tools destroyed)
        for (uint256 i = 0; i < itemIdsToDestroy.length; i++) {
            require(
                itemNFT.ownerOf(itemIdsToDestroy[i]) == msg.sender,
                "GameRegistry: not item owner"
            );
            itemNFT.burnItem(itemIdsToDestroy[i]);
        }

        // Level-up stat bonuses (+5 hp, +2 atk, +1 def, +2 luck per level)
        uint256 levelsGained = newLevel - stats.level;
        uint256 newMaxHealth  = stats.maxHealth  + levelsGained * 5;
        uint256 newAttackPow  = stats.attackPower + levelsGained * 2;
        uint256 newDefense    = stats.defense     + levelsGained * 1;
        uint256 newLuck       = stats.luck        + levelsGained * 2;

        // Update character stats on-chain
        characterNFT.updateStats(
            state.characterId,
            daysSurvived,
            newLevel,
            newMaxHealth,
            newAttackPow,
            newDefense,
            newLuck
        );

        if (died) {
            characterNFT.recordDeath(state.characterId);
        }

        state.lastCommitDay = daysSurvived;

        emit DayCommitted(msg.sender, state.characterId, daysSurvived, died);
    }

    function isRegistered(address player) external view returns (bool) {
        return players[player].registered;
    }

    function getCharacterId(address player) external view returns (uint256) {
        require(players[player].registered, "GameRegistry: not registered");
        return players[player].characterId;
    }
}
