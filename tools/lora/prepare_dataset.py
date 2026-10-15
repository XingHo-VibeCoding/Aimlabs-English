# -*- coding: utf-8 -*-
"""
WordWorld LoRA 训练数据集准备脚本
--------------------------------------------------
作用：从已切割的星露谷风格素材里挑出代表作，预处理成 SD1.5 能吃的训练图。

关键设计（为什么这么做）：
1. SD1.5 不认识透明通道 -> 一律合成到纯白底 512x512 画布
2. 像素画必须用 NEAREST 整数倍放大，否则双线性插值会把「大像素块」糊成噪点，
   模型就学不到像素风该有的锐利边缘
3. 每张图配一句英文标注（caption），触发词统一用 wdpxl

输出：
  G:\\wordworld-lora\\datasets\\wordworld_40\\img\\NN_name.png  + 同名 .txt
  G:\\wordworld-lora\\datasets\\wordworld_40\\_review_sheet.png  (人工核对用)
  G:\\wordworld-lora\\datasets\\wordworld_40\\meta.json          (清单存档)
"""
import os
import json
from PIL import Image

SRC = r"C:\Users\XIAODUYIHAO\Desktop\Vibe Coding\vibe-coding-workspace\assets\sprites"
DST = r"G:\wordworld-lora\datasets\wordworld_40"
IMGDIR = os.path.join(DST, "img")

CANVAS = 512          # SD1.5 原生分辨率
TARGET_LONG = 340     # 物体最长边目标像素
MIN_LONG = 256        # 放大后若小于这个值，再翻一倍，别让物体太小
BG = (255, 255, 255, 255)
TRIGGER = "wdpxl"

# ---------------------------------------------------------------
# 训练素材清单
#   ("animal", 目录名, 英文描述)          -> 从 row0 四帧里自动挑最好的一帧
#   ("file",   相对路径, 英文描述)        -> 直接取文件
# ---------------------------------------------------------------
ITEMS = [
    # ---- 动物 12 ----
    ("animal", "Blue_Chicken",       "a blue chicken"),
    ("animal", "Brown_Chicken",      "a brown chicken"),
    ("animal", "BabyBlue_Chicken",   "a tiny blue baby chicken"),
    ("animal", "BabyPig",            "a pink baby pig"),
    ("animal", "BabySheep",          "a fluffy white baby sheep"),
    ("animal", "BabyGoat",           "a small baby goat"),
    ("animal", "BabyOstrich",        "a baby ostrich"),
    ("animal", "BabyRabbit",         "a white baby rabbit"),
    ("animal", "Brown_Cow",          "a brown and white cow"),
    ("animal", "Dinosaur",           "a green dinosaur"),
    ("animal", "cat",                "an orange tabby cat"),
    ("animal", "dog",                "a golden retriever dog"),

    # ---- 建筑 6 ----
    ("file", "buildings/barn/barn.png",                   "a red wooden barn"),
    ("file", "buildings/beach_cabin/v1.png",              "a small wooden cabin"),
    ("file", "buildings/rustic_cabin/v1.png",             "a rustic log cabin"),
    ("file", "buildings/greenhouse/fixed.png",            "a glass greenhouse"),
    ("file", "buildings/shed/shed.png",                   "a small wooden shed"),
    ("file", "buildings/gold_clock/gold_clock.png",       "a golden clock monument"),

    # ---- 树木植物 18 ----
    ("file", "picked/tree_oak_green.png",     "a green oak tree"),
    ("file", "picked/tree_oak_orange.png",    "an orange autumn tree"),
    ("file", "picked/tree_oak_snow.png",      "a snow covered tree"),
    ("file", "picked/tree_pine.png",          "a green pine tree"),
    ("file", "picked/tree_pine_snow.png",     "a snowy pine tree"),
    ("file", "picked/tree_palm.png",          "a palm tree"),
    ("file", "picked/tree_mushroom.png",      "a giant mushroom tree"),
    ("file", "picked/tree_mystic.png",        "a glowing blue mystic tree"),
    ("file", "picked/tree_pink.png",          "a pink blossom tree"),
    ("file", "picked/bush_green.png",         "a green bush"),
    ("file", "picked/bush_berry.png",         "a berry bush"),
    ("file", "picked/grass_tuft_green.png",   "a tuft of green grass"),
    ("file", "picked/grass_tuft_orange.png",  "a tuft of dry grass"),
    ("file", "picked/flower_box.png",         "a wooden planter box of flowers"),
    ("file", "picked/plant_pot_big.png",      "a potted plant"),
    ("file", "picked/plant_pot_small.png",    "a small potted plant"),
    ("file", "picked/cave_mushroom_pink.png", "a pink mushroom"),
    ("file", "picked/mushroom_red_small.png", "a small red mushroom"),

    # ---- 物件 12 ----
    ("file", "picked/rock_stone_big.png",   "a large grey rock"),
    ("file", "picked/rock_stone_small.png", "a small grey stone"),
    ("file", "picked/rock_big.png",         "a grey boulder"),
    ("file", "picked/rock_frost.png",       "a blue crystal stalagmite"),
    ("file", "picked/rock_lava.png",        "a glowing lava rock"),
    ("file", "picked/fence_wood.png",       "a wooden fence"),
    ("file", "picked/boat_row.png",         "a small wooden rowboat"),
    ("file", "picked/bridge_wood.png",      "a wooden dock platform"),
    ("file", "picked/table_round.png",      "a round wooden table"),
    ("file", "picked/chair_wood.png",       "a wooden chair"),
    ("file", "picked/bed_red.png",          "a bed with a red blanket"),
    ("file", "picked/bench_love.png",       "a wooden bench"),
]


