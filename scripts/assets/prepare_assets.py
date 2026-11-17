from pathlib import Path
import shutil,json,urllib.request,tarfile,io,hashlib
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
SRC=Path('C:/Users/PZIOO4/Desktop/红楼梦')
for d in ['assets/scene','assets/characters','vendor/three/addons/loaders','vendor/three/addons/utils','data','data/characters','src','tests','docs','qa']:(ROOT/d).mkdir(parents=True,exist_ok=True)
shutil.copy2(SRC/'3D场景/01_狗儿家_v01/models/gouer_home_stage_v01.glb',ROOT/'assets/scene/gouer-home.glb')
faces={'neutral':'平静','smile':'微笑','thinking':'思考','sad':'难过','surprised':'惊讶','laugh':'大笑'}
characters=[]
for cid,name,height in [('granny','刘姥姥',1.63),('gouer','狗儿',1.85),('liushi','刘氏',1.76),('baner','板儿',1.00),('qinger','青儿',.92)]:
    folder=SRC/'透明角色素材'/name;dst=ROOT/'assets/characters'/cid;dst.mkdir(exist_ok=True)
    for fn in ['back']:shutil.copy2(folder/('正面.png' if fn=='front' else '背面.png'),dst/(fn+'.png'))
    shutil.copy2(folder/'身体底图.png',dst/'body.png')
    for key,label in faces.items():shutil.copy2(folder/'头部差分'/(label+'.png'),dst/('head-'+key+'.png'))
    im=Image.open(folder/'正面.png');bbox=im.getchannel('A').getbbox()
    characters.append({'id':cid,'name':name,'height':height,'width':im.width,'canvasHeight':im.height,'alphaBounds':bbox,'expressions':list(faces)})
(ROOT/'data/characters/home.json').write_text(json.dumps(characters,ensure_ascii=False,indent=2),encoding='utf-8')
url='https://registry.npmjs.org/three/-/three-0.180.0.tgz'
raw=urllib.request.urlopen(url,timeout=60).read();t=tarfile.open(fileobj=io.BytesIO(raw),mode='r:gz')
mapping={'package/build/three.module.js':'three.module.js','package/build/three.core.js':'three.core.js','package/examples/jsm/loaders/GLTFLoader.js':'addons/loaders/GLTFLoader.js','package/examples/jsm/utils/BufferGeometryUtils.js':'addons/utils/BufferGeometryUtils.js','package/LICENSE':'LICENSE'}
for src,dst in mapping.items():(ROOT/'vendor/three'/dst).write_bytes(t.extractfile(src).read())
(ROOT/'vendor/three/version.json').write_text(json.dumps({'package':'three','version':'0.180.0','source':url,'sha256':hashlib.sha256(raw).hexdigest()},indent=2),encoding='utf-8')
print('Prepared scene, five characters and pinned offline Three.js modules')
