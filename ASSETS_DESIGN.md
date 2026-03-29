# Axiom Wilds — Visual Identity & Assets Design Specification

**Version**: 2.0
**Art Direction**: Neo-Gothic Wilderness

---

## 1. Visual Identity Overview

### Core Aesthetic
Axiom Wilds uses a **Neo-Gothic Wilderness** art style — dark, hand-inked 2D artwork with a muted jewel-tone palette punctuated by luminous Axiom crystal energy. The look balances grim survivalism with ethereal beauty.

**Pillars:**
- **Dark & atmospheric**: deep earth tones, charcoal shadows, minimal ambient light
- **Axiom glow**: cyan/violet crystal energy serves as the recurring accent (all interactive UI, ability FX)
- **Ink & texture**: slight paper/parchment texture on backgrounds; visible brush strokes on character portraits
- **Readable at a glance**: strong silhouettes for characters and monsters; colour-coded resource nodes

### Colour Palette

| Token | Hex | Usage |
|---|---|---|
| Axiom Cyan | `#4FC3F7` | Primary UI, Ryn accent, crystal FX |
| Ember Orange | `#FF7043` | Kira accent, fire FX, health bar low |
| Steel Grey | `#90A4AE` | Draven accent, armor tones, rock nodes |
| Verdant Green | `#A5D6A7` | Lila accent, foliage, hunger bar |
| Shadow Violet | `#CE93D8` | Vox accent, night FX, sanity bar |
| Golden Amber | `#FFCC80` | Sael accent, torch light, crafting glow |
| Charcoal | `#1C1C2E` | Background panels, HUD backing |
| Parchment | `#F5E6C8` | Tooltip backgrounds, scroll UI |
| Blood Red | `#C62828` | Damage indicators, blood moon FX |
| Void Black | `#0A0A14` | Deep night sky, void enemy aura |

---

## 2. Character Sprites

### Sprite Sheet Specification
- **File**: `characters_sheet.png`
- **Frame size**: 64×96 px per character (portrait orientation)
- **Layout**: 6 columns × 4 rows (idle, walk, attack, hurt)
- **Style**: pixel art with 1px black outline; 3-4 colour shading per tone group
- **Scale in-game**: rendered at 2× (128×192 px on-screen)

### Character Visual Profiles

#### Row 0 — Ryn, The Scout (`ryn_portrait.png`)
- **Silhouette**: lean, hooded traveller; short cape, light pack
- **Palette**: dusty teal cloak, worn leather boots, pale skin
- **Accent**: Axiom Cyan goggles (glowing faintly)
- **Animation notes**: fluid walk cycle; idle = adjusting pack straps
- **Portrait dimensions**: 256×320 px; dark forest background, dappled Axiom light

#### Row 1 — Kira, The Pyromancer (`kira_portrait.png`)
- **Silhouette**: slim, fiery hair streaked with orange crystals
- **Palette**: crimson bodysuit, amber crystal shards embedded in arms
- **Accent**: Ember Orange hand-glow FX; pupils flicker when ability active
- **Animation notes**: attack = explosive hand-thrust; idle = flame wisps spiral around hands
- **Portrait dimensions**: 256×320 px; molten rock background

#### Row 2 — Draven, The Knight (`draven_portrait.png`)
- **Silhouette**: broad-shouldered, full plate armour; visor half-raised
- **Palette**: charcoal steel with Steel Grey highlights; blue-flame torch on belt
- **Accent**: chest-plate sigil glows Steel Grey when Iron Will activates
- **Animation notes**: heavy footstep impact frames; block animation for Iron Will
- **Portrait dimensions**: 256×320 px; ruined city wall background

#### Row 3 — Lila, The Herbalist (`lila_portrait.png`)
- **Silhouette**: slight figure, wide-brimmed hat adorned with pressed flowers
- **Palette**: sage green dress, terracotta satchels, warm tan skin
- **Accent**: Verdant Green aura around hands during gather; flower particles
- **Animation notes**: idle = writing in journal; gather = delicate plucking motion
- **Portrait dimensions**: 256×320 px; moonlit meadow background

