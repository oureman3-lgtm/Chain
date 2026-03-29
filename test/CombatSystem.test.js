const { expect } = require("chai");
const { ethers } = require("hardhat");

// CombatSystem.initiateCombat now requires GAME_ROLE and extra params:
// initiateCombat(characterId, monsterType, strategy, currentRegion, tileId, gameDay, isNight)
// addMonster now has minRegion parameter

describe("CombatSystem", function () {
  let characterNFT, itemNFT, combatSystem, owner, player1;

  beforeEach(async () => {
    [owner, player1] = await ethers.getSigners();

    const CharacterNFT = await ethers.getContractFactory("CharacterNFT");
    characterNFT = await CharacterNFT.deploy(owner.address);
    await characterNFT.waitForDeployment();

    const ItemNFT = await ethers.getContractFactory("ItemNFT");
    itemNFT = await ItemNFT.deploy(owner.address);
    await itemNFT.waitForDeployment();

    const CombatSystem = await ethers.getContractFactory("CombatSystem");
    combatSystem = await CombatSystem.deploy(
      owner.address,
      await characterNFT.getAddress(),
      await itemNFT.getAddress()
    );
    await combatSystem.waitForDeployment();

    const GAME_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GAME_ROLE"));
    await characterNFT.grantRole(GAME_ROLE, await combatSystem.getAddress());
    await itemNFT.grantRole(GAME_ROLE, await combatSystem.getAddress());
    // owner can call GAME_ROLE functions directly in tests
    await combatSystem.grantRole(GAME_ROLE, owner.address);

    // addMonster(name, hp, attack, defense, minLevel, minRegion, lootTypes, lootWeights, apCost)
    // Monster 0: Goblin – region 0, level 1+
    await combatSystem.addMonster("Goblin", 30, 8, 2, 1, 0, [9, 10], [70, 30], 15);
    // Monster 1: Shadow – region 3, level 2+
    await combatSystem.addMonster("Shadow", 60, 18, 5, 2, 3, [11], [100], 20);

    // Mint character for player1 (wendy: strong combat stats, level=1)
    await characterNFT.mintCharacter(player1.address, "wendy");
  });

  // Helper to call initiateCombat via owner (who has GAME_ROLE)
  function doCombat(characterId, monsterType, stance, weaponId = 0, region = 0) {
    return combatSystem.initiateCombat(
      characterId, monsterType,
      { stance, weaponTokenId: weaponId },
      region, 2002, 1, false
    );
  }

  it("resolves combat against Goblin and returns result", async () => {
    const result = await doCombat.call({ }, 1, 0, 1).staticCall?.() ??
      await combatSystem.initiateCombat.staticCall(
        1, 0, { stance: 1, weaponTokenId: 0 }, 0, 2002, 1, false
      );
    expect(result.roundsFought).to.be.gt(0);
    expect(result.playerHpLog.length).to.equal(result.roundsFought);
    expect(result.monsterHpLog.length).to.equal(result.roundsFought);
    const lastMonsterHp = result.monsterHpLog[result.monsterHpLog.length - 1];
    const lastPlayerHp  = result.playerHpLog[result.playerHpLog.length - 1];
    expect(lastMonsterHp === 0n || lastPlayerHp === 0n).to.be.true;
  });

  it("enforces level requirement for Shadow (minLevel=2)", async () => {
    await expect(
      combatSystem.initiateCombat(1, 1, { stance: 1, weaponTokenId: 0 }, 3, 2002, 1, false)
    ).to.be.revertedWith("CombatSystem: level too low");
  });

  it("enforces region requirement for Shadow (minRegion=3)", async () => {
    // Level up character to 2 first
    const GAME_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GAME_ROLE"));
    await characterNFT.grantRole(GAME_ROLE, owner.address);
    await characterNFT.updateStats(1, 1, 2, 115, 32, 16, 10);
    // currentRegion=0 should fail region check
    await expect(
      combatSystem.initiateCombat(1, 1, { stance: 1, weaponTokenId: 0 }, 0, 2002, 1, false)
    ).to.be.revertedWith("CombatSystem: region too low");
  });

  it("allows combat after meeting level and region requirements", async () => {
    const GAME_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GAME_ROLE"));
    await characterNFT.grantRole(GAME_ROLE, owner.address);
    await characterNFT.updateStats(1, 1, 2, 115, 32, 16, 10);
    // Pass region=3 to satisfy minRegion
    const result = await combatSystem.initiateCombat.staticCall(
      1, 1, { stance: 0, weaponTokenId: 0 }, 3, 2002, 1, false
    );
    expect(result.roundsFought).to.be.gt(0);
  });

  it("records death when player loses", async () => {
    const CharacterNFT2 = await ethers.getContractFactory("CharacterNFT");
    const char2 = await CharacterNFT2.deploy(owner.address);
    await char2.waitForDeployment();
    await char2.mintCharacter(player1.address, "wilson");

    const CombatSystem2 = await ethers.getContractFactory("CombatSystem");
    const cs2 = await CombatSystem2.deploy(owner.address, await char2.getAddress(), await itemNFT.getAddress());
    await cs2.waitForDeployment();

    const GAME_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GAME_ROLE"));
    await char2.grantRole(GAME_ROLE, await cs2.getAddress());
    await itemNFT.grantRole(GAME_ROLE, await cs2.getAddress());
    await cs2.grantRole(GAME_ROLE, owner.address);

    // Very strong monster, level 1, region 0
    await cs2.addMonster("BossTest", 999, 999, 50, 1, 0, [9], [100], 30);

    await cs2.initiateCombat(1, 0, { stance: 1, weaponTokenId: 0 }, 0, 2002, 1, false);
    const stats = await char2.getStats(1);
    expect(stats.deathCount).to.equal(1);
  });

  it("rejects combat from non-GAME_ROLE caller", async () => {
    await expect(
      combatSystem.connect(player1).initiateCombat(
        1, 0, { stance: 1, weaponTokenId: 0 }, 0, 2002, 1, false
      )
    ).to.be.reverted; // AccessControl revert
  });
});
