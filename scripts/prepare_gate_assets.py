"""Copy approved gate assets unchanged; read alpha bounds for the renderer."""
from pathlib import Path
import json,shutil
from PIL import Image
root=Path(__file__).resolve().parent.parent
source=Path('C:/Users/PZIOO4/Desktop/红楼梦')
faces={'neutral':'平静','smile':'微笑','thinking':'思考','sad':'难过','surprised':'惊讶','laugh':'大笑'}
cast=json.loads((root/'data/characters.json').read_text(encoding='utf-8'))
for cid,name,height in [('gatekeeper','门房仆役',1.82),('old_servant','门房老仆',1.72)]:
    src=source/'透明角色素材'/name;dst=root/'assets/characters'/cid;dst.mkdir(parents=True,exist_ok=True)
    for input_name,output_name in [('身体底图.png','body.png'),('背面.png','back.png')]:shutil.copy2(src/input_name,dst/output_name)
    for key,label in faces.items():shutil.copy2(src/'头部差分'/(label+'.png'),dst/('head-'+key+'.png'))
    with Image.open(src/'正面.png') as im: bounds=im.getchannel('A').getbbox();size=im.size
    meta=json.loads((src/'对齐信息.json').read_text(encoding='utf-8'))
    cast.append(dict(id=cid,name=name,height=height,width=size[0],canvasHeight=size[1],alphaBounds=bounds,neckY=meta['neck'][1],expressions=list(faces)))
(root/'data/gate-characters.json').write_text(json.dumps(cast,ensure_ascii=False,indent=2),encoding='utf-8')
shutil.copy2(source/'3D场景/02_荣府角门_v01/models/rongfu_side_gate_stage_v01.glb',root/'assets/scene/rongfu-gate.glb')
print('Copied gate model and two approved character layer sets without image modification.')
