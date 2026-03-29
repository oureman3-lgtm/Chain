// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ItemNFT
 * @notice ERC721 item/equipment NFT for Axiom Wilds.
 *
 * ── Item Type Registry ────────────────────────────────────────────────────────
 * Raw materials   (tier 0):  1=Wood, 2=Flint, 3=Grass, 4=Berry, 37=Clay,
 *                            38=Coal, 39=Sulfur, 40=CrystalShard, 41=Vine,
 *                            42=HerbalRoot, 43=SpiderSilk, 44=GlacierIce,
 *                            45=VoidEssence
 *
 * Basic tools     (tier 1):  5=Axe, 6=Torch, 7=Campfire, 8=Sword, 47=Rope,
 *                            31=Pickaxe, 32=FishingRod, 30=CookingPot
 *
 * Monster drops   (tier 1):  9=Leather, 10=Bone, 11=ShadowMaterial,
 *                            12=RareWood, 22=GoblinMeat, 62=SpiderFang,
 *                            63=WolfPelt, 64=VoidCore
 *
 * Processed mats  (tier 2):  13=IronOre, 14=IronIngot, 15=Mushroom,
 *                            16=Fish, 17=Honey, 18=Hardwood, 46=AncientAlloy
 *
 * Rare/region     (tier 3):  19=AncientFragment, 20=ShadowCrystal,
 *                            21=LavaRock, 65=VoidShard, 66=GlacierCrystal
 *
 * Cooked food     (tier 1):  23=CookedMeat, 24=Stew, 25=MushroomSoup,
 *                            26=HoneyBread, 67=SpicedFish, 68=HerbalTea
 *
 * Potions         (tier 2):  56=AntivenomPotion, 57=StaminaPotion,
 *                            58=FireElixir, 69=FrostTonic, 70=ShadowDraught
 *
 * Standard gear   (tier 2):  27=IronSword, 28=IronArmor, 29=ShadowBlade,
 *                            48=LeatherArmor, 51=IronHelmet
 *
 * Advanced gear   (tier 3):  49=MagicStaff, 50=Bow, 53=SpiderArmor,
 *                            54=VoidBlade, 55=GlacierBlade, 59=ShadowCloak,
 *                            60=CrystalOrb
 *
 * Legendary gear  (tier 4):  33=AncientSword, 71=VoidReaper, 72=GlacierEdge
 *
 * Ammo            (tier 0):  52=Arrows
 *
 * Quest/achieve   :          34=QuestRelic, 35=ExplorerBadge, 36=ChampionBadge,
 *                            61=AncientKey, 73=SteamAchievementSeal
 */