#### Row 4 — Vox, The Trickster (`vox_portrait.png`)
- **Silhouette**: wiry, masked; twin short blades at hips; split hood
- **Palette**: charcoal blacks, Shadow Violet underlining on hood
- **Accent**: full-body violet shimmer during Shadow Step; eyes glow violet
- **Animation notes**: blink-step dash for Shadow Step; idle = coin/knife flip
- **Portrait dimensions**: 256×320 px; moonlit rooftop background

#### Row 5 — Sael, The Sage (`sael_portrait.png`)
- **Silhouette**: tall, robed; carrying floating crystalline tome; silver braid
- **Palette**: deep indigo robes, Golden Amber runes, pale porcelain skin
- **Accent**: Golden Amber particles orbit tome during Arcane Craft; spell circle FX
- **Animation notes**: idle = tome pages turn by themselves; craft = complex hand gesture
- **Portrait dimensions**: 256×320 px; ancient library-ruin background

---

## 3. Monster Sprites

### Monster Sheet Specification
- **File**: `monsters_sheet.png`
- **Frame size**: 80×80 px per monster
- **Layout**: 10 rows × 3 columns (idle, attack, death)
- **Style**: same pixel art style as characters; monsters have thicker outlines (2px)
- **Scale in-game**: 2× (160×160 px); screen-shake on heavy monsters

### Monster Profiles

| Row | Monster | Size | Colour Palette | Special FX |
|---|---|---|---|---|
| 0 | Wolf | Medium | Grey-brown fur, amber eyes | None |
| 1 | Goblin | Small | Mossy green skin, jagged copper blade | None |
| 2 | Spider | Medium | Black carapace, violet web filaments | Web-spray on attack |
| 3 | TreeGuard | Large (2×) | Dark bark, glowing green eye-knots | Root-slam ground crack |
| 4 | IronGolem | Large (2×) | Rusted iron plates, blue core | Spark FX on hit |
| 5 | Bandit | Medium | Tattered cloaks, mismatched armour | Coin-toss taunt idle |
| 6 | Shadow | Medium | Wisp of void-black smoke, two white eyes | Dissolve on death |
| 7 | VoidWalker | Large (2×) | Absolute black with Void Black aura | Reality-crack death FX |
| 8 | LavaBeast | Large (2×) | Stone crust, molten core, Ember Orange veins | Lava-pool on death |
| 9 | VoidLord | XL (3×) | Dark purple cloak, six glowing eyes | Screen flash + void rift |

---

## 4. Item Icons

### Icon Sheet Specification
- **File**: `items_sheet.png`
- **Frame size**: 32×32 px per icon
- **Layout**: 8 columns × 10 rows (73 icons + 7 empty padding)
- **Style**: flat 2D icon art; 1px border; tier-coloured glow border

### Tier Border Colours
| Tier | Label | Border Colour |
|---|---|---|
| 0 | Raw Material | `#78909C` (muted blue-grey) |
| 1 | Basic | `#A5D6A7` (green) |
| 2 | Refined | `#4FC3F7` (cyan) |
| 3 | Advanced | `#CE93D8` (violet) |
| 4 | Legendary | `#FFCC80` (golden amber, animated shimmer) |

### Icon Index (matches ITEM_NAMES_EN in items.js)

```
Row 0 (IDs 1-8):   Wood, Stone, Flint, Grass, Berries, Leather, Bone, WolfPelt
Row 1 (IDs 9-16):  Axe, Sword, Shield, Torch, Campfire, Bandage, Rope, LeatherArmor
Row 2 (IDs 17-24): IronSword, IronHelmet, MagicStaff, Bow, Arrows, SpiderArmor, VoidBlade, GlacierBlade
Row 3 (IDs 25-32): MeatCooked, BerryPie, MushroomSoup, SpicedFish, HerbalTea, FrostTonic, ShadowDraught, [empty]
Row 4 (IDs 33-40): HealthPotion, StaminaPotion, FireElixir, Antivenom, ShadowCloak, CrystalOrb, AncientKey, [empty]
Row 5 (IDs 41-48): Clay, Coal, Sulfur, CrystalShard, Vine, HerbalRoot, SpiderSilk, GlacierIce
Row 6 (IDs 49-56): VoidEssence, AncientAlloy, SpiderFang, VoidCore, VoidShard, GlacierCrystal, [empty], [empty]
Row 7 (IDs 57-64): VoidReaper, GlacierEdge, SteamSeal, [empty], [empty], [empty], [empty], [empty]
```

