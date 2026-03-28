const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CraftingSystem", function () {
  let itemNFT, craftingSystem, owner, player1;

  beforeEach(async () => {
    [owner, player1] = await ethers.getSigners();

    const ItemNFT = await ethers.getContractFactory("ItemNFT");
    itemNFT = await ItemNFT.deploy(owner.address);
    await itemNFT.waitForDeployment();

    const CraftingSystem = await ethers.getContractFactory("CraftingSystem");
    craftingSystem = await CraftingSystem.deploy(owner.address, await itemNFT.getAddress());
    await craftingSystem.waitForDeployment();

    const GAME_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GAME_ROLE"));
    await itemNFT.grantRole(GAME_ROLE, await craftingSystem.getAddress());

    // Recipe 0: Axe = Wood×2 + Flint×1 → itemType 5
    await craftingSystem.addRecipe([1, 2], [2, 1], 5);
  });

  async function giveItems(player, types) {
    const ids = [];
    for (const t of types) {
      const tx = await itemNFT.mintItem(player.address, t);
      const receipt = await tx.wait();
      // tokenId increments from 1
      ids.push(ids.length + 1);
    }
    return ids;
  }

  it("crafts an Axe from Wood×2 + Flint×1", async () => {
    const ids = await giveItems(player1, [1, 1, 2]); // wood, wood, flint
    const tx = await craftingSystem.connect(player1).craft(0, ids);
    const receipt = await tx.wait();
    const event = receipt.logs.find(l => l.fragment?.name === "ItemCrafted");
    expect(event).to.not.be.undefined;

    // Output token should be itemType 5 (Axe)
    const outputId = event.args.outputTokenId;
    const item = await itemNFT.getItem(outputId);
    expect(item.itemType).to.equal(5);
  });

  it("burns all input tokens on craft", async () => {
    const ids = await giveItems(player1, [1, 1, 2]);
    await craftingSystem.connect(player1).craft(0, ids);
    for (const id of ids) {
      await expect(itemNFT.getItem(id)).to.be.reverted;
    }
  });

  it("rejects wrong item types", async () => {
    // Give wrong types: grass instead of flint
    const ids = await giveItems(player1, [1, 1, 3]);
    await expect(
      craftingSystem.connect(player1).craft(0, ids)
    ).to.be.revertedWith("CraftingSystem: wrong item type");
  });

  it("rejects wrong item count", async () => {
    const ids = await giveItems(player1, [1, 2]); // only 2 instead of 3
    await expect(
      craftingSystem.connect(player1).craft(0, ids)
    ).to.be.revertedWith("CraftingSystem: wrong token count");
  });

  it("rejects crafting with items not owned by caller", async () => {
    const [, , player2] = await ethers.getSigners();
    const ids = await giveItems(player2, [1, 1, 2]); // owned by player2
    await expect(
      craftingSystem.connect(player1).craft(0, ids)
    ).to.be.revertedWith("CraftingSystem: not item owner");
  });

  it("rejects unknown recipe", async () => {
    const ids = await giveItems(player1, [1, 1, 2]);
    await expect(
      craftingSystem.connect(player1).craft(99, ids)
    ).to.be.revertedWith("CraftingSystem: recipe not found");
  });
});