contract ItemNFT is ERC721, AccessControl {
    bytes32 public constant GAME_ROLE = keccak256("GAME_ROLE");

    // ── Data types ────────────────────────────────────────────────────────────

    struct ItemData {
        uint256 itemType;
        uint256 durability; // 0 = consumable or infinite-durability
        string  name;
    }

    struct ItemMeta {
        string  name;
        uint256 maxDurability;
        bool    isTool;        // tools lose durability on use
        bool    isConsumable;  // destroyed on use
        uint8   tier;          // 0=raw, 1=basic, 2=advanced, 3=rare, 4=legendary
    }

    // ── Storage ───────────────────────────────────────────────────────────────

    uint256 private _nextTokenId;
    mapping(uint256 => ItemData) private _items;
    mapping(uint256 => ItemMeta) public itemMetas;

    // ── Events ────────────────────────────────────────────────────────────────

    event ItemMinted(address indexed to, uint256 indexed tokenId, uint256 itemType);
    event ItemBurned(uint256 indexed tokenId, uint256 itemType);

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(address admin) ERC721("AxiomWildsItem", "AWI") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GAME_ROLE, admin);

        // ── Tier 0: raw materials ──────────────────────────────────────────
        itemMetas[1]  = ItemMeta("Wood",           0,   false, false, 0);
        itemMetas[2]  = ItemMeta("Flint",          0,   false, false, 0);
        itemMetas[3]  = ItemMeta("Grass",          0,   false, false, 0);
        itemMetas[4]  = ItemMeta("Berry",          0,   false, true,  0);
        itemMetas[37] = ItemMeta("Clay",           0,   false, false, 0);
        itemMetas[38] = ItemMeta("Coal",           0,   false, false, 0);
        itemMetas[39] = ItemMeta("Sulfur",         0,   false, false, 0);
        itemMetas[40] = ItemMeta("CrystalShard",   0,   false, false, 0);
        itemMetas[41] = ItemMeta("Vine",           0,   false, false, 0);
        itemMetas[42] = ItemMeta("HerbalRoot",     0,   false, false, 0);
        itemMetas[43] = ItemMeta("SpiderSilk",     0,   false, false, 0);
        itemMetas[44] = ItemMeta("GlacierIce",     0,   false, false, 0);
        itemMetas[45] = ItemMeta("VoidEssence",    0,   false, false, 0);
        itemMetas[52] = ItemMeta("Arrows",         0,   false, false, 0);

        // ── Tier 1: basic tools & weapons ─────────────────────────────────
        itemMetas[5]  = ItemMeta("Axe",            100, true,  false, 1);
        itemMetas[6]  = ItemMeta("Torch",          50,  true,  false, 1);
        itemMetas[7]  = ItemMeta("Campfire",       200, true,  false, 1);
        itemMetas[8]  = ItemMeta("Sword",          150, true,  false, 1);
        itemMetas[47] = ItemMeta("Rope",           80,  true,  false, 1);
        itemMetas[30] = ItemMeta("CookingPot",     150, true,  false, 1);
        itemMetas[31] = ItemMeta("Pickaxe",        120, true,  false, 1);
        itemMetas[32] = ItemMeta("FishingRod",     80,  true,  false, 1);

        // ── Tier 1: monster drops ──────────────────────────────────────────
        itemMetas[9]  = ItemMeta("Leather",        0,   false, false, 1);
        itemMetas[10] = ItemMeta("Bone",           0,   false, false, 1);
        itemMetas[11] = ItemMeta("ShadowMaterial", 0,   false, false, 1);
        itemMetas[12] = ItemMeta("RareWood",       0,   false, false, 1);
        itemMetas[22] = ItemMeta("GoblinMeat",     0,   false, true,  1);
        itemMetas[62] = ItemMeta("SpiderFang",     0,   false, false, 1);
        itemMetas[63] = ItemMeta("WolfPelt",       0,   false, false, 1);
        itemMetas[64] = ItemMeta("VoidCore",       0,   false, false, 2);

        // ── Tier 1: cooked food ────────────────────────────────────────────
        itemMetas[23] = ItemMeta("CookedMeat",     0,   false, true,  1);
        itemMetas[24] = ItemMeta("Stew",           0,   false, true,  1);
        itemMetas[25] = ItemMeta("MushroomSoup",   0,   false, true,  1);
        itemMetas[26] = ItemMeta("HoneyBread",     0,   false, true,  1);
        itemMetas[67] = ItemMeta("SpicedFish",     0,   false, true,  1);
        itemMetas[68] = ItemMeta("HerbalTea",      0,   false, true,  1);

        // ── Tier 2: processed materials ───────────────────────────────────
        itemMetas[13] = ItemMeta("IronOre",        0,   false, false, 2);
        itemMetas[14] = ItemMeta("IronIngot",      0,   false, false, 2);
        itemMetas[15] = ItemMeta("Mushroom",       0,   false, true,  1);
        itemMetas[16] = ItemMeta("Fish",           0,   false, true,  1);
        itemMetas[17] = ItemMeta("Honey",          0,   false, false, 1);
        itemMetas[18] = ItemMeta("Hardwood",       0,   false, false, 2);
        itemMetas[46] = ItemMeta("AncientAlloy",   0,   false, false, 3);

        // ── Tier 2: potions ────────────────────────────────────────────────
        itemMetas[56] = ItemMeta("AntivenomPotion",0,   false, true,  2);
        itemMetas[57] = ItemMeta("StaminaPotion",  0,   false, true,  2);
        itemMetas[58] = ItemMeta("FireElixir",     0,   false, true,  2);
        itemMetas[69] = ItemMeta("FrostTonic",     0,   false, true,  2);
        itemMetas[70] = ItemMeta("ShadowDraught",  0,   false, true,  2);

        // ── Tier 2: standard gear ─────────────────────────────────────────
        itemMetas[27] = ItemMeta("IronSword",      200, true,  false, 2);
        itemMetas[28] = ItemMeta("IronArmor",      300, true,  false, 2);
        itemMetas[29] = ItemMeta("ShadowBlade",    250, true,  false, 2);
        itemMetas[48] = ItemMeta("LeatherArmor",   200, true,  false, 2);
        itemMetas[51] = ItemMeta("IronHelmet",     180, true,  false, 2);

        // ── Tier 3: rare region items ─────────────────────────────────────
        itemMetas[19] = ItemMeta("AncientFragment",0,   false, false, 3);
        itemMetas[20] = ItemMeta("ShadowCrystal",  0,   false, false, 3);
        itemMetas[21] = ItemMeta("LavaRock",       0,   false, false, 3);
        itemMetas[65] = ItemMeta("VoidShard",      0,   false, false, 3);
        itemMetas[66] = ItemMeta("GlacierCrystal", 0,   false, false, 3);

        // ── Tier 3: advanced gear ─────────────────────────────────────────
        itemMetas[49] = ItemMeta("MagicStaff",     220, true,  false, 3);
        itemMetas[50] = ItemMeta("Bow",            160, true,  false, 2);
        itemMetas[53] = ItemMeta("SpiderArmor",    280, true,  false, 3);
        itemMetas[54] = ItemMeta("VoidBlade",      300, true,  false, 3);
        itemMetas[55] = ItemMeta("GlacierBlade",   280, true,  false, 3);
        itemMetas[59] = ItemMeta("ShadowCloak",    240, true,  false, 3);
        itemMetas[60] = ItemMeta("CrystalOrb",     200, true,  false, 3);

        // ── Tier 4: legendary gear ────────────────────────────────────────
        itemMetas[33] = ItemMeta("AncientSword",   500, true,  false, 4);
        itemMetas[71] = ItemMeta("VoidReaper",     450, true,  false, 4);
        itemMetas[72] = ItemMeta("GlacierEdge",    420, true,  false, 4);

        // ── Quest / achievement ───────────────────────────────────────────
        itemMetas[34] = ItemMeta("QuestRelic",     0,   false, false, 3);
        itemMetas[35] = ItemMeta("ExplorerBadge",  0,   false, false, 2);
        itemMetas[36] = ItemMeta("ChampionBadge",  0,   false, false, 3);
        itemMetas[61] = ItemMeta("AncientKey",     0,   false, false, 3);
        itemMetas[73] = ItemMeta("SteamSeal",      0,   false, false, 2);
    }

    // ── Mint & Burn ───────────────────────────────────────────────────────────

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

    // ── Views ─────────────────────────────────────────────────────────────────

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
