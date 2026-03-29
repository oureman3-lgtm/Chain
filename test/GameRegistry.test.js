const { expect } = require("chai");
const { ethers } = require("hardhat");

// Helper: build a full commitDay call with new parameters (moveCount, exploreCount, restCount, idleCount, craftedItemTypes)
function makeCommitArgs(overrides = {}) {
  return [
    overrides.gatherCount    ?? 0,
    overrides.craftCount     ?? 0,
    overrides.eatCount       ?? 0,
    overrides.combatAP       ?? 0,
    overrides.moveCount      ?? 0,
    overrides.exploreCount   ?? 0,
    overrides.restCount      ?? 0,
    overrides.idleCount      ?? 0,
    overrides.daysSurvived   ?? 1,
    overrides.newLevel       ?? 1,
    overrides.died           ?? false,
    overrides.itemIdsToDestroy ?? [],
    overrides.craftedItemTypes ?? []
  ];
}

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
    await gameRegistry.connect(player1).registerPlayer("ryn");
    expect(await gameRegistry.isRegistered(player1.address)).to.be.true;
    const charId = await gameRegistry.getCharacterId(player1.address);
    expect(charId).to.equal(1);
  });

  it("prevents duplicate registration", async () => {
    await gameRegistry.connect(player1).registerPlayer("ryn");
    await expect(
      gameRegistry.connect(player1).registerPlayer("kira")
    ).to.be.revertedWith("GameRegistry: already registered");
  });

  it("accepts valid commitDay within AP budget", async () => {
    await gameRegistry.connect(player1).registerPlayer("ryn");
    // gather×5(25AP) + craft×2(20AP) + eat×2(4AP) = 49 AP  ≤ 100
    await expect(
      gameRegistry.connect(player1).commitDay(
        ...makeCommitArgs({ gatherCount: 5, craftCount: 2, eatCount: 2, daysSurvived: 1, newLevel: 1 })
      )
    ).to.not.be.reverted;
  });

  it("rejects commitDay that exceeds AP budget", async () => {
    await gameRegistry.connect(player1).registerPlayer("ryn");
    // gather×20(100AP) + craft×1(10AP) = 110 AP → exceeds 100
    await expect(
      gameRegistry.connect(player1).commitDay(
        ...makeCommitArgs({ gatherCount: 20, craftCount: 1, daysSurvived: 1, newLevel: 1 })
      )
    ).to.be.revertedWith("GameRegistry: AP budget exceeded");
  });

  it("rejects combatAP alone exceeding budget", async () => {
    await gameRegistry.connect(player1).registerPlayer("ryn");
    await expect(
      gameRegistry.connect(player1).commitDay(
        ...makeCommitArgs({ combatAP: 101, daysSurvived: 1, newLevel: 1 })
      )
    ).to.be.revertedWith("GameRegistry: AP budget exceeded");
  });

  it("rejects decreasing daysSurvived", async () => {
    await gameRegistry.connect(player1).registerPlayer("ryn");
    await gameRegistry.connect(player1).commitDay(
      ...makeCommitArgs({ gatherCount: 1, daysSurvived: 5, newLevel: 1 })
    );
    await expect(
      gameRegistry.connect(player1).commitDay(
        ...makeCommitArgs({ gatherCount: 1, daysSurvived: 3, newLevel: 1 })
      )
    ).to.be.revertedWith("GameRegistry: invalid daysSurvived");
  });

  it("rejects level decrease", async () => {
    await gameRegistry.connect(player1).registerPlayer("ryn");
    await gameRegistry.connect(player1).commitDay(
      ...makeCommitArgs({ gatherCount: 1, daysSurvived: 3, newLevel: 2 })
    );
    await expect(
      gameRegistry.connect(player1).commitDay(
        ...makeCommitArgs({ gatherCount: 1, daysSurvived: 4, newLevel: 1 })
      )
    ).to.be.revertedWith("GameRegistry: level cannot decrease");
  });

  it("burns provided itemIdsToDestroy on commitDay", async () => {
    await gameRegistry.connect(player1).registerPlayer("ryn");

    // Give player a berry (type 4) to eat
    const GAME_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GAME_ROLE"));
    await itemNFT.grantRole(GAME_ROLE, owner.address);
    await itemNFT.mintItem(player1.address, 4); // tokenId=1

    await gameRegistry.connect(player1).commitDay(
      ...makeCommitArgs({ eatCount: 1, daysSurvived: 1, newLevel: 1, itemIdsToDestroy: [1] })
    );
    await expect(itemNFT.getItem(1)).to.be.reverted;
  });

  it("records death when died=true", async () => {
    await gameRegistry.connect(player1).registerPlayer("ryn");
    await gameRegistry.connect(player1).commitDay(
      ...makeCommitArgs({ daysSurvived: 1, newLevel: 1, died: true })
    );
    const charId = await gameRegistry.getCharacterId(player1.address);
    const stats = await characterNFT.getStats(charId);
    expect(stats.deathCount).to.equal(1);
  });

  it("rest bonus reduces net AP (rest×1 costs 20 gross but refunds 10 → 10 net)", async () => {
    await gameRegistry.connect(player1).registerPlayer("ryn");
    // idle×1 = 50 AP, rest×1 = 20 AP gross - 10 bonus = 10 net, total net = 60 AP ≤ 100
    await expect(
      gameRegistry.connect(player1).commitDay(
        ...makeCommitArgs({ idleCount: 1, restCount: 1, daysSurvived: 1, newLevel: 1 })
      )
    ).to.not.be.reverted;
  });
});