---

## 5. Resource Node Sprites

### Node Sheet Specification
- **File**: `resource_nodes_sheet.png`
- **Frame size**: 64×64 px per node
- **Layout**: 17 nodes in a single row
- **Style**: isometric 2D; slight top-down tilt; hand-painted feel
- **Animation**: 2-frame shimmer on harvestable state; depleted state = desaturated version

### Node Profiles (matches RESOURCE_TYPES in items.js)

| Index | Node Name | Visual | Colour Key |
|---|---|---|---|
| 0 | Pine Tree | Dark evergreen, slightly twisted trunk | `#2E7D32` (dark green) |
| 1 | Boulder | Rounded granite, lichen patches | `#546E7A` (steel grey) |
| 2 | Tall Grass | Swaying meadow grass cluster | `#66BB6A` (light green) |
| 3 | Berry Bush | Round shrub, bright red berries | `#EF5350` (berry red) |
| 4 | Crystal Vein | Jutting cyan crystals, glow pulse | `#4FC3F7` (Axiom cyan) |
| 5 | Mushroom Ring | 5 glowing purple mushrooms in a ring | `#AB47BC` (mushroom violet) |
| 6 | Bone Pile | Scattered skeleton remains | `#F5F5F5` (bone white) |
| 7 | Iron Deposit | Dark rock face, rust-orange streaks | `#BF360C` (iron rust) |
| 8 | Ancient Ruin | Crumbling stone arch, faint runes | `#795548` (stone brown) |
| 9 | Clay Deposit | Reddish moist earth mound | `#BF8D6D` (clay terracotta) |
| 10 | Coal Seam | Black-veined stone, oily sheen | `#212121` (coal black) |
| 11 | Sulfur Vent | Cracked earth, yellow crystal crust, steam | `#F9A825` (sulfur yellow) |
| 12 | Crystal Cluster | Dense violet crystal formation | `#CE93D8` (crystal violet) |
| 13 | Vine Patch | Sprawling jungle vine tangle | `#1B5E20` (vine dark green) |
| 14 | Herbal Garden | Neat patch, varied leaf shapes | `#A5D6A7` (herb green) |
| 15 | Spider Nest | Dark funnel-web sac on dead tree | `#4A148C` (spider dark purple) |
| 16 | Glacier Fissure | Ice crack with cerulean inner glow | `#B3E5FC` (glacier blue) |

---

## 6. World Tileset / Biomes

### Tile Specification
- **File pattern**: `tileset_{region}.png`
- **Tile size**: 32×32 px
- **Tiles per sheet**: 8×8 (64 tiles covering ground, transitions, decorations)

### 5-Region Biome Specs

#### Region 0 — Grasslands (`tileset_grasslands.png`)
- **Ground**: bright grass green to dull yellow-green gradient
- **Hazards**: none in day; wolves spawn at night
- **Key colours**: `#388E3C`, `#689F38`, `#33691E`
- **Ambient FX**: fireflies at night; gentle wind-grass shader

#### Region 1 — Dark Forest (`tileset_forest.png`)
- **Ground**: dark soil with root networks visible
- **Hazards**: Spiders, TreeGuards; dense tree canopy (80% cover)
- **Key colours**: `#1B5E20`, `#263238`, `#33691E`
- **Ambient FX**: falling leaves; fog tendrils at ground level

#### Region 2 — Ruined City (`tileset_ruins.png`)
- **Ground**: cracked concrete, cobblestone, rubble piles
- **Hazards**: Bandits, IronGolems; structural collapse events
- **Key colours**: `#455A64`, `#37474F`, `#78909C`
- **Ambient FX**: dust particles; distant building collapse sounds

#### Region 3 — Shadow Wastes (`tileset_shadow.png`)
- **Ground**: ashy dark earth, void crystal outcroppings
- **Hazards**: Shadows, VoidWalkers; sanity drain aura
- **Key colours**: `#1A237E`, `#0D0D1A`, `#CE93D8`
- **Ambient FX**: crackling void energy; shadow tendrils at world edges

