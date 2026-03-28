// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title CharacterNFT
 * @notice ERC721 character NFT with survival stats and luck attribute.
 *         Wilson (balanced), Willow (luck+), Wendy (combat+)
 */
contract CharacterNFT is ERC721, AccessControl {
    using Strings for uint256;

    bytes32 public constant GAME_ROLE = keccak256("GAME_ROLE");

    struct CharacterStats {
        uint256 level;
        uint256 maxHealth;
        uint256 maxHunger;
        uint256 maxSanity;
        uint256 attackPower;   // base damage per combat round
        uint256 defense;       // damage reduction
        uint256 luck;          // affects gather randomness
        uint256 daysSurvived;
        uint256 deathCount;
        string  characterClass; // "wilson" | "willow" | "wendy"
    }

    uint256 private _nextTokenId;
    mapping(uint256 => CharacterStats) private _stats;
    // prevent duplicate characters per wallet
    mapping(address => uint256) public playerCharacter;

    // Starting stats per class
    struct ClassTemplate {
        uint256 maxHealth;
        uint256 maxHunger;
        uint256 maxSanity;
        uint256 attackPower;
        uint256 defense;
        uint256 luck;
    }

    mapping(string => ClassTemplate) private _classTemplates;

    event CharacterMinted(address indexed owner, uint256 indexed tokenId, string characterClass);
    event CharacterLeveledUp(uint256 indexed tokenId, uint256 newLevel);
    event CharacterDied(uint256 indexed tokenId, uint256 deathCount);
    event StatsUpdated(uint256 indexed tokenId, uint256 daysSurvived, uint256 level);

    constructor(address admin) ERC721("DontStarveCharacter", "DSC") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GAME_ROLE, admin);

        // Wilson: balanced
        _classTemplates["wilson"] = ClassTemplate(100, 100, 100, 20, 10, 10);
        // Willow: high luck, weaker combat
        _classTemplates["willow"] = ClassTemplate(90,  100, 100, 15, 8,  25);
        // Wendy: strong combat, lower sanity
        _classTemplates["wendy"]  = ClassTemplate(110, 100, 80,  30, 15, 8);
    }

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
            characterClass: characterClass
        });
        playerCharacter[to] = tokenId;

        emit CharacterMinted(to, tokenId, characterClass);
    }

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
