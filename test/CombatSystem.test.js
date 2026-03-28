const { expect } = require("chai");
const { ethers } = require("hardhat");

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

    // Add Goblin: HP=30, ATK=8, DEF=2, minLevel=1
    await combatSystem.addMonster("Goblin", 30, 8, 2, 1, [9, 10], [70, 30], 15);
    // Add Shadow: HP=60, ATK=18, DEF=5, minLevel=2
    await combatSystem.addMonster("Shadow", 60, 18, 5, 2, [11], [100], 20);

    // Mint character for player1
    await characterNFT.mintCharacter(player1.address, "wendy"); // strong combat stats
  });

  it("resolves combat against Goblin and returns result", async () => {
    const result = await combatSystem.connect(player1).initiateCombat.staticCall(
      1, 0, { stance: 1, weaponTokenId: 0 }
    );
    expect(result.roundsFought).to.be.gt(0);
    expect(result.playerHpLog.length).to.equal(result.roundsFought);
    expect(result.monsterHpLog.length).to.equal(result.roundsFought);
    // Last monster HP should be 0 (victory) or player HP 0 (defeat)
    const lastMonsterHp = result.monsterHpLog[result.monsterHpLog.length - 1];
    const lastPlayerHp  = result.playerHpLog[result.playerHpLog.length - 1];
    expect(lastMonsterHp === 0n || lastPlayerHp === 0n).to.be.true;
  });

  it("enforces level requirement for Shadow (minLevel=2)", async () => {
    await expect(
      combatSystem.connect(player1).initiateCombat(1, 1, { stance: 1, weaponTokenId: 0 })
    ).to.be.revertedWith("CombatSystem: level too low");
  });

  it("allows combat after meeting level requirement", async () => {
    // Level up to 2
    await characterNFT.grantRole(
      ethers.keccak256(ethers.toUtf8Bytes("GAME_ROLE")), owner.address
    );
    await characterNFT.updateStats(1, 1, 2, 115, 32, 16, 10);
    // Now combat with Shadow should not revert on level check
    const result = await combatSystem.connect(player1).initiateCombat.staticCall(
      1, 1, { stance: 0, weaponTokenId: 0 }
    );
    expect(result.roundsFought).to.be.gt(0);
  });

  it("records death when player loses", async () => {
    // Use weak wilson vs strong shadow (level 2 required – bypass by granting role)
    const CharacterNFT2 = await ethers.getContractFactory("CharacterNFT");
    const char2 = await CharacterNFT2.deploy(owner.address);
    await char2.waitForDeployment();
    // mint wilson
    await char2.mintCharacter(player1.address, "wilson");

    const CombatSystem2 = await ethers.getContractFactory("CombatSystem");
    const cs2 = await CombatSystem2.deploy(owner.address, await char2.getAddress(), await itemNFT.getAddress());
    await cs2.waitForDeployment();

    const GAME_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GAME_ROLE"));
    await char2.grantRole(GAME_ROLE, await cs2.getAddress());
    await itemNFT.grantRole(GAME_ROLE, await cs2.getAddress());

    // Add very strong monster (minLevel=1 for test)
    await cs2.addMonster("BossTest", 999, 999, 50, 1, [9], [100], 30);

    await cs2.connect(player1).initiateCombat(1, 0, { stance: 1, weaponTokenId: 0 });
    const stats = await char2.getStats(1);
    expect(stats.deathCount).to.equal(1);
  });

  it("rejects combat from non-character-owner", async () => {
    const [, , other] = await ethers.getSigners();
    await expect(
      combatSystem.connect(other).initiateCombat(1, 0, { stance: 1, weaponTokenId: 0 })
    ).to.be.revertedWith("CombatSystem: not character owner");
  });
});
