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

  it("mints a Wilson character with correct stats", async () => {
    await characterNFT.mintCharacter(player1.address, "wilson");
    const stats = await characterNFT.getStats(1);
    expect(stats.characterClass).to.equal("wilson");
    expect(stats.maxHealth).to.equal(100);
    expect(stats.maxHunger).to.equal(100);
    expect(stats.maxSanity).to.equal(100);
    expect(stats.attackPower).to.equal(20);
    expect(stats.luck).to.equal(10);
    expect(stats.level).to.equal(1);
  });

  it("mints a Willow with higher luck", async () => {
    await characterNFT.mintCharacter(player1.address, "willow");
    const stats = await characterNFT.getStats(1);
    expect(stats.luck).to.equal(25);
    expect(stats.attackPower).to.equal(15);
  });

  it("mints a Wendy with stronger combat stats", async () => {
    await characterNFT.mintCharacter(player1.address, "wendy");
    const stats = await characterNFT.getStats(1);
    expect(stats.attackPower).to.equal(30);
    expect(stats.defense).to.equal(15);
    expect(stats.maxSanity).to.equal(80);
  });

  it("prevents duplicate character per wallet", async () => {
    await characterNFT.mintCharacter(player1.address, "wilson");
    await expect(
      characterNFT.mintCharacter(player1.address, "willow")
    ).to.be.revertedWith("CharacterNFT: already has character");
  });

  it("rejects unknown character class", async () => {
    await expect(
      characterNFT.mintCharacter(player1.address, "unknown")
    ).to.be.revertedWith("CharacterNFT: unknown class");
  });

  it("updates stats on level up", async () => {
    await characterNFT.mintCharacter(player1.address, "wilson");
    await characterNFT.updateStats(1, 5, 2, 105, 22, 11, 12);
    const stats = await characterNFT.getStats(1);
    expect(stats.level).to.equal(2);
    expect(stats.daysSurvived).to.equal(5);
    expect(stats.maxHealth).to.equal(105);
  });

  it("records death and increments counter", async () => {
    await characterNFT.mintCharacter(player1.address, "wilson");
    await characterNFT.recordDeath(1);
    await characterNFT.recordDeath(1);
    const stats = await characterNFT.getStats(1);
    expect(stats.deathCount).to.equal(2);
  });

  it("blocks non-GAME_ROLE from minting", async () => {
    await expect(
      characterNFT.connect(player1).mintCharacter(player2.address, "wilson")
    ).to.be.reverted;
  });
});
