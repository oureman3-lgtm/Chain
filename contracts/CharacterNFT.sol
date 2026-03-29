// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title CharacterNFT
 * @notice ERC721 character NFT for Axiom Wilds.
 *         Original IP – six unique survivor archetypes.
 *
 * Classes:
 *   ryn     – Scout         : balanced all-rounder, good starting pick
 *   kira    – Pyromancer    : fire affinity, glass-cannon, draws night mobs
 *   draven  – Knight        : iron-will tank, high HP/defense
 *   lila    – Herbalist     : lucky harvest, gathering specialist
 *   vox     – Trickster     : shadow-step, night-combat master
 *   sael    – Sage          : arcane craft, alchemy & recipes specialist
 *
 * Special Ability IDs (stored on-chain, applied by child contracts):
 *   0 = NONE
 *   1 = FIRE_AFFINITY   (Kira)   – +25% gather from Lava/Meteor nodes; +20% fire dmg
 *   2 = IRON_WILL       (Draven) – 20% flat damage reduction from all sources
 *   3 = LUCKY_HARVEST   (Lila)   – gather amount ×1.5, explore stash chance ×2
 *   4 = SHADOW_STEP     (Vox)    – night combat atk×1.3; ignores sanity penalty at night
 *   5 = ARCANE_CRAFT    (Sael)   – 20% chance to keep one input on craft; +1 bonus item 10%
 */
contract CharacterNFT is ERC721, AccessControl {
    using Strings for uint256;

    bytes32 public constant GAME_ROLE = keccak256("GAME_ROLE");

    // ── Stats struct ─────────────────────────────────────────────────────────

    struct CharacterStats {
        uint256 level;
        uint256 maxHealth;
        uint256 maxHunger;
        uint256 maxSanity;
        uint256 attackPower;     // base damage per combat round
        uint256 defense;         // flat damage reduction
        uint256 luck;            // affects gather randomness and event outcomes
        uint256 daysSurvived;
        uint256 deathCount;
        uint8   specialAbility;  // 0-5 per class, immutable after mint
        string  characterClass;  // ryn | kira | draven | lila | vox | sael
    }

    // ── Class templates ──────────────────────────────────────────────────────

    struct ClassTemplate {
        uint256 maxHealth;
        uint256 maxHunger;
        uint256 maxSanity;
        uint256 attackPower;
        uint256 defense;
        uint256 luck;
        uint8   specialAbility;
    }

    mapping(string => ClassTemplate) private _classTemplates;

    // ── Storage ──────────────────────────────────────────────────────────────

    uint256 private _nextTokenId;
    mapping(uint256 => CharacterStats) private _stats;
    mapping(address => uint256) public playerCharacter; // one character per wallet

    // ── Events ───────────────────────────────────────────────────────────────

    event CharacterMinted(address indexed owner, uint256 indexed tokenId, string characterClass);
    event CharacterLeveledUp(uint256 indexed tokenId, uint256 newLevel);
    event CharacterDied(uint256 indexed tokenId, uint256 deathCount);
    event StatsUpdated(uint256 indexed tokenId, uint256 daysSurvived, uint256 level);

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(address admin) ERC721("AxiomWildsCharacter", "AWC") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GAME_ROLE, admin);

        //                                       HP   HN   SN   ATK  DEF  LCK  SA
        _classTemplates["ryn"]   = ClassTemplate(100, 100, 100,  22,  12,  12,  0);
        _classTemplates["kira"]  = ClassTemplate( 85,  90,  80,  28,   8,  20,  1); // FIRE_AFFINITY
        _classTemplates["draven"]= ClassTemplate(130, 110,  90,  20,  20,   6,  2); // IRON_WILL
        _classTemplates["lila"]  = ClassTemplate( 90, 100, 110,  14,   9,  30,  3); // LUCKY_HARVEST
        _classTemplates["vox"]   = ClassTemplate( 80,  90,  95,  24,  10,  25,  4); // SHADOW_STEP
        _classTemplates["sael"]  = ClassTemplate( 90,  95, 120,  18,  12,  15,  5); // ARCANE_CRAFT
    }

    // ── Mint ──────────────────────────────────────────────────────────────────

    function mintCharacter(address to, string calldata characterClass)
        external
        onlyRole(GAME_ROLE)
        returns (uint256 tokenId)
    {
        require(playerCharacter[to] == 0, "CharacterNFT: already has character");
        ClassTemplate storage tmpl = _classTemplates[characterClass];
        require(tmpl.maxHealth > 0, "CharacterNFT: unknown class");

        _nextTokenId++;
        tokenId = _nextTokenId;

        _safeMint(to, tokenId);
        _stats[tokenId] = CharacterStats({
            level:          1,
            maxHealth:      tmpl.maxHealth,
            maxHunger:      tmpl.maxHunger,
            maxSanity:      tmpl.maxSanity,
            attackPower:    tmpl.attackPower,
            defense:        tmpl.defense,
            luck:           tmpl.luck,
            daysSurvived:   0,
            deathCount:     0,
            specialAbility: tmpl.specialAbility,
            characterClass: characterClass
        });
        playerCharacter[to] = tokenId;

        emit CharacterMinted(to, tokenId, characterClass);
    }

    // ── Stat update (called by GameRegistry on day commit) ────────────────────

    function updateStats(
        uint256 tokenId,
        uint256 daysSurvived,
        uint256 newLevel,
        uint256 newMaxHealth,
        uint256 newAttackPower,
        uint256 newDefense,
        uint256 newLuck
    ) external onlyRole(GAME_ROLE) {
        require(_ownerOf(tokenId) != address(0), "CharacterNFT: nonexistent token");
        CharacterStats storage s = _stats[tokenId];
        bool leveledUp = newLevel > s.level;
        s.daysSurvived  = daysSurvived;
        s.level         = newLevel;
        s.maxHealth     = newMaxHealth;
        s.attackPower   = newAttackPower;
        s.defense       = newDefense;
        s.luck          = newLuck;

        emit StatsUpdated(tokenId, daysSurvived, newLevel);
        if (leveledUp) emit CharacterLeveledUp(tokenId, newLevel);
    }

    function recordDeath(uint256 tokenId) external onlyRole(GAME_ROLE) {
        require(_ownerOf(tokenId) != address(0), "CharacterNFT: nonexistent token");
        _stats[tokenId].deathCount++;
        emit CharacterDied(tokenId, _stats[tokenId].deathCount);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function getStats(uint256 tokenId) external view returns (CharacterStats memory) {
        require(_ownerOf(tokenId) != address(0), "CharacterNFT: nonexistent token");
        return _stats[tokenId];
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, AccessControl) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