def pick_animal_frame(d):
    """row0 的 4 帧里挑不透明像素最多的（姿态最完整）"""
    best, best_n = None, -1
    for c in range(4):
        p = os.path.join(d, "r00_c%02d.png" % c)
        if not os.path.exists(p):
            continue
        im = Image.open(p).convert("RGBA")
        n = sum(1 for px in im.getdata() if px[3] > 0)
        if n > best_n:
            best, best_n = im, n
    return best


def prep(im):
    """裁剪 -> 整数倍 NEAREST 放大 -> 居中贴到白底画布"""
    im = im.convert("RGBA")
    bbox = im.getchannel("A").getbbox()
    if bbox:
        im = im.crop(bbox)
    w, h = im.size
    if w == 0 or h == 0:
        return None, None
    scale = max(1, int(TARGET_LONG / max(w, h)))
    if max(w, h) * scale < MIN_LONG:
        scale += 1
    # 别超出画布
    while max(w, h) * scale > CANVAS and scale > 1:
        scale -= 1
    nw, nh = w * scale, h * scale
    im = im.resize((nw, nh), Image.NEAREST)
    canvas = Image.new("RGBA", (CANVAS, CANVAS), BG)
    canvas.alpha_composite(im, ((CANVAS - nw) // 2, (CANVAS - nh) // 2))
    return canvas.convert("RGB"), scale


def main():
    os.makedirs(IMGDIR, exist_ok=True)
    meta = []
    ok = 0
    for i, (kind, ref, desc) in enumerate(ITEMS, 1):
        if kind == "animal":
            src_path = os.path.join(SRC, "animals", ref)
            im = pick_animal_frame(src_path)
            if im is None:
                print("  [跳过] 动物目录没有可用帧:", ref)
                continue
            srcname = "animals/%s" % ref
        else:
            src_path = os.path.join(SRC, ref)
            if not os.path.exists(src_path):
                print("  [跳过] 文件不存在:", ref)
                continue
            im = Image.open(src_path)
            srcname = ref

        out, scale = prep(im)
        if out is None:
            print("  [跳过] 空图:", ref)
            continue

        name = "%02d_%s" % (i, os.path.splitext(os.path.basename(ref))[0])
        out.save(os.path.join(IMGDIR, name + ".png"))
        caption = "%s pixel art game sprite, %s, plain white background" % (TRIGGER, desc)
        with open(os.path.join(IMGDIR, name + ".txt"), "w", encoding="utf-8") as f:
            f.write(caption)
        meta.append({"file": name + ".png", "source": srcname, "desc": desc,
                     "caption": caption, "scale": scale, "out_size": CANVAS})
        ok += 1
        print("  [%02d] %-30s x%-3d  %s" % (ok, name, scale, desc))

    # 核对联络表：8 列缩略图
    files = sorted(f for f in os.listdir(IMGDIR) if f.endswith(".png"))
    cols = 8
    rows = (len(files) + cols - 1) // cols
    TH = 128
    sheet = Image.new("RGB", (cols * TH, rows * TH), (40, 44, 52))
    for k, f in enumerate(files):
        t = Image.open(os.path.join(IMGDIR, f)).resize((TH, TH), Image.LANCZOS)
        sheet.paste(t, ((k % cols) * TH, (k // cols) * TH))
    sheet.save(os.path.join(DST, "_review_sheet.png"))

    with open(os.path.join(DST, "meta.json"), "w", encoding="utf-8") as f:
        json.dump({"trigger": TRIGGER, "canvas": CANVAS, "items": meta}, f,
                  ensure_ascii=False, indent=2)

    print("\n完成：%d 张训练图 -> %s" % (ok, IMGDIR))


if __name__ == "__main__":
    main()
