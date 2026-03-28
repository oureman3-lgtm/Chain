const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GameRegistry – AP budget anti-tamper", function () {
  let characterNFT, itemNFT, gameRegistry, owner, player1;

  beforeEach(async () => {
    [owner, player1] = await ethers.getSigners();

    const CharacterNFT = await ethers.getContractFactory("CharacterNFT");
    characterNFT = await CharacterNFT.deploy(owner.address);
    await characterNFT.waitForDeployment();

    const ItemNFT = await ethers.getContractFactory("ItemNFT");
    itemNFT = await ItemNFT.deploy(owner.address);
    await itemNFT.waitForDeployment();

    const GameRegistry = await ethers.getContractFactory("GameRegistry");
    gameRegistry = await GameRegistry.deploy(
      owner.address,
      await characterNFT.getAddress(),
      await itemNFT.getAddress()
    );
    await gameRegistry.waitForDeployment();

    const GAME_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GAME_ROLE"));
    await characterNFT.grantRole(GAME_ROLE, await gameRegistry.getAddress());
    await itemNFT.grantRole(GAME_ROLE, await gameRegistry.getAddress());
  });

  it("registers a player and mints character", async () => {
    await gameRegistry.connect(player1).registerPlayer("wilson");
    expect(await gameRegistry.isRegistered(player1.address)).to.be.true;
    const charId = await gameRegistry.getCharacterId(player1.address);
    expect(charId).to.equal(1);
  });

  it("prevents duplicate registration", async () => {
    await gameRegistry.connect(player1).registerPlayer("wilson");
    await expect(
      gameRegistry.connect(player1).registerPlayer("willow")
    ).to.be.revertedWith("GameRegistry: already registered");
  });

  it("accepts valid commitDay within AP budget", async () => {
    await gameRegistry.connect(player1).registerPlayer("wilson");
    // gather×5(25AP) + craft×2(20AP) + eat×2(4AP) + combat 0 = 49 AP
    await expect(
      gameRegistry.connect(player1).commitDay(5, 2, 2, 0, 1, 1, false, [])
    ).to.not.be.reverted;
  });

  it("rejects commitDay that exceeds AP budget", async () => {
    await gameRegistry.connect(player1).registerPlayer("wilson");
    // gather×20(100AP) + craft×1(10AP) = 110 AP → exceeds 100
    await expect(
      gameRegistry.connect(player1).commitDay(20, 1, 0, 0, 1, 1, false, [])
    ).to.be.revertedWith("GameRegistry: AP budget exceeded");
  });

  it("rejects combatAP alone exceeding budget", async () => {
    await gameRegistry.connect(player1).registerPlayer("wilson");
    await expect(
      gameRegistry.connect(player1).commitDay(0, 0, 0, 101, 1, 1, false, [])
    ).to.be.revertedWith("GameRegistry: AP budget exceeded");
  });

  it("rejects decreasing daysSurvived", async () => {
    await gameRegistry.connect(player1).registerPlayer("wilson");
    await gameRegistry.connect(player1).commitDay(1, 0, 0, 0, 5, 1, false, []);
    await expect(
      gameRegistry.connect(player1).commitDay(1, 0, 0, 0, 3, 1, false, [])
    ).to.be.revertedWith("GameRegistry: invalid daysSurvived");
  });

  it("rejects level decrease", async () => {
    await gameRegistry.connect(player1).registerPlayer("wilson");
    await gameRegistry.connect(player1).commitDay(1, 0, 0, 0, 3, 2, false, []);
    await expect(
      gameRegistry.connect(player1).commitDay(1, 0, 0, 0, 4, 1, false, [])
    ).to.be.revertedWith("GameRegistry: level cannot decrease");
  });

  it("burns provided itemIdsToDestroy on commitDay", async () => {
    await gameRegistry.connect(player1).registerPlayer("wilson");

    // Give player a berry (type 4) to eat
    const GAME_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GAME_ROLE"));
    await itemNFT.grantRole(GAME_ROLE, owner.address);
    await itemNFT.mintItem(player1.address, 4); // tokenId=1

    await gameRegistry.connect(player1).commitDay(0, 0, 1, 0, 1, 1, false, [1]);
    await expect(itemNFT.getItem(1)).to.be.reverted;
  });

  it("records death when died=true", async () => {
    await gameRegistry.connect(player1).registerPlayer("wilson");
    await gameRegistry.connect(player1).commitDay(0, 0, 0, 0, 1, 1, true, []);
    const charId = await gameRegistry.getCharacterId(player1.address);
    const stats = await characterNFT.getStats(charId);
    expect(stats.deathCount).to.equal(1);
  });
});