#### Region 4 — Volcanic Reaches (`tileset_volcano.png`)
- **Ground**: cooled black lava field; active lava rivers in background
- **Hazards**: LavaBeast, VoidLord; heat damage per tick
- **Key colours**: `#BF360C`, `#E64A19`, `#FF8A65`
- **Ambient FX**: ember particles rising; heat shimmer shader; distant eruption rumble

---

## 7. HUD & UI Design

### HUD Layout (1920×1080 reference)
```
+----------------------------------------------------------------------+
| [Portrait]  Ryn Lv.3  HP 85/100  HN 72/100  SN 60/100              |  <- Top-left
|                                                                        |
|                                                                        |
|                    [ GAME WORLD CANVAS ]                              |
|                                                                        |
|                                                                        |
| [Hotbar: 8 item slots]     [AP: ######.... 60/100]  [Day 4 Sun 3:22] |  <- Bottom
+----------------------------------------------------------------------+
```

### Stat Bar Colours
| Bar | Full colour | Low colour (< 30%) |
|---|---|---|
| Health | `#EF5350` (red) | `#B71C1C` (dark red, pulsing) |
| Hunger | `#66BB6A` (green) | `#F57F17` (orange, pulsing) |
| Sanity | `#7986CB` (indigo) | `#CE93D8` (violet, jittering) |
| AP | `#4FC3F7` (cyan) | `#B0BEC5` (grey) |

### Panel Style
- **Background**: `rgba(10, 10, 20, 0.85)` with `1px solid #4FC3F7` border (Axiom cyan glow)
- **Font**: "Merriweather" serif for lore/titles; "Roboto Mono" for numbers/stats
- **Corner decoration**: small Axiom crystal motif (4px crystal sprite)

### Inventory Panel (`InventoryPanel`)
- 5×8 grid (40 slots), each 48×48 px
- Slot background: `#1A1A2E`; hovered: `#2A2A4E`; selected: `#4FC3F7` outline
- Item tier border applied as 2px inner border on slot

### Crafting Panel (`CraftingPanel`)
- Left: recipe list with category tabs (Survival / Weapons / Armour / Alchemy / Structures)
- Right: ingredient slots (4 max) + output preview
- "Craft" button: Axiom Cyan with animated shimmer; greyed when ingredients missing

### Notification Bar (`NotificationBar`)
- Top-right corner; slides down from top
- Three tiers: Info (cyan), Warning (amber), Danger (red)
- Auto-dismiss: 3s info, 5s warning, stays until dismissed for danger

---

## 8. Day/Night Cycle Visuals

| Phase | Sky Tint | Overlay Alpha | Ambient Light |
|---|---|---|---|
| Dawn (0-15%) | `#FF8F00` warm orange | 0.2 | Warm directional |
| Day (15-75%) | `#87CEEB` sky blue | 0.0 | Full bright |
| Dusk (75-90%) | `#FF7043` deep orange-red | 0.25 | Warm fading |
| Night (90-100%) | `#0D0D1A` void blue | 0.65 | Cool moonlight |

- **Torch / Campfire**: radial light gradient, `#FFCC80` at centre -> transparent at 3-tile radius
- **Vox Shadow Step FX**: dark-violet body shimmer, `#CE93D8` after-image trail

---

## 9. Special Ability Visual Effects

| Ability | Trigger | Effect |
|---|---|---|
| FIRE_AFFINITY (Kira) | Gather / Attack | Orange-red particle burst from hands; ember trail on movement |
| IRON_WILL (Draven) | Taking damage | Silver shield flash (0.1s) over character; metallic clang SFX |
| LUCKY_HARVEST (Lila) | Gather | Green sparkle burst on node; extra item floats up with golden shimmer |
| SHADOW_STEP (Vox) | Night entry | Violet shimmer wraps full body; footstep particles turn dark |
| ARCANE_CRAFT (Sael) | Craft | Golden rune circle animates (0.5s) during craft; bonus item materialises with cyan flash |

---

## 10. Steam Store Assets

### Capsule Image — Small (231×87 px)
- Dark gradient background (Charcoal -> Void Black)
- "AXIOM WILDS" logo (hand-lettered serif, Axiom Cyan glow)
- Silhouettes of 3 characters (Ryn / Kira / Draven) as team

