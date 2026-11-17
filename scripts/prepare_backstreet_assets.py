"""Copy approved backstreet model and guide child's layers without editing images."""
from pathlib import Path
import json,shutil
from PIL import Image
root=Path(__file__).resolve().parent.parent
source=Path('C:/Users/PZIOO4/Desktop/红楼梦')
src=source/'透明角色素材/引路孩童';dst=root/'assets/characters/guide_child';dst.mkdir(parents=True,exist_ok=True)
faces={'neutral':'平静','smile':'微笑','thinking':'思考','sad':'难过','surprised':'惊讶','laugh':'大笑'}
for a,b in [('身体底图.png','body.png'),('背面.png','back.png')]:shutil.copy2(src/a,dst/b)
for k,v in faces.items():shutil.copy2(src/'头部差分'/f'{v}.png',dst/f'head-{k}.png')
with Image.open(src/'正面.png') as im:bounds=im.getchannel('A').getbbox();size=im.size
meta=json.loads((src/'对齐信息.json').read_text('utf-8'))
roster=json.loads((root/'data/gate-characters.json').read_text('utf-8'))
roster.append(dict(id='guide_child',name='引路孩童',height=1.15,width=size[0],canvasHeight=size[1],alphaBounds=bounds,neckY=meta['neck'][1],expressions=list(faces)))
(root/'data/backstreet-characters.json').write_text(json.dumps(roster,ensure_ascii=False,indent=2)+'\n','utf-8')
shutil.copy2(source/'3D场景/03_荣府后街_v01/models/rongfu_backstreet_stage_v01.glb',root/'assets/scene/rongfu-backstreet.glb')
