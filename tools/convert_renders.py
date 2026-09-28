import json, os, sys
from PIL import Image, ImageFilter
src = sys.argv[1]; dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'render')
os.makedirs(dst, exist_ok=True)
for n in ['hero', 'package', 'try', 'contact']:
    im = Image.open(f'{src}/{n}.png').convert('RGBA')
    im.save(f'{dst}/{n}.webp', quality=86, method=6)
    d = Image.open(f'{src}/{n}-depth-0001.png')
    d = d.point(lambda v: v * (255 / 65535)).convert('L').resize((1280, 800), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.2))
    d.save(f'{dst}/{n}-depth.jpg', quality=90)
    print(n, os.path.getsize(f'{dst}/{n}.webp') // 1024, 'KB')
meta = json.load(open(f'{src}/shots.json'))
json.dump(meta, open(f'{dst}/shots.json', 'w'))
