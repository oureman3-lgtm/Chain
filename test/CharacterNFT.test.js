const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CharacterNFT", function () {
  let characterNFT, owner, player1, player2;

  beforeEach(async () => {
    [owner, player1, player2] = await ethers.getSigners();
    const CharacterNFT = await ethers.getContractFactory("CharacterNFT");
    characterNFT = await CharacterNFT.deploy(owner.address);
    await characterNFT.waitForDeployment();
  });

  it("mints a Ryn character with correct stats", async () => {
    await characterNFT.mintCharacter(player1.address, "ryn");
    const stats = await characterNFT.getStats(1);
    expect(stats.characterClass).to.equal("ryn");
    expect(stats.maxHealth).to.equal(100);
    expect(stats.maxHunger).to.equal(100);
    expect(stats.maxSanity).to.equal(100);
    expect(stats.attackPower).to.equal(22);
    expect(stats.defense).to.equal(12);
    expect(stats.luck).to.equal(12);
    expect(stats.level).to.equal(1);
    expect(stats.specialAbility).to.equal(0); // NONE
  });

  it("mints Lila with high luck and LUCKY_HARVEST ability", async () => {
    await characterNFT.mintCharacter(player1.address, "lila");
    const stats = await characterNFT.getStats(1);
    expect(stats.luck).to.equal(30);
    expect(stats.attackPower).to.equal(14);
    expect(stats.specialAbility).to.equal(3); // LUCKY_HARVEST
  });

  it("mints Draven with tank stats and IRON_WILL ability", async () => {
    await characterNFT.mintCharacter(player1.address, "draven");
    const stats = await characterNFT.getStats(1);
    expect(stats.maxHealth).to.equal(130);
    expect(stats.defense).to.equal(20);
    expect(stats.attackPower).to.equal(20);
    expect(stats.specialAbility).to.equal(2); // IRON_WILL
  });

  it("mints Kira with glass-cannon stats and FIRE_AFFINITY ability", async () => {
    await characterNFT.mintCharacter(player1.address, "kira");
    const stats = await characterNFT.getStats(1);
    expect(stats.maxHealth).to.equal(85);
    expect(stats.attackPower).to.equal(28);
    expect(stats.specialAbility).to.equal(1); // FIRE_AFFINITY
  });

  it("mints Vox with SHADOW_STEP ability", async () => {
    await characterNFT.mintCharacter(player1.address, "vox");
    const stats = await characterNFT.getStats(1);
    expect(stats.specialAbility).to.equal(4); // SHADOW_STEP
    expect(stats.luck).to.equal(25);
  });

  it("mints Sael with ARCANE_CRAFT ability", async () => {
    await characterNFT.mintCharacter(player1.address, "sael");
    const stats = await characterNFT.getStats(1);
    expect(stats.specialAbility).to.equal(5); // ARCANE_CRAFT
    expect(stats.maxSanity).to.equal(120);
  });

  it("prevents duplicate character per wallet", async () => {
    await characterNFT.mintCharacter(player1.address, "ryn");
    await expect(
      characterNFT.mintCharacter(player1.address, "kira")
    ).to.be.revertedWith("CharacterNFT: already has character");
  });

  it("rejects unknown character class", async () => {
    await expect(
      characterNFT.mintCharacter(player1.address, "unknown")
    ).to.be.revertedWith("CharacterNFT: unknown class");
  });

  it("updates stats on level up", async () => {
    await characterNFT.mintCharacter(player1.address, "ryn");
    await characterNFT.updateStats(1, 5, 2, 105, 24, 13, 14);
    const stats = await characterNFT.getStats(1);
    expect(stats.level).to.equal(2);
    expect(stats.daysSurvived).to.equal(5);
    expect(stats.maxHealth).to.equal(105);
    expect(stats.attackPower).to.equal(24);
    expect(stats.defense).to.equal(13);
    expect(stats.luck).to.equal(14);
  });

  it("records death and increments counter", async () => {
    await characterNFT.mintCharacter(player1.address, "ryn");
    await characterNFT.recordDeath(1);
    await characterNFT.recordDeath(1);
    const stats = await characterNFT.getStats(1);
    expect(stats.deathCount).to.equal(2);
  });

  it("blocks non-GAME_ROLE from minting", async () => {
    await expect(
      characterNFT.connect(player1).mintCharacter(player2.address, "ryn")
    ).to.be.reverted;
  });

  it("specialAbility is immutable after mint", async () => {
    await characterNFT.mintCharacter(player1.address, "kira");
    // updateStats does not have a specialAbility param — ability stays 1
    await characterNFT.updateStats(1, 1, 2, 90, 30, 10, 22);
    const stats = await characterNFT.getStats(1);
    expect(stats.specialAbility).to.equal(1); // still FIRE_AFFINITY
  });
});
