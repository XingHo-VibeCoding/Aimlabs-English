# pick_plants.py — 挑选第二批素材：树木/钟乳石/灌木/草丛/洞穴植物/家具
# 方法：宽松框粗切 + 最大连通块过滤（甩掉混入的邻居）
import os
import numpy as np
from PIL import Image

SRC = r"D:\哭死\Stardew Valley\Content (unpacked)"
OUT = r"C:\Users\XIAODUYIHAO\Desktop\Vibe Coding\vibe-coding-workspace\assets\sprites\picked"

T = lambda f: os.path.join(SRC, "TerrainFeatures", f)
S = lambda f: os.path.join(SRC, "TileSheets", f)
FUR = S("furniture.zh-CN.png")

# (输出名, 源路径, (x0,y0,x1,y1) 像素)
PICKS = [
    # --- 树（每种树的完整大树都在左上 48x96 区域）---
    ("tree_oak_green",   T("tree1_spring.png"), (0, 0, 48, 96)),
    ("tree_oak_orange",  T("tree1_fall.png"),   (0, 0, 48, 96)),
    ("tree_oak_snow",    T("tree1_winter.png"), (0, 0, 48, 96)),
    ("tree_lush_green",  T("tree2_spring.png"), (0, 0, 48, 96)),
    ("tree_lush_orange", T("tree2_fall.png"),   (0, 0, 48, 96)),
    ("tree_pink",        T("tree3_fall.png"),   (0, 0, 48, 96)),
    ("tree_pine",        T("tree8_spring.png"), (0, 0, 48, 96)),
    ("tree_pine_snow",   T("tree8_winter.png"), (0, 0, 48, 96)),
    ("tree_palm",        T("tree_palm.png"),    (0, 0, 48, 96)),
    ("tree_mushroom",    T("mushroom_tree.png"),(0, 0, 48, 96)),
    ("tree_mystic",      T("mystic_tree.png"),  (0, 0, 48, 96)),
    # --- 钟乳石 → rock 的变体 ---
    ("rock_stone_big",   T("Stalagmite.png"),        (0, 0, 48, 140)),
    ("rock_stone_small", T("Stalagmite.png"),        (0, 188, 48, 244)),
    ("rock_frost",       T("Stalagmite_Frost.png"),  (0, 0, 48, 140)),
    ("rock_lava",        T("Stalagmite_Lava.png"),   (0, 0, 48, 140)),
    # --- 灌木 ---
    ("bush_green", S("bushes.png"), (0, 0, 32, 48)),
    ("bush_berry", S("bushes.png"), (32, 0, 64, 48)),
    ("bush_orange", S("bushes.png"), (0, 32, 32, 80)),
    ("bush_blue", S("bushes.png"), (32, 32, 64, 80)),
    # --- 草丛 ---
    ("grass_tuft_green",  T("grass.png"), (0, 0, 32, 48)),
    ("grass_tuft_orange", T("grass.png"), (0, 48, 32, 96)),
    ("grass_tuft_purple", T("grass.png"), (0, 192, 32, 240)),
    # --- 洞穴小植物（含蘑菇）---
    ("cave_fern",            T("upperCavePlants.png"), (0, 0, 16, 24)),
    ("cave_mushroom_pink",   T("upperCavePlants.png"), (96, 0, 112, 24)),
    ("cave_mushroom_brown",  T("upperCavePlants.png"), (112, 0, 128, 24)),
    ("cave_mushroom_yellow", T("upperCavePlants.png"), (128, 0, 144, 24)),
    ("mushroom_red_small",   T("mushroom_tree.png"),   (0, 96, 32, 128)),
    # --- 家具（替代旧几何桌椅床长椅）---
    ("chair_wood",   FUR, (0, 0, 32, 32)),
    ("table_round",  FUR, (272, 544, 320, 608)),
    ("bed_red",      FUR, (112, 416, 176, 488)),
    ("bench_love",   FUR, (384, 64, 448, 96)),
]


def largest_component(img):
    """只保留最大连通块（含对角相邻），甩掉混入的小邻居"""
    a = np.array(img)
    mask = a[..., 3] > 0
    h, w = mask.shape
    label = np.zeros((h, w), dtype=np.int32)
    best, best_n = 0, 0
    cur = 0
    for y in range(h):
        for x in range(w):
            if mask[y, x] and label[y, x] == 0:
                cur += 1
                stack = [(y, x)]
                label[y, x] = cur
                n = 0
                while stack:
                    cy, cx = stack.pop()
                    n += 1
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and label[ny, nx] == 0:
                                label[ny, nx] = cur
                                stack.append((ny, nx))
                if n > best_n:
                    best_n, best = n, cur
    keep = label == best
    ys, xs = np.where(keep)
    if len(ys) == 0:
        return img
    return img.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


results = []
for name, src, box in PICKS:
    img = Image.open(src).convert("RGBA").crop(box)
    img = largest_component(img)
    img.save(os.path.join(OUT, f"{name}.png"))
    results.append((name, img.size))

# 核对表：全部挑出的素材放大 2 倍排一起
Z = 2
cols = 6
cell_w = max(w for _, (w, _) in results) * Z + 8
cell_h = max(h for _, (_, h) in results) * Z + 8
rows_n = (len(results) + cols - 1) // cols
sheet = Image.new("RGBA", (cols * cell_w, rows_n * cell_h + 14), (80, 80, 90, 255))
from PIL import ImageDraw
d = ImageDraw.Draw(sheet)
for i, (name, (w, h)) in enumerate(results):
    r, c = divmod(i, cols)
    img = Image.open(os.path.join(OUT, f"{name}.png")).resize((w * Z, h * Z), Image.NEAREST)
    sheet.paste(img, (c * cell_w + 4, r * cell_h + 4), img)
    d.text((c * cell_w + 4, (r + 1) * cell_h - 2), name, fill=(255, 255, 255, 255))
sheet.save(os.path.join(OUT, "_picked_review2.png"))
print(f"挑出 {len(results)} 个 → {OUT}")
for name, (w, h) in results:
    print(f"  {name}: {w}x{h}")
