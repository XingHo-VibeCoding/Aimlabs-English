# pick_sprites.py v2 — 从 tilesheet 挑「完整物体」
# 改进：每个区域只保留最大连通块(LCC)，自动甩掉混入的邻居物件
# 输出到 assets/sprites/picked/，并生成核对联络表 _picked_review.png
import os
from PIL import Image, ImageDraw

SRC = r"D:\哭死\Stardew Valley\Content (unpacked)\Maps"
OUT = r"C:\Users\XIAODUYIHAO\Desktop\Vibe Coding\vibe-coding-workspace\assets\sprites\picked"
os.makedirs(OUT, exist_ok=True)

OUTDOORS = Image.open(os.path.join(SRC, "fall_outdoorsTileSheet.zh-CN.png")).convert("RGBA")
BEACH = Image.open(os.path.join(SRC, "fall_beach.zh-CN.png")).convert("RGBA")
GREEN = Image.open(os.path.join(SRC, "CarolineGreenhouseTiles.png")).convert("RGBA")

def keep_largest_component(img):
    """只保留 alpha 最大连通块，其余变透明（防混入邻居）"""
    w, h = img.size
    px = img.load()
    alpha = img.getchannel("A").tobytes()
    visited = bytearray(w * h)
    best = []
    for y in range(h):
        for x in range(w):
            i = y * w + x
            if alpha[i] and not visited[i]:
                cur = []
                stack = [(x, y)]
                visited[i] = 1
                while stack:
                    cx, cy = stack.pop()
                    cur.append((cx, cy))
                    for nx, ny in ((cx-1,cy),(cx+1,cy),(cx,cy-1),(cx,cy+1)):
                        if 0 <= nx < w and 0 <= ny < h:
                            j = ny * w + nx
                            if alpha[j] and not visited[j]:
                                visited[j] = 1
                                stack.append((nx, ny))
                if len(cur) > len(best):
                    best = cur
    keep = set(best)
    for y in range(h):
        for x in range(w):
            if (x, y) not in keep:
                px[x, y] = (0, 0, 0, 0)
    bbox = img.getchannel("A").getbbox()
    return img.crop(bbox) if bbox else img

# (输出名, 来源图, 像素区域, 是否过LCC[, 擦除区域列表(源坐标)][, 成品后擦除(输出坐标)])
PICKS = [
    # --- 树（2026-10-14 体检后 v6：红树根部两側的门/拱门/树冠残条多轮擦除）---
    ("tree_orange",  OUTDOORS, (0,   0,  48,  92), True),
    ("tree_purple",  OUTDOORS, (48,  0,  96,  92), True),
    ("tree_yellow",  OUTDOORS, (96,  0, 144, 104), True),
    # tree_pink / tree_pine 已改用 TerrainFeatures 整树源（pick_plants.py），此处不再覆盖
    ("tree_red",     OUTDOORS, (280, 0, 328, 106), True,
     [(276, 56, 298, 106), (324, 56, 336, 106), (296, 56, 304, 106), (319, 56, 326, 86)],
     [(39, 52, 44, 100)]),
    # --- 巫师塔（右侧 60 为界甩掉绿屋顶，底部 592 甩掉沙地）---
    ("tower_wizard", OUTDOORS, (0, 512, 60, 592), True),
    # --- 蓝顶大房（224-340 房体，592 截掉暗红树顶带，左侧擦掉栅栏桩）---
    ("house_blue",   OUTDOORS, (224, 512, 340, 590), True,
     [(224, 552, 232, 590)]),
    # --- 木栅栏（带门横栏一段）---
    ("fence_wood",   OUTDOORS, (32, 478, 104, 508), True),
    # --- 地面草块（16x16 瓦片不过 LCC）---
    ("grass_a",      OUTDOORS, (16,  144, 32, 160), False),
    ("grass_b",      OUTDOORS, (48,  160, 64, 176), False),
    ("grass_c",      OUTDOORS, (80,  144, 96, 160), False),
    # --- 海滩表：大灰岩石 + 小木船（96-140）+ 码头木板平台当桥 ---
    ("rock_big",     BEACH, (192, 160, 240, 208), True),
    ("boat_row",     BEACH, (96, 272, 130, 304), True),
    ("bridge_wood",  BEACH, (136, 256, 176, 296), True),
    # --- 温室植物表（46-88 单株盆栽，擦掉左上橙砖/左下白盘/右侧花枝，63 截货架）---
    ("flower_box",   GREEN, (0,   32, 48, 64), True),
    ("plant_pot_big",   GREEN, (46, 14, 88, 63), True,
     [(46, 14, 52, 30), (46, 48, 56, 63), (84, 38, 88, 63), (80, 50, 88, 63)]),
    ("plant_pot_small", GREEN, (96, 208, 128, 240), False),
    ("tree_pot",     GREEN, (0, 128, 48, 192), True),
]

results = []
for item in PICKS:
    name, img, box, use_lcc = item[:4]
    erase = item[4] if len(item) > 4 else []
    post_erase = item[5] if len(item) > 5 else []
    part = img.crop(box)
    # 先在源坐标里擦除指定区域（防粘连物通过根/边接进主体）
    if erase:
        px = part.load()
        ox, oy = box[0], box[1]
        for ex0, ey0, ex1, ey1 in erase:
            for yy in range(max(0, ey0 - oy), min(part.size[1], ey1 - oy)):
                for xx in range(max(0, ex0 - ox), min(part.size[0], ex1 - ox)):
                    px[xx, yy] = (0, 0, 0, 0)
    if use_lcc:
        part = keep_largest_component(part)
    else:
        bbox = part.getchannel("A").getbbox()
        if bbox:
            part = part.crop(bbox)
    # 成品坐标后擦除（对付 LCC 之后仍粘连的细条）
    if post_erase:
        px = part.load()
        for ex0, ey0, ex1, ey1 in post_erase:
            for yy in range(max(0, ey0), min(part.size[1], ey1)):
                for xx in range(max(0, ex0), min(part.size[0], ex1)):
                    px[xx, yy] = (0, 0, 0, 0)
        bbox = part.getchannel("A").getbbox()
        if bbox:
            part = part.crop(bbox)
    part.save(os.path.join(OUT, name + ".png"))
    results.append((name, part.size))

# --- 核对联络表 ---
Z = 3
cols = 5
cw = max(r[1][0] for r in results) * Z + 20
ch = max(r[1][1] for r in results) * Z + 30
rows = (len(results) + cols - 1) // cols
sheet = Image.new("RGBA", (cols * cw, rows * ch), (210, 210, 210, 255))
d = ImageDraw.Draw(sheet)
for i, (name, size) in enumerate(results):
    im = Image.open(os.path.join(OUT, name + ".png"))
    big = im.resize((size[0] * Z, size[1] * Z), Image.NEAREST)
    x = (i % cols) * cw + 10
    y = (i // cols) * ch + 10
    sheet.paste(big, (x, y), big)
    d.text((x, y + size[1] * Z + 4), f"{name} {size[0]}x{size[1]}", fill=(0, 0, 0, 255))
sheet.save(os.path.join(OUT, "_picked_review.png"))
print(f"挑出 {len(results)} 个素材")
for n, s in results:
    print(f"  {n}: {s[0]}x{s[1]}")
