# 앱 아이콘 · 스플래시 · 파비콘 SVG를 심볼 geometry(src/components/Brand/brandGeometry.ts)에서 만든다.
# 실행: cd frontend/scripts/brand && python3 brand_assets.py && node render.js "$(cat jobs.json)"
#       (render.js는 Playwright Chromium으로 PNG를 그린다) → out/*.png를 assets/images로 복사.
#       icon.png · android-icon-background.png는 알파 없이 RGB로 저장한다.
import re, json, os
HERE=os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE); os.makedirs('out', exist_ok=True)
src=open(os.path.join(HERE,'../../src/components/Brand/brandGeometry.ts')).read()
mo=src[src.index('export const MO'):]
loop=re.search(r'loop: "([^"]+)"',mo).group(1)
def obj(name):
    m=re.search(name+r': \{([^}]+)\}',mo).group(1)
    return {k:float(v) for k,v in re.findall(r'(\w+): ([\d.]+)',m)}
stem,bar,dot,bounds=obj('stem'),obj('bar'),obj('dot'),obj('bounds')
MINT='#2BF0C0'; INK='#0B0B0C'; WHITE='#F4F5F4'  # darkTheme text.primary (앱 안 심볼과 같은 색)

def glyph(c, dotfill, ring=None, knock=False):
    # ring=None + knock: 출발점 둘레를 투명하게 뚫는다 (모노크롬 · tinted)
    body=(f'<rect x="{stem["x"]}" y="{stem["y"]}" width="{stem["width"]}" height="{stem["height"]}"/>'
          f'<rect x="{bar["x"]}" y="{bar["y"]}" width="{bar["width"]}" height="{bar["height"]}"/>'
          f'<path fill-rule="evenodd" d="{loop}"/>')
    ro=dot['r']+dot['ring']/2
    if knock:
        return (f'<defs><mask id="k"><rect x="-5000" y="-5000" width="20000" height="20000" fill="#fff"/>'
                f'<circle cx="{dot["x"]}" cy="{dot["y"]}" r="{ro}" fill="#000"/></mask></defs>'
                f'<g fill="{c}" mask="url(#k)">{body}</g><circle cx="{dot["x"]}" cy="{dot["y"]}" r="{dot["r"]}" fill="{dotfill}"/>')
    return (f'<g fill="{c}">{body}</g><circle cx="{dot["x"]}" cy="{dot["y"]}" r="{dot["r"]}" fill="{dotfill}" '
            f'stroke="{ring}" stroke-width="{dot["ring"]}"/>')

def square(inner, size, glyph_frac, bg=None, dy=0.0):
    # glyph_frac: 캔버스 대비 심볼 정사각 viewBox 한 변 비율. dy: 아래(+)로 옮길 비율
    side=max(bounds['width'],bounds['height'])
    vx=bounds['x']-(side-bounds['width'])/2; vy=bounds['y']-(side-bounds['height'])/2
    g=size*glyph_frac; sc=g/side
    tx=(size-g)/2-vx*sc; ty=(size-g)/2-vy*sc+dy*size
    s=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">'
    if bg: s+=f'<rect width="{size}" height="{size}" fill="{bg}"/>'
    return s+f'<g transform="translate({tx:.3f},{ty:.3f}) scale({sc:.6f})">{inner}</g></svg>'

signal=glyph(MINT, WHITE, INK)
jobs=[]
def out(name, svg, size):
    open(name+'.svg','w').write(svg); jobs.append([name+'.svg', 'out/'+name+'.png', size, size])
# iOS: 앱 아이콘(검정 바탕). 기호가 홈 화면에서 너무 작지 않게 캔버스의 60%
out('icon', square(signal,1024,0.60,INK), 1024)
# iOS 18 다크: 투명 바탕(시스템 어두운 바탕 위), tinted: 흑백(출발점 둘레는 뚫음)
out('icon-dark', square(glyph(MINT,WHITE,knock=True),1024,0.60), 1024)
out('icon-tinted', square(glyph('#FFFFFF','#FFFFFF',knock=True),1024,0.60), 1024)
# Android 적응형: 전경은 안전 영역(지름 66/108) 안에 들어오게 41%
out('android-icon-foreground', square(signal,1024,0.41), 1024)
out('android-icon-monochrome', square(glyph('#FFFFFF','#FFFFFF',knock=True),1024,0.41), 1024)
out('android-icon-background', f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024"><rect width="1024" height="1024" fill="{INK}"/></svg>', 1024)
# 스플래시: 심볼만. 앱 안 애니메이션이 같은 크기 · 자리에서 이어 받는다 (BrandSymbol과 같은 정사각 viewBox)
out('splash-icon', square(signal,1024,1.0), 1024)
out('favicon', square(signal,48,0.74,INK), 48)
json.dump(jobs,open('jobs.json','w'))
