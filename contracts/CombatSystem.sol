// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./CharacterNFT.sol";
import "./ItemNFT.sol";

/**
 * @title CombatSystem
 * @notice Fully on-chain turn-based combat simulation.
 *         Player sets strategy (stance + weapon) before battle.
 *         Contract resolves all rounds using on-chain pseudorandom.
 *         Emits complete round log for frontend replay animation.
 *
 * Stances: 0=Aggressive(atk×1.3, def×0.7), 1=Balanced(×1.0), 2=Defensive(atk×0.7, def×1.3)
 *
 * Monsters have a minRegion requirement in addition to minLevel.
 * QuestSystem is notified on victory.
 * EventOracle HAUNTED_NIGHT multiplier is applied when isNight=true.
 */
contract CombatSystem is AccessControl {
    bytes32 public constant GAME_ROLE = keccak256("GAME_ROLE");

    CharacterNFT public characterNFT;
    ItemNFT      public itemNFT;

    address public questSystem;   // optional push notifications
    address public eventOracle;   // optional HAUNTED_NIGHT multiplier

    struct MonsterTemplate {
        string   name;
        uint256  hp;
        uint256  attack;
        uint256  defense;
        uint256  minLevel;
        uint8    minRegion;     // character must be in this region or higher
        uint256[] lootTypes;    // possible item types to drop
        uint256[] lootWeights;  // cumulative weights for rng pick
        uint256  apCost;        // AP consumed by the player to fight this monster
    }

    struct Strategy {
        uint8   stance;        // 0=aggressive, 1=balanced, 2=defensive
        uint256 weaponTokenId; // 0 = unarmed
    }

    struct CombatResult {
        bool     victory;
        uint256  roundsFought;
        uint256  damageDealt;
        uint256  damageTaken;
        uint256  lootTokenId;  // 0 = no loot
        uint256[] playerHpLog;  // player HP after each round
        uint256[] monsterHpLog; // monster HP after each round
    }

    // Weapon type → bonus attack power
    mapping(uint256 => uint256) public weaponBonus;
    // Monster templates
    mapping(uint256 => MonsterTemplate) public monsters;
    uint256 public monsterCount;

    // Per-character combat nonce for RNG
    mapping(uint256 => uint256) public combatNonce;

    uint256 private constant SCALE = 100;
    uint256 private constant MAX_ROUNDS = 50;

    event CombatFinished(
        address indexed player,
        uint256 indexed characterId,
        uint256 monsterType,
        bool    victory,
        uint256 lootTokenId,
        uint256 roundsFought
    );

    event MonsterAdded(uint256 indexed monsterType, string name, uint256 minLevel);

    constructor(address admin, address _characterNFT, address _itemNFT) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GAME_ROLE, admin);
        characterNFT = CharacterNFT(_characterNFT);
        itemNFT      = ItemNFT(_itemNFT);

        // Weapon bonuses (itemType → bonus attackPower)
        weaponBonus[5]  = 15;  // Axe
        weaponBonus[6]  = 5;   // Torch (improvised)
        weaponBonus[8]  = 35;  // Sword
        weaponBonus[27] = 50;  // IronSword
        weaponBonus[29] = 60;  // ShadowBlade
        weaponBonus[33] = 80;  // AncientSword
        weaponBonus[49] = 45;  // MagicStaff
        weaponBonus[50] = 30;  // Bow
        weaponBonus[54] = 70;  // VoidBlade
        weaponBonus[55] = 55;  // GlacierBlade
        weaponBonus[71] = 90;  // VoidReaper (legendary)
        weaponBonus[72] = 75;  // GlacierEdge (legendary)
    }

    function setQuestSystem(address _questSystem) external onlyRole(DEFAULT_ADMIN_ROLE) {
        questSystem = _questSystem;
    }

    function setEventOracle(address _eventOracle) external onlyRole(DEFAULT_ADMIN_ROLE) {
        eventOracle = _eventOracle;
    }

    function addMonster(
        string  calldata name,
        uint256 hp,
        uint256 attack,
        uint256 defense,
        uint256 minLevel,
        uint8   minRegion,
        uint256[] calldata lootTypes,
        uint256[] calldata lootWeights,
        uint256 apCost
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (uint256 monsterType) {
        require(lootTypes.length == lootWeights.length, "CombatSystem: loot length mismatch");
        monsterType = monsterCount++;
        monsters[monsterType] = MonsterTemplate({
            name:        name,
            hp:          hp,
            attack:      attack,
            defense:     defense,
            minLevel:    minLevel,
            minRegion:   minRegion,
            lootTypes:   lootTypes,
            lootWeights: lootWeights,
            apCost:      apCost
        });
        emit MonsterAdded(monsterType, name, minLevel);
    }

    /**
     * @notice Initiate combat. Fully simulated on-chain.
     *         If using a weapon, caller must own the weaponTokenId.
     *         On death: CharacterNFT.recordDeath() is called.
     *         On victory: loot NFT is minted. QuestSystem notified.
     * @param characterId   Character NFT token ID.
     * @param monsterType   Monster template index.
     * @param strategy      Player's stance + weapon selection.
     * @param currentRegion Character's current region (for region gate check).
     * @param tileId        Current tile ID (for EventOracle check).
     * @param gameDay       Current game day (for EventOracle check).
     * @param isNight       Whether it is currently night (for HAUNTED_NIGHT).
     */
    function initiateCombat(
        uint256  characterId,
        uint256  monsterType,
        Strategy calldata strategy,
        uint8    currentRegion,
        uint256  tileId,
        uint256  gameDay,
        bool     isNight
    ) external onlyRole(GAME_ROLE) returns (CombatResult memory result) {
        MonsterTemplate storage monster = monsters[monsterType];
        require(monster.hp > 0, "CombatSystem: unknown monster");

        CharacterNFT.CharacterStats memory stats = characterNFT.getStats(characterId);
        require(stats.level >= monster.minLevel, "CombatSystem: level too low");
        require(currentRegion >= monster.minRegion, "CombatSystem: region too low");

        // Validate weapon ownership
        uint256 weaponAtk = 0;
        address charOwner = characterNFT.ownerOf(characterId);
        if (strategy.weaponTokenId != 0) {
            require(
                itemNFT.ownerOf(strategy.weaponTokenId) == charOwner,
                "CombatSystem: not weapon owner"
            );
            ItemNFT.ItemData memory weapon = itemNFT.getItem(strategy.weaponTokenId);
            weaponAtk = weaponBonus[weapon.itemType];
        }

        // Stance multipliers (scaled ×100)
        uint256 atkMul;
        uint256 defMul;
        if (strategy.stance == 0) {
            atkMul = 130; defMul = 70;  // aggressive
        } else if (strategy.stance == 2) {
            atkMul = 70;  defMul = 130; // defensive
        } else {
            atkMul = 100; defMul = 100; // balanced
        }

        uint256 playerAtk = ((stats.attackPower + weaponAtk) * atkMul) / SCALE;
        uint256 playerDef = (stats.defense * defMul) / SCALE;

        // SA=4 SHADOW_STEP (Vox): +30% attack at night
        if (isNight && stats.specialAbility == 4) {
            playerAtk = playerAtk * 130 / 100;
        }
        // SA=2 IRON_WILL (Draven): +20% effective defense
        if (stats.specialAbility == 2) {
            playerDef = playerDef * 120 / 100;
        }

        // HAUNTED_NIGHT/BLOOD_MOON/BEAST_MIGRATION: all monster stats scaled
        uint256 monsterAtk = monster.attack;
        uint256 monsterDef = monster.defense;
        uint256 monsterHp  = monster.hp;
        if (isNight && eventOracle != address(0)) {
            (bool ok, bytes memory data) = eventOracle.staticcall(
                abi.encodeWithSignature(
                    "getCombatMultiplier(uint256,uint256,bool)",
                    tileId, gameDay, true
                )
            );
            if (ok && data.length >= 32) {
                uint256 mul = abi.decode(data, (uint256));
                if (mul > 100) {
                    monsterAtk = monsterAtk * mul / 100;
                    monsterDef = monsterDef * mul / 100;
                    monsterHp  = monsterHp  * mul / 100;
                }
            }
        }

        // Simulate rounds
        uint256 playerHp  = stats.maxHealth;
        uint256 nonce     = combatNonce[characterId]++;

        uint256[] memory pHpLog = new uint256[](MAX_ROUNDS);
        uint256[] memory mHpLog = new uint256[](MAX_ROUNDS);
        uint256 rounds;
        uint256 totalDamageDealt;
        uint256 totalDamageTaken;

        while (monsterHp > 0 && playerHp > 0 && rounds < MAX_ROUNDS) {
            uint256 seed = uint256(keccak256(abi.encodePacked(
                blockhash(block.number - 1), characterId, nonce, rounds
            )));

            // Player attacks monster: ±10% variance
            uint256 variance = 90 + (seed % 21); // 90–110
            uint256 rawDmg = (playerAtk * variance) / SCALE;
            uint256 dmgToMonster = rawDmg > monsterDef ? rawDmg - monsterDef : 1;
            monsterHp = monsterHp > dmgToMonster ? monsterHp - dmgToMonster : 0;
            totalDamageDealt += dmgToMonster;

            // Monster attacks player (use shifted seed bits)
            if (monsterHp > 0) {
                uint256 mVariance = 90 + ((seed >> 8) % 21);
                uint256 mRawDmg = (monsterAtk * mVariance) / SCALE;
                uint256 dmgToPlayer = mRawDmg > playerDef ? mRawDmg - playerDef : 1;
                playerHp = playerHp > dmgToPlayer ? playerHp - dmgToPlayer : 0;
                totalDamageTaken += dmgToPlayer;
            }

            pHpLog[rounds] = playerHp;
            mHpLog[rounds] = monsterHp;
            rounds++;
        }

        // Trim logs to actual rounds fought
        uint256[] memory trimmedPHp = new uint256[](rounds);
        uint256[] memory trimmedMHp = new uint256[](rounds);
        for (uint256 i = 0; i < rounds; i++) {
            trimmedPHp[i] = pHpLog[i];
            trimmedMHp[i] = mHpLog[i];
        }

        bool victory = monsterHp == 0;
        uint256 lootTokenId;

        if (victory) {
            lootTokenId = _rollLoot(monster, nonce, rounds, charOwner);
        } else {
            characterNFT.recordDeath(characterId);
        }

        result = CombatResult({
            victory:      victory,
            roundsFought: rounds,
            damageDealt:  totalDamageDealt,
            damageTaken:  totalDamageTaken,
            lootTokenId:  lootTokenId,
            playerHpLog:  trimmedPHp,
            monsterHpLog: trimmedMHp
        });

        emit CombatFinished(
            charOwner, characterId, monsterType,
            victory, lootTokenId, rounds
        );

        // Notify QuestSystem
        if (questSystem != address(0)) {
            questSystem.call(
                abi.encodeWithSignature(
                    "notifyCombat(uint256,uint256,bool)",
                    characterId, monsterType, victory
                )
            );
        }
    }

    function _rollLoot(
        MonsterTemplate storage monster,
        uint256 nonce,
        uint256 rounds,
        address owner
    ) private returns (uint256 tokenId) {
        if (monster.lootTypes.length == 0) return 0;

        uint256 seed = uint256(keccak256(abi.encodePacked(
            blockhash(block.number - 1), nonce, rounds, "loot"
        )));

        uint256 totalWeight;
        for (uint256 i = 0; i < monster.lootWeights.length; i++) {
            totalWeight += monster.lootWeights[i];
        }

        uint256 roll = seed % totalWeight;
        uint256 cumulative;
        uint256 selectedType = monster.lootTypes[0];
        for (uint256 i = 0; i < monster.lootWeights.length; i++) {
            cumulative += monster.lootWeights[i];
            if (roll < cumulative) {
                selectedType = monster.lootTypes[i];
                break;
            }
        }

        tokenId = itemNFT.mintItem(owner, selectedType);
    }
}
