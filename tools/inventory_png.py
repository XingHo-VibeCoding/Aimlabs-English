# inventory_png.py — 只读盘点：读取 PNG 头(IHDR)拿尺寸/位深/是否透明，不依赖第三方库
import struct, sys, os, json

FILES = [
    r"D:\哭死\Stardew Valley\Content (unpacked)\LooseSprites\AquariumFish.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Animals\BabyBlue Chicken.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Animals\BabyBrown Chicken.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Animals\BabyBrown Cow.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Animals\BabyGoat.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Animals\BabyGolden Chicken.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Animals\BabyOstrich.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Animals\BabyPig.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Animals\BabyRabbit.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Animals\BabySheep.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Animals\BabyVoid Chicken.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Animals\BabyWhite Chicken.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Animals\BabyWhite Cow.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Animals\Blue Chicken.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Animals\Brown Chicken.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Animals\Brown Cow.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Animals\cat.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Animals\cat1.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Animals\cat2.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Animals\cat3.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Animals\cat4.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Animals\cat5.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Animals\Dinosaur.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Animals\dog.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Animals\dog1.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Animals\dog2.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Animals\dog3.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Animals\dog4.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Animals\dog5.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Buildings\Greenhouse.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Buildings\Barn.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Buildings\Beach Cabin.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Buildings\Gold Clock.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Buildings\Rustic Cabin.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Buildings\Shed.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Maps\CarolineGreenhouseTiles.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Maps\fall_beach.zh-CN.png",
    r"D:\哭死\Stardew Valley\Content (unpacked)\Maps\fall_outdoorsTileSheet.zh-CN.png",
]

COLOR_TYPES = {0: "灰度", 2: "RGB无透明", 3: "索引色", 4: "灰度+透明", 6: "RGBA透明"}

def png_info(path):
    with open(path, "rb") as f:
        sig = f.read(8)
        if sig != b"\x89PNG\r\n\x1a\n":
            return None
        length, ctype = struct.unpack(">I4s", f.read(8))
        if ctype != b"IHDR":
            return None
        data = f.read(length)
        w, h, bitdepth, colortype = struct.unpack(">IIBB", data[:10])
        return w, h, bitdepth, COLOR_TYPES.get(colortype, f"类型{colortype}")

rows = []
for p in FILES:
    name = os.path.basename(p)
    if not os.path.exists(p):
        rows.append((name, "文件不存在", "", "", ""))
        continue
    info = png_info(p)
    kb = os.path.getsize(p) // 1024
    if info:
        w, h, bd, ct = info
        rows.append((name, f"{w}x{h}", ct, f"{bd}bit", f"{kb}KB"))

print(f"{'文件':<38}{'尺寸':<12}{'色彩':<12}{'位深':<7}{'大小'}")
for r in rows:
    print(f"{r[0]:<38}{r[1]:<12}{r[2]:<12}{r[3]:<7}{r[4]}")
