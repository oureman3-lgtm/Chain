# 美术资源设计说明

## 整体视觉风格

**参考：** 《Don't Starve》—— 手绘风格，黑色粗描边，略带卡通夸张。调色盘整体偏暗，以深棕、灰绿、焦橙为主色，夜晚时加深暗角。

**技术规格：**
- 所有精灵图使用 PNG，背景透明
- 像素密度：@1x 基准，导出时不需要模糊（保持清晰硬边）
- 描边：1~2px 黑色描边，增强辨识度

---

## 图片清单与生成方案

### 合并图（Sprite Sheet）- 推荐 AI 一次生成

#### 1. 物品图标集 `items_sheet.png` (512×256)
> 12 个物品图标排成 4×3 网格，每格 128×128，PNG 透明背景
> **风格：** 饥荒手绘风格，黑色粗线描边，俯视角，稍微带点立体感

| 位置 | 物品 | 设计要点 |
|---|---|---|
| (0,0) | 木材 | 两根棕色原木捆在一起，斜放 |
| (1,0) | 燧石 | 灰色尖锐石片，边缘不规则 |
| (2,0) | 草 | 三根绿草捆扎 |
| (3,0) | 浆果 | 三颗橘红色浆果串 |
| (0,1) | 斧头 | 木柄石头斧，原始风格 |
| (1,1) | 火把 | 木棍顶端缠绕布，燃烧的橙色火焰 |
| (2,1) | 营地篝火 | 三块石头围绕的小火堆 |
| (3,1) | 剑 | 简单铁剑，有反光高光 |
| (0,2) | 皮革 | 褐色方形皮革，有纹理褶皱 |
| (1,2) | 骨头 | 白色T形骨头 |
| (2,2) | 暗影材料 | 紫黑色结晶碎片，发光边缘 |
| (3,2) | 稀有木材 | 金色光泽的木材，有魔法纹路 |

**AI 提示词建议：**
> "Sprite sheet, 4 columns × 3 rows, 12 game items in Don't Starve art style. Hand-drawn look, thick black outlines, dark muted colors, transparent background PNG. Items from left to right, top to bottom: wood logs, flint stone, grass bundle, berries, stone axe, torch with flame, campfire with stones, iron sword, leather piece, bone, purple shadow crystal fragment glowing, rare golden wood. Each item in 128×128 cell, flat top-down view, slight cartoon exaggeration."

---

#### 2. 角色精灵集 `characters_sheet.png` (384×128)
> 3 个角色，每格 128×128，包含站立帧

| 位置 | 角色 | 设计要点 |
|---|---|---|
| (0,0) | 威尔逊(Wilson) | 黑色短发，白衬衫，黄色领带，友善面孔 |
| (1,0) | 薇洛(Willow) | 红色长发，绿色连衣裙，手持火柴 |
| (2,0) | 温蒂(Wendy) | 金色双马尾，黑白连衣裙，忧郁表情 |

**AI 提示词建议：**
> "Sprite sheet 3 characters in a row, 128×128 each, Don't Starve art style. Hand-drawn, thick black outlines, slightly gothic cartoon. Left: Wilson - young man with black hair, white shirt, yellow tie, holding a science tool. Middle: Willow - girl with red hair, green dress, holding a match. Right: Wendy - girl with blonde pigtails, black and white dress, sad expression. Transparent PNG background, standing pose, facing front."

---

#### 3. 怪物精灵集 `monsters_sheet.png` (384×128)
> 3 种怪物，每格 128×128

| 位置 | 怪物 | 设计要点 |
|---|---|---|
| (0,0) | 小鬼(Goblin) | 橙红色圆滚滚小鬼，大眼睛，尖牙 |
| (1,0) | 暗影生物(Shadow) | 紫黑色飘动生物，无脚，发光眼睛 |
| (2,0) | 树人卫士(TreeGuard) | 深绿色树人，木质外皮，愤怒面孔 |

