// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./ItemNFT.sol";

/**
 * @title CraftingSystem
 * @notice Validates crafting recipes, burns input NFTs, mints output NFT atomically.
 *         Recipes are seeded by deploy script.
 */
contract CraftingSystem is AccessControl {
    bytes32 public constant GAME_ROLE = keccak256("GAME_ROLE");

    ItemNFT public itemNFT;

    struct Recipe {
        uint256[] inputTypes;   // required item types (in order)
        uint256[] inputAmounts; // required count of each type
        uint256   outputType;   // item type to mint
        bool      exists;
    }

    mapping(uint256 => Recipe) public recipes;
    uint256 public recipeCount;

    event RecipeAdded(uint256 indexed recipeId, uint256 outputType);
    event ItemCrafted(
        address indexed player,
        uint256 indexed recipeId,
        uint256 outputTokenId,
        uint256 outputType
    );

    constructor(address admin, address _itemNFT) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GAME_ROLE, admin);
        itemNFT = ItemNFT(_itemNFT);
    }

    function addRecipe(
        uint256[] calldata inputTypes,
        uint256[] calldata inputAmounts,
        uint256 outputType
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (uint256 recipeId) {
        require(inputTypes.length == inputAmounts.length, "CraftingSystem: length mismatch");
        require(inputTypes.length > 0, "CraftingSystem: empty recipe");

        recipeId = recipeCount++;
        recipes[recipeId] = Recipe({
            inputTypes:   inputTypes,
            inputAmounts: inputAmounts,
            outputType:   outputType,
            exists:       true
        });

        emit RecipeAdded(recipeId, outputType);
    }

    /**
     * @notice Craft an item. Caller provides token IDs for each input slot.
     *         inputTokenIds is a flat array grouped by recipe input order.
     *         e.g. recipe needs [Wood×2, Flint×1] → pass [woodId1, woodId2, flintId1]
     */
    function craft(uint256 recipeId, uint256[] calldata inputTokenIds)
        external
        returns (uint256 outputTokenId)
    {
        Recipe storage recipe = recipes[recipeId];
        require(recipe.exists, "CraftingSystem: recipe not found");

        // Verify total token count matches recipe
        uint256 totalRequired;
        for (uint256 i = 0; i < recipe.inputAmounts.length; i++) {
            totalRequired += recipe.inputAmounts[i];
        }
        require(inputTokenIds.length == totalRequired, "CraftingSystem: wrong token count");

        // Verify ownership and type for each input token
        uint256 cursor;
        for (uint256 i = 0; i < recipe.inputTypes.length; i++) {
            for (uint256 j = 0; j < recipe.inputAmounts[i]; j++) {
                uint256 tokenId = inputTokenIds[cursor++];
                require(
                    itemNFT.ownerOf(tokenId) == msg.sender,
                    "CraftingSystem: not item owner"
                );
                ItemNFT.ItemData memory item = itemNFT.getItem(tokenId);
                require(
                    item.itemType == recipe.inputTypes[i],
                    "CraftingSystem: wrong item type"
                );
            }
        }

        // Burn all input tokens
        for (uint256 i = 0; i < inputTokenIds.length; i++) {
            itemNFT.burnItem(inputTokenIds[i]);
        }

        // Mint output
        outputTokenId = itemNFT.mintItem(msg.sender, recipe.outputType);

        emit ItemCrafted(msg.sender, recipeId, outputTokenId, recipe.outputType);
    }

    function getRecipe(uint256 recipeId) external view returns (Recipe memory) {
        require(recipes[recipeId].exists, "CraftingSystem: recipe not found");
        return recipes[recipeId];
    }
}
