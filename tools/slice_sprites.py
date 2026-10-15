# slice_sprites.py — 星露谷素材切割器
# 输入：D 盘解包 PNG（只读，不动原图）
# 输出：vibe-coding-workspace/assets/sprites/ 下的分类小图 + manifest.json
# 四种切法：网格切帧（动物）/ 连通域检测（海洋生物）/ 区域切（建筑）/ 瓦片切（场景）

import os, json
from PIL import Image

SRC = r"D:\哭死\Stardew Valley\Content (unpacked)"
OUT = r"C:\Users\XIAODUYIHAO\Desktop\Vibe Coding\vibe-coding-workspace\assets\sprites"

manifest = {"categories": {}, "source": SRC, "note": "星露谷解包素材，仅本地占位/LoRA训练用，已 gitignore"}

def save(img, relpath):
    p = os.path.join(OUT, relpath)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    img.save(p)
    return relpath

def is_blank(cell):
    """整格全透明 = 空格，跳过（alpha 通道无内容即空）"""
    return cell.getchannel("A").getbbox() is None

# ---------- 1. 动物：网格切帧 ----------
def slice_grid(src_rel, cell, out_dir, prefix):
    img = Image.open(os.path.join(SRC, src_rel)).convert("RGBA")
    w, h = img.size
    cw, ch = cell
    cols, rows = w // cw, h // ch
    count = 0
    for r in range(rows):
        for c in range(cols):
            frame = img.crop((c*cw, r*ch, (c+1)*cw, (r+1)*ch))
            if is_blank(frame):
                continue
            save(frame, f"{out_dir}/r{r:02d}_c{c:02d}.png")
            count += 1
    return {"grid": f"{cols}x{rows}", "cell": f"{cw}x{ch}", "frames": count}

ANIMALS_16 = [  # 16x16 小体格
    "BabyBlue Chicken", "BabyBrown Chicken", "BabyVoid Chicken",
    "BabyGolden Chicken", "BabyWhite Chicken", "BabyRabbit", "Dinosaur",
    "Blue Chicken", "Brown Chicken",
]
ANIMALS_32 = [  # 32x32 大体格
    "BabyBrown Cow", "BabyWhite Cow", "BabyGoat", "BabyOstrich",
    "BabyPig", "BabySheep", "Brown Cow",
    "cat", "cat1", "cat2", "cat3", "cat4", "cat5",
    "dog", "dog1", "dog2", "dog3", "dog4", "dog5",
]

for name in ANIMALS_16:
    safe = name.replace(" ", "_")
    manifest["categories"].setdefault("animals", {})[safe] = \
        slice_grid(f"Animals/{name}.png", (16, 16), f"animals/{safe}", safe)

for name in ANIMALS_32:
    safe = name.replace(" ", "_")
    manifest["categories"].setdefault("animals", {})[safe] = \
        slice_grid(f"Animals/{name}.png", (32, 32), f"animals/{safe}", safe)

