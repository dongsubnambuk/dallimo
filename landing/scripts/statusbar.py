# 캡처에 iOS 상태 표시줄(9:41 · 신호 · Wi-Fi · 배터리)과 홈 막대를 그리고 public/screens에 780px · 480px webp로 저장한다.
# 사용: python3 scripts/statusbar.py <캡처 폴더> explore:explore course:course ...  (캡처 이름:저장 이름)
#       python3 scripts/statusbar.py --full <저장 폴더> <캡처 폴더> explore:explore ...  (원본 크기)
import os
import sys
from PIL import Image, ImageDraw, ImageFont
S = 3  # 픽셀 / pt
ROOT = os.path.join(os.path.dirname(__file__), '..')
FONT = ImageFont.truetype(os.path.join(ROOT, '../frontend/assets/fonts/pretendard/Pretendard-Bold.otf'), int(17 * S))

def lum(img, box):
    r = img.crop(box).convert('L').resize((1, 1)).getpixel((0, 0))
    return r / 255

def status_bar(img):
    d = ImageDraw.Draw(img)
    light_bg = lum(img, (0, 0, 120 * S, 55 * S)) > 0.5
    c = (0, 0, 0) if light_bg else (255, 255, 255)
    cy = 31 * S  # 상태 표시줄 세로 중심 (Dynamic Island 높이에 맞춤)
    # 시간
    t = '9:41'
    w = d.textlength(t, font=FONT)
    d.text((64 * S - w / 2, cy), t, font=FONT, fill=c, anchor='lm')
    # 셀룰러 막대
    x = 296 * S
    for i, h in enumerate([4, 6.3, 8.6, 11]):
        bx = x + i * 4.6 * S
        d.rounded_rectangle((bx, cy + 5.5 * S - h * S, bx + 3 * S, cy + 5.5 * S), radius=0.8 * S, fill=c)
    # 와이파이: 부채꼴 세 겹
    wx, wy = 327 * S, cy + 5.5 * S
    for r, wdt in [(11.5, 2.6), (7.6, 2.6)]:
        d.arc((wx - r * S, wy - r * S, wx + r * S, wy + r * S), 225, 315, fill=c, width=int(wdt * S))
    d.pieslice((wx - 3.6 * S, wy - 3.6 * S, wx + 3.6 * S, wy + 3.6 * S), 225, 315, fill=c)
    # 배터리
    bx, by, bw, bh = 345 * S, cy - 6.5 * S, 25 * S, 13 * S
    d.rounded_rectangle((bx, by, bx + bw, by + bh), radius=4 * S, outline=c, width=int(1.1 * S))
    d.rounded_rectangle((bx + 2 * S, by + 2 * S, bx + bw - 2 * S, by + bh - 2 * S), radius=2.5 * S, fill=c)
    d.rounded_rectangle((bx + bw + 1.3 * S, by + 4.3 * S, bx + bw + 2.8 * S, by + bh - 4.3 * S), radius=1 * S, fill=c)

def home_indicator(img):
    W, H = img.size
    d = ImageDraw.Draw(img)
    light_bg = lum(img, (0, H - 30 * S, W, H)) > 0.5
    c = (0, 0, 0) if light_bg else (255, 255, 255)
    w, h = 134 * S, 5 * S
    x, y = (W - w) / 2, H - 8 * S - h
    d.rounded_rectangle((x, y, x + w, y + h), radius=h / 2, fill=c)

# --full <저장 폴더>: 줄이지 않은 원본 크기(1179×2556)로 한 장씩 저장한다 (App Store 스크린샷용, promo/README.md)
args = sys.argv[1:]
full_out = None
if args[0] == '--full':
    full_out, args = args[1], args[2:]

for src, dst in [a.split(':') for a in args[1:]]:
    im = Image.open(f'{args[0]}/{src}.png').convert('RGB')
    status_bar(im)
    home_indicator(im)
    if full_out:
        im.save(os.path.join(full_out, f'{dst}.webp'), 'WEBP', quality=92, method=6)
    else:
        for w, suffix in [(780, ''), (480, '-480')]:
            out = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
            out.save(os.path.join(ROOT, f'public/screens/{dst}{suffix}.webp'), 'WEBP', quality=88, method=6)
    print(dst)
