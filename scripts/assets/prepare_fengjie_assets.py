from pathlib import Path
import json,shutil
from PIL import Image
root=Path(__file__).resolve().parents[2]
src=Path('C:/Users/PZIOO4/Desktop/红楼梦/透明角色素材/王熙凤');dst=root/'assets/characters/fengjie';dst.mkdir(parents=True,exist_ok=True)
faces={'neutral':'平静','smile':'微笑','thinking':'思考','sad':'难过','surprised':'惊讶','laugh':'大笑'}
for a,b in [('身体底图.png','body.png'),('背面.png','back.png')]:shutil.copy2(src/a,dst/b)
for k,v in faces.items():shutil.copy2(src/'头部差分'/f'{v}.png',dst/f'head-{k}.png')
with Image.open(src/'正面.png') as im:bounds=im.getchannel('A').getbbox();size=im.size
meta=json.loads((src/'对齐信息.json').read_text('utf-8'))
roster=json.loads((root/'data/characters/waiting.json').read_text('utf-8'))
roster.append(dict(id='fengjie',name='王熙凤',height=1.68,width=size[0],canvasHeight=size[1],alphaBounds=bounds,neckY=meta['neck'][1],expressions=list(faces)))
(root/'data/characters/report.json').write_text(json.dumps(roster,ensure_ascii=False,indent=2)+'\n','utf-8')
