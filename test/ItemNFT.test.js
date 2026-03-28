const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ItemNFT", function () {
  let itemNFT, owner, player1;

  beforeEach(async () => {
    [owner, player1] = await ethers.getSigners();
    const ItemNFT = await ethers.getContractFactory("ItemNFT");
    itemNFT = await ItemNFT.deploy(owner.address);
    await itemNFT.waitForDeployment();
  });

  it("mints Wood (type 1) and returns correct data", async () => {
    await itemNFT.mintItem(player1.address, 1);
    const item = await itemNFT.getItem(1);
    expect(item.itemType).to.equal(1);
    expect(item.name).to.equal("Wood");
    expect(item.durability).to.equal(0); // raw material, no durability
  });

  it("mints Axe (type 5) with durability 100", async () => {
    await itemNFT.mintItem(player1.address, 5);
    const item = await itemNFT.getItem(1);
    expect(item.itemType).to.equal(5);
    expect(item.name).to.equal("Axe");
    expect(item.durability).to.equal(100);
  });

  it("rejects unknown item type", async () => {
    await expect(itemNFT.mintItem(player1.address, 99))
      .to.be.revertedWith("ItemNFT: unknown item type");
  });

  it("burns an item and removes it", async () => {
    await itemNFT.mintItem(player1.address, 1);
    await itemNFT.burnItem(1);
    await expect(itemNFT.getItem(1)).to.be.reverted;
  });

  it("blocks non-GAME_ROLE from minting", async () => {
    await expect(
      itemNFT.connect(player1).mintItem(player1.address, 1)
    ).to.be.reverted;
  });
});