**AI 提示词建议：**
> "Sprite sheet 3 monsters in a row, 128×128 each, Don't Starve art style. Hand-drawn, thick black outlines, dark gothic cartoon. Left: small orange-red goblin creature with big eyes and sharp teeth (cute but menacing). Middle: shadowy purple-black floating specter with glowing eyes and wispy body. Right: large dark green tree guardian with bark skin, angry face, branch arms. Transparent PNG background."

---

#### 4. 地形瓦片集 `tileset.png` (256×128)
> 4 种地形，每块 128×128，无缝可拼接

| 位置 | 地形 | 设计要点 |
|---|---|---|
| (0,0) | 草地 | 深绿色草地，略有杂草纹理 |
| (1,0) | 泥土 | 棕色土地，裂纹纹理 |

**AI 提示词建议：**
> "Tileset PNG 2 tiles side by side, 128×128 each, Don't Starve style top-down ground tiles. Seamless texture. Left: dark green grass tile with subtle grass blade texture. Right: brown dirt tile with crack texture. Thick black subtle border, hand-drawn look."

---

#### 5. 资源节点集 `resources_sheet.png` (512×128)
> 4 种可采集节点，每格 128×128

| 位置 | 节点 | 设计要点 |
|---|---|---|
| (0,0) | 树木 | 深绿色饥荒风格树，圆形树冠，棕色树干 |
| (1,0) | 岩石 | 三块不规则灰色石头堆叠 |
| (2,0) | 草丛 | 密集绿草，稍高于草地 |
| (3,0) | 浆果丛 | 圆形灌木，点缀橘红色浆果 |

**AI 提示词建议：**
> "Sprite sheet 4 resource nodes in a row, 128×128 each, Don't Starve style. Hand-drawn thick black outline. Left to right: 1) Dark green pine tree with round canopy, brown trunk, top-down 3/4 view. 2) Pile of 3 irregular gray rocks. 3) Dense tall grass clump, bright green. 4) Round bush shrub with orange-red berries scattered. Transparent PNG, slightly isometric top-down view."

---

### 单张图片

#### 6. 游戏 Logo `logo.png` (512×256)
> 标题文字 + 装饰

**AI 提示词建议：**
> "Game logo 'Don't Starve Chain' in Don't Starve art style. Scratchy hand-drawn gothic font, white text with thick black outline. Blockchain/chain element integrated as decorative motif around the text. Dark atmospheric background with faint moon and dead trees. Horizontal layout 512×256."

#### 7. 昼夜图标 `daynight_icons.png` (128×64)
> 两个图标：太阳（左）+ 月亮（右），各 64×64

**AI 提示词建议：**
> "Two small icons side by side 64×64 each, Don't Starve style. Left: stylized sun with rays, warm yellow/orange. Right: crescent moon, pale blue/white. Hand-drawn thick outline, transparent background."

---

## 使用方式（代码中引用）

在 `BootScene.js` 中预加载：
```javascript
// Sprite sheets
this.load.spritesheet('items',      '/assets/items_sheet.png',      { frameWidth: 128, frameHeight: 128 });
this.load.spritesheet('characters', '/assets/characters_sheet.png', { frameWidth: 128, frameHeight: 128 });
this.load.spritesheet('monsters',   '/assets/monsters_sheet.png',   { frameWidth: 128, frameHeight: 128 });
this.load.spritesheet('resources',  '/assets/resources_sheet.png',  { frameWidth: 128, frameHeight: 128 });
this.load.image('logo', '/assets/logo.png');
```

在代码中使用帧索引（0-based）：
```javascript
// 例：显示斧头图标（第 4 格，索引 4）
this.add.image(x, y, 'items', 4);

// 例：威尔逊角色（第 0 帧）
this.add.image(x, y, 'characters', 0);
```

---

## 优先级建议

| 优先级 | 资源 | 原因 |
|---|---|---|
| P0 | 角色集 + 怪物集 | 游戏主视觉，第一眼印象 |
| P0 | 资源节点集 | 主要交互对象 |
| P1 | 物品图标集 | 背包/合成界面必需 |
| P1 | 地形瓦片集 | 世界底图 |
| P2 | Logo | 菜单画面 |
| P2 | 昼夜图标 | HUD 小元素 |
