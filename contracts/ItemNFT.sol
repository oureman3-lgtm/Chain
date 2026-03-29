// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ItemNFT
 * @notice ERC721 item/equipment NFT.
 *         Item types:
 *           Raw materials : 1=Wood, 2=Flint, 3=Grass, 4=Berry
 *           Basic tools   : 5=Axe, 6=Torch, 7=Campfire, 8=Sword
 *           Monster drops : 9=Leather, 10=Bone, 11=ShadowMaterial, 12=RareWood
 *           Ores/resources: 13=IronOre, 14=IronIngot, 15=Mushroom, 16=Fish,
 *                           17=Honey, 18=Hardwood
 *           Rare/region   : 19=AncientFragment, 20=ShadowCrystal, 21=LavaRock,
 *                           22=GoblinMeat
 *           Cooked food   : 23=CookedMeat, 24=Stew, 25=MushroomSoup, 26=HoneyBread
 *           Advanced gear : 27=IronSword, 28=IronArmor, 29=ShadowBlade
 *           Equipment     : 30=CookingPot, 31=Pickaxe, 32=FishingRod
 *           Quest/rare    : 33=AncientSword, 34=QuestRelic, 35=ExplorerBadge, 36=ChampionBadge
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
        itemMetas[9]  = ItemMeta("Leather",         0,   false, false);
        itemMetas[10] = ItemMeta("Bone",            0,   false, false);
        itemMetas[11] = ItemMeta("ShadowMaterial",  0,   false, false);
        itemMetas[12] = ItemMeta("RareWood",        0,   false, false);

        // Ores / gathered resources
        itemMetas[13] = ItemMeta("IronOre",         0,   false, false);
        itemMetas[14] = ItemMeta("IronIngot",        0,   false, false);
        itemMetas[15] = ItemMeta("Mushroom",         0,   false, true);
        itemMetas[16] = ItemMeta("Fish",             0,   false, true);
        itemMetas[17] = ItemMeta("Honey",            0,   false, false);
        itemMetas[18] = ItemMeta("Hardwood",         0,   false, false);

        // Rare / region-gated
        itemMetas[19] = ItemMeta("AncientFragment",  0,   false, false);
        itemMetas[20] = ItemMeta("ShadowCrystal",    0,   false, false);
        itemMetas[21] = ItemMeta("LavaRock",         0,   false, false);
        itemMetas[22] = ItemMeta("GoblinMeat",       0,   false, true);

        // Cooked food (consumable, restores hunger/health)
        itemMetas[23] = ItemMeta("CookedMeat",       0,   false, true);
        itemMetas[24] = ItemMeta("Stew",             0,   false, true);
        itemMetas[25] = ItemMeta("MushroomSoup",     0,   false, true);
        itemMetas[26] = ItemMeta("HoneyBread",       0,   false, true);

        // Advanced weapons / armor
        itemMetas[27] = ItemMeta("IronSword",        200, true,  false);
        itemMetas[28] = ItemMeta("IronArmor",        300, true,  false);
        itemMetas[29] = ItemMeta("ShadowBlade",      250, true,  false);

        // Utility equipment
        itemMetas[30] = ItemMeta("CookingPot",       150, true,  false);
        itemMetas[31] = ItemMeta("Pickaxe",          120, true,  false);
        itemMetas[32] = ItemMeta("FishingRod",        80, true,  false);

        // Quest / achievement items (infinite durability)
        itemMetas[33] = ItemMeta("AncientSword",     500, true,  false);
        itemMetas[34] = ItemMeta("QuestRelic",       0,   false, false);
        itemMetas[35] = ItemMeta("ExplorerBadge",    0,   false, false);
        itemMetas[36] = ItemMeta("ChampionBadge",    0,   false, false);
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
