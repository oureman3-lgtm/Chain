// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ItemNFT
 * @notice ERC721 item/equipment NFT.
 *         Item types: 1=Wood, 2=Flint, 3=Grass, 4=Berry,
 *                     5=Axe, 6=Torch, 7=Campfire, 8=Sword,
 *                     9=Leather, 10=Bone, 11=ShadowMaterial, 12=RareWood
 */
contract ItemNFT is ERC721, AccessControl {
    bytes32 public constant GAME_ROLE = keccak256("GAME_ROLE");

    struct ItemData {
        uint256 itemType;
        uint256 durability; // 0 = consumable/infinite
        string  name;
    }

    // Item type metadata
    struct ItemMeta {
        string name;
        uint256 maxDurability;
        bool isTool;       // tools lose durability on use
        bool isConsumable; // destroyed on use
    }

    uint256 private _nextTokenId;
    mapping(uint256 => ItemData) private _items;
    mapping(uint256 => ItemMeta) public itemMetas;

    event ItemMinted(address indexed to, uint256 indexed tokenId, uint256 itemType);
    event ItemBurned(uint256 indexed tokenId, uint256 itemType);

    constructor(address admin) ERC721("DontStarveItem", "DSI") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GAME_ROLE, admin);

        // Define item metadata
        itemMetas[1]  = ItemMeta("Wood",          0,  false, false);
        itemMetas[2]  = ItemMeta("Flint",         0,  false, false);
        itemMetas[3]  = ItemMeta("Grass",         0,  false, false);
        itemMetas[4]  = ItemMeta("Berry",         0,  false, true);
        itemMetas[5]  = ItemMeta("Axe",           100, true, false);
        itemMetas[6]  = ItemMeta("Torch",         50,  true, false);
        itemMetas[7]  = ItemMeta("Campfire",      200, true, false);
        itemMetas[8]  = ItemMeta("Sword",         150, true, false);
        itemMetas[9]  = ItemMeta("Leather",       0,  false, false);
        itemMetas[10] = ItemMeta("Bone",          0,  false, false);
        itemMetas[11] = ItemMeta("ShadowMaterial",0,  false, false);
        itemMetas[12] = ItemMeta("RareWood",      0,  false, false);
    }

    function mintItem(address to, uint256 itemType)
        external
        onlyRole(GAME_ROLE)
        returns (uint256 tokenId)
    {
        ItemMeta storage meta = itemMetas[itemType];
        require(bytes(meta.name).length > 0, "ItemNFT: unknown item type");

        _nextTokenId++;
        tokenId = _nextTokenId;

        _safeMint(to, tokenId);
        _items[tokenId] = ItemData({
            itemType:   itemType,
            durability: meta.maxDurability,
            name:       meta.name
        });

        emit ItemMinted(to, tokenId, itemType);
    }

    function burnItem(uint256 tokenId) external onlyRole(GAME_ROLE) {
        uint256 itemType = _items[tokenId].itemType;
        _burn(tokenId);
        delete _items[tokenId];
        emit ItemBurned(tokenId, itemType);
    }

    function getItem(uint256 tokenId) external view returns (ItemData memory) {
        require(_ownerOf(tokenId) != address(0), "ItemNFT: nonexistent token");
        return _items[tokenId];
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, AccessControl) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