# ---------- 2. 海洋生物：连通域检测 ----------
def slice_components(src_rel, out_dir, min_pixels=8):
    img = Image.open(os.path.join(SRC, src_rel)).convert("RGBA")
    w, h = img.size
    alpha = img.getchannel("A").tobytes()  # 一维字节串，alpha[y*w+x]
    visited = bytearray(w * h)
    boxes = []
    for y in range(h):
        for x in range(w):
            i = y * w + x
            if alpha[i] and not visited[i]:
                stack = [(x, y)]
                visited[i] = 1
                minx = maxx = x
                miny = maxy = y
                n = 0
                while stack:
                    cx, cy = stack.pop()
                    n += 1
                    minx = min(minx, cx); maxx = max(maxx, cx)
                    miny = min(miny, cy); maxy = max(maxy, cy)
                    for nx, ny in ((cx-1,cy),(cx+1,cy),(cx,cy-1),(cx,cy+1)):  # 4连通
                        if 0 <= nx < w and 0 <= ny < h:
                            j = ny * w + nx
                            if alpha[j] and not visited[j]:
                                visited[j] = 1
                                stack.append((nx, ny))
                boxes.append((minx, miny, maxx+1, maxy+1, n))
    boxes = [b for b in boxes if b[4] >= min_pixels]
    boxes.sort(key=lambda b: (b[1] // 16, b[0]))  # 按视觉位置排序：先行后列
    count = 0
    for i, (x0, y0, x1, y1, n) in enumerate(boxes):
        item = img.crop((x0, y0, x1, y1))
        save(item, f"{out_dir}/fish_{i:03d}.png")
        count += 1
    return {"items": count, "method": "connected-components"}

manifest["categories"]["aquarium"] = slice_components("LooseSprites/AquariumFish.png", "aquarium")

# ---------- 3. 建筑：区域切 ----------
def slice_regions(src_rel, regions, out_dir):
    img = Image.open(os.path.join(SRC, src_rel)).convert("RGBA")
    results = {}
    for rname, box in regions.items():
        part = img.crop(box)
        save(part, f"{out_dir}/{rname}.png")
        results[rname] = f"{box[2]-box[0]}x{box[3]-box[1]}"
    return results

b = manifest["categories"].setdefault("buildings", {})
# Beach Cabin / Rustic Cabin：横向 3 个变体，每个 80 宽
for src_name, out_name in [("Beach Cabin", "beach_cabin"), ("Rustic Cabin", "rustic_cabin")]:
    b[out_name] = slice_regions(f"Buildings/{src_name}.png", {
        "v1": (0, 0, 80, 112), "v2": (80, 0, 160, 112), "v3": (160, 0, 240, 112),
    }, f"buildings/{out_name}")
# Greenhouse：左半 120 宽，上=破损 下=修复
b["greenhouse"] = slice_regions("Buildings/Greenhouse.png", {
    "broken": (0, 0, 120, 160), "fixed": (0, 160, 120, 320),
}, "buildings/greenhouse")
# 单图建筑：整图收
for src_name, out_name in [("Barn", "barn"), ("Shed", "shed"), ("Gold Clock", "gold_clock")]:
    img = Image.open(os.path.join(SRC, f"Buildings/{src_name}.png")).convert("RGBA")
    save(img, f"buildings/{out_name}/{out_name}.png")
    b[out_name] = {"full": f"{img.size[0]}x{img.size[1]}"}

# ---------- 4. 瓦片：16px 网格切 ----------
def slice_tiles(src_rel, out_dir):
    img = Image.open(os.path.join(SRC, src_rel)).convert("RGBA")
    w, h = img.size
    cols, rows = w // 16, h // 16
    count = 0
    for r in range(rows):
        for c in range(cols):
            t = img.crop((c*16, r*16, (c+1)*16, (r+1)*16))
            if is_blank(t):
                continue
            save(t, f"{out_dir}/tile_r{r:02d}_c{c:02d}.png")
            count += 1
    return {"grid": f"{cols}x{rows}", "tiles": count}

t = manifest["categories"].setdefault("tiles", {})
t["greenhouse_plants"] = slice_tiles("Maps/CarolineGreenhouseTiles.png", "tiles/plants")
t["fall_beach"] = slice_tiles("Maps/fall_beach.zh-CN.png", "tiles/beach")
t["fall_outdoors"] = slice_tiles("Maps/fall_outdoorsTileSheet.zh-CN.png", "tiles/outdoors")

# ---------- 写 manifest ----------
os.makedirs(OUT, exist_ok=True)
with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)

# ---------- 汇总打印 ----------
total = 0
print("== 切割完成汇总 ==")
for cat, data in manifest["categories"].items():
    if cat == "animals":
        n = sum(v["frames"] for v in data.values())
        print(f"animals    : {len(data)} 种动物, {n} 帧")
        total += n
    elif cat == "aquarium":
        print(f"aquarium   : {data['items']} 个海洋生物")
        total += data["items"]
    elif cat == "buildings":
        n = sum(len(v) for v in data.values())
        print(f"buildings  : {len(data)} 组建筑, {n} 张")
        total += n
    elif cat == "tiles":
        n = sum(v["tiles"] for v in data.values())
        print(f"tiles      : {len(data)} 张表, {n} 块瓦片")
        total += n
print(f"总计产出: {total} 张 PNG + manifest.json")
