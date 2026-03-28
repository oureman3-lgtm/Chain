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
 */
contract CombatSystem is AccessControl {
    bytes32 public constant GAME_ROLE = keccak256("GAME_ROLE");

    CharacterNFT public characterNFT;
    ItemNFT      public itemNFT;

    struct MonsterTemplate {
        string   name;
        uint256  hp;
        uint256  attack;
        uint256  defense;
        uint256  minLevel;
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
        weaponBonus[5] = 15;  // Axe
        weaponBonus[8] = 35;  // Sword
        weaponBonus[6] = 5;   // Torch (improvised)
    }

    function addMonster(
        string  calldata name,
        uint256 hp,
        uint256 attack,
        uint256 defense,
        uint256 minLevel,
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
     *         On victory: loot NFT is minted.
     */
    function initiateCombat(
        uint256  characterId,
        uint256  monsterType,
        Strategy calldata strategy
    ) external returns (CombatResult memory result) {
        require(
            characterNFT.ownerOf(characterId) == msg.sender,
            "CombatSystem: not character owner"
        );

        MonsterTemplate storage monster = monsters[monsterType];
        require(monster.hp > 0, "CombatSystem: unknown monster");

        CharacterNFT.CharacterStats memory stats = characterNFT.getStats(characterId);
        require(stats.level >= monster.minLevel, "CombatSystem: level too low");

        // Validate weapon ownership
        uint256 weaponAtk = 0;
        if (strategy.weaponTokenId != 0) {
            require(
                itemNFT.ownerOf(strategy.weaponTokenId) == msg.sender,
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

        // Simulate rounds
        uint256 playerHp  = stats.maxHealth;
        uint256 monsterHp = monster.hp;
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
            uint256 dmgToMonster = rawDmg > monster.defense ? rawDmg - monster.defense : 1;
            monsterHp = monsterHp > dmgToMonster ? monsterHp - dmgToMonster : 0;
            totalDamageDealt += dmgToMonster;

            // Monster attacks player (use shifted seed bits)
            if (monsterHp > 0) {
                uint256 mVariance = 90 + ((seed >> 8) % 21);
                uint256 mRawDmg = (monster.attack * mVariance) / SCALE;
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
            lootTokenId = _rollLoot(monster, nonce, rounds);
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
            msg.sender, characterId, monsterType,
            victory, lootTokenId, rounds
        );
    }

    function _rollLoot(
        MonsterTemplate storage monster,
        uint256 nonce,
        uint256 rounds
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

        tokenId = itemNFT.mintItem(tx.origin, selectedType);
    }
}
