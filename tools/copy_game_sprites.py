# copy_game_sprites.py — 把游戏用到的素材从 assets/sprites 复制到 public/sprites
# public/ 是 Vite 静态目录，开发/构建都从这里出图；public/sprites 已 gitignore（版权红线）
import os, shutil

SRC = r"C:\Users\XIAODUYIHAO\Desktop\Vibe Coding\vibe-coding-workspace\assets\sprites"
DST = r"C:\Users\XIAODUYIHAO\Desktop\Vibe Coding\vibe-coding-workspace\public\sprites"

# 游戏注册的 24 个动物变体文件夹
ANIMALS = [
    "cat", "cat1", "cat2", "cat3", "cat4", "cat5",
    "dog", "dog1", "dog2", "dog3", "dog4", "dog5",
    "BabyRabbit", "Dinosaur",
    "Brown_Chicken", "Blue_Chicken",
    "BabyBrown_Chicken", "BabyBlue_Chicken", "BabyWhite_Chicken",
    "BabyGolden_Chicken", "BabyVoid_Chicken",
    "Brown_Cow", "BabyBrown_Cow", "BabyWhite_Cow",
    "BabyPig", "BabySheep", "BabyGoat", "BabyOstrich",
]

count = 0

def cp(src_rel, dst_rel):
    global count
    s = os.path.join(SRC, src_rel)
    d = os.path.join(DST, dst_rel)
    os.makedirs(os.path.dirname(d), exist_ok=True)
    shutil.copy2(s, d)
    count += 1

# 1. 动物帧（整文件夹）
for name in ANIMALS:
    src_dir = os.path.join(SRC, "animals", name)
    if not os.path.isdir(src_dir):
        print(f"!! 缺失动物文件夹: {name}")
        continue
    for f in os.listdir(src_dir):
        if f.endswith(".png"):
            cp(f"animals/{name}/{f}", f"animals/{name}/{f}")

# 2. 建筑（6 组全部）
for root, _, files in os.walk(os.path.join(SRC, "buildings")):
    for f in files:
        if f.endswith(".png"):
            rel = os.path.relpath(os.path.join(root, f), SRC)
            cp(rel, rel)

# 3. 挑出的完整物体（19 个，不含核对表）
for f in os.listdir(os.path.join(SRC, "picked")):
    if f.endswith(".png") and not f.startswith("_"):
        cp(f"picked/{f}", f"picked/{f}")

# 4. 海洋生物（全部 182 个）
for f in os.listdir(os.path.join(SRC, "aquarium")):
    if f.endswith(".png"):
        cp(f"aquarium/{f}", f"aquarium/{f}")

# 5. 主角 Abigail：只要走姿三朝向（r00~r02），左=镜像右，代码里翻转
for f in os.listdir(os.path.join(SRC, "player")):
    if f.startswith(("r00_", "r01_", "r02_")) and f.endswith(".png"):
        cp(f"player/{f}", f"player/{f}")

print(f"复制完成: {count} 个文件 → public/sprites")