### Capsule Image — Large / Hero (460×215 px)
- Full scene: all 6 characters in dramatic poses against a fractured Axiom crystal pillar
- Logo centred with subtitle "A Blockchain Survival RPG"
- Tagline: "Survive. Craft. Chain."

### Library Capsule (600×900 px)
- Vertical portrait format
- Ryn in foreground (dominant), full character portrait
- Axiom crystal energy background, other characters as faint silhouettes
- Logo at top, ESRB/PEGI rating placeholder at bottom

### Screenshots (1920×1080 px x5)
1. Day 1 — Grasslands resource gather (Lila, herb node, green particles)
2. Night combat — Vox vs VoidWalker (violet shimmer, void FX)
3. Crafting panel — Sael with Arcane Craft rune circle active
4. Regional exploration — Volcanic Reaches with LavaBeast encounter UI
5. Inventory full — after Blood Moon event loot, mixed tier items

### Trailer Concept (30s)
- 0-5s: Black screen, Axiom crystal hum SFX, slow crystal glow reveal
- 5-15s: Character select montage (all 6 portraits, ability name flash)
- 15-25s: Gameplay montage (combat -> gather -> craft -> night survival)
- 25-30s: Logo reveal + "Survive. Craft. Chain." + release date slate

---

## 11. Audio Identity

### Music Themes
| Context | Style | Tempo | Key |
|---|---|---|---|
| Main Menu | Ambient, melancholic strings | 60 BPM | D minor |
| Grasslands Day | Folk acoustic, hopeful | 95 BPM | G major |
| Dark Forest | Low drones, distant howls | 70 BPM | B minor |
| Shadow Wastes | Atonal pads, whispering | 50 BPM | Chromatic |
| Volcanic Reaches | Industrial percussion | 120 BPM | E minor |
| Combat | Intense percussion, distorted | 140 BPM | A minor |
| Victory | Short fanfare, 4 bars | 100 BPM | C major |
| Blood Moon | Horror strings + choir | 80 BPM | D# minor |

### SFX Priorities
- Gather: satisfying crunch/snap per material type (wood crack, crystal chime, herb tear)
- Craft: metallic assembly sequence + chime on completion
- Combat: sharp blade/hit impacts; monster-specific death sounds
- Ability FX: each special ability has unique 0.3s sting SFX
- UI: minimal click SFX; notification SFX tiered by severity

---

## 12. File Delivery Checklist

### Sprites
- [ ] `characters_sheet.png` — 384×384 px (6 cols x 4 rows @ 64×96)
- [ ] `ryn_portrait.png` — 256×320 px
- [ ] `kira_portrait.png` — 256×320 px
- [ ] `draven_portrait.png` — 256×320 px
- [ ] `lila_portrait.png` — 256×320 px
- [ ] `vox_portrait.png` — 256×320 px
- [ ] `sael_portrait.png` — 256×320 px
- [ ] `monsters_sheet.png` — 240×800 px (3 cols x 10 rows @ 80×80)

### Items & Nodes
- [ ] `items_sheet.png` — 256×320 px (8 cols x 10 rows @ 32×32)
- [ ] `resource_nodes_sheet.png` — 1088×64 px (17 nodes @ 64×64)

### Tilesets
- [ ] `tileset_grasslands.png` — 256×256 px
- [ ] `tileset_forest.png` — 256×256 px
- [ ] `tileset_ruins.png` — 256×256 px
- [ ] `tileset_shadow.png` — 256×256 px
- [ ] `tileset_volcano.png` — 256×256 px

### UI
- [ ] `ui_hud.png` — 9-slice panel assets
- [ ] `ui_icons.png` — stat icons (heart, fork, moon, ap-bolt)
- [ ] `ui_buttons.png` — button states (normal/hover/pressed/disabled)
- [ ] `ui_slot.png` — inventory/hotbar slot

### Steam
- [ ] `steam_capsule_small.png` — 231×87 px
- [ ] `steam_capsule_large.png` — 460×215 px
- [ ] `steam_library.png` — 600×900 px
- [ ] `steam_screenshots.png` x5 — 1920×1080 px each
