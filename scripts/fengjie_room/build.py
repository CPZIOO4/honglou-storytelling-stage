"""Playable cutaway of Fengjie's reception rooms; dimensions are stage design."""
from pathlib import Path
import sys,argparse
parser=argparse.ArgumentParser();parser.add_argument('--repo',default=str(Path(__file__).resolve().parents[2]));parser.add_argument('--output',default='C:/Users/PZIOO4/Desktop/红楼梦/3D场景/06_王熙凤正房_v01')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
repo=Path(args.repo).resolve();out=Path(args.output).resolve()
for name in ['geometry.py','architecture.py']:
    source=repo/'scripts/zhou_home'/name
    if not source.is_file():source=Path(__file__).with_name(name)
    exec(compile(source.read_text('utf-8-sig'),name,'exec'))
for name in ['models','metadata','renders','scripts']:(out/name).mkdir(parents=True,exist_ok=True)
random.seed(608)
collection('01_Stone_and_tiles')
box('Ground',(0,1,-.15),(11.4,9.2,.3),'yard')
for row in range(5):
    for i in range(15):box('Courtyard_tile',(-5.25+i*.75,-3.12+row*.54,.02),(.71,.50,.04),'street')
box('Room_plinth',(0,2.35,.06),(10,6.2,.12),'stone_dark')
for row in range(11):
    for i in range(14):box('Room_tile',(-4.6+i*.70,-.34+row*.54,.135),(.66,.50,.03),'stone_light' if (i+row)%5 else 'street')
box('Entry_step',(1,-.97,.04),(2.2,.38,.08),'stone_light')
collection('02_Reception_cutaway')
wall(-5,5,5.45,3.4)
box('Left_wall',(-4.98,2.35,1.7),(.22,6.2,3.4),'wall_ivory')
box('Right_cutaway',(4.98,2.35,.38),(.22,6.2,.76),'wall_ivory')
box('Right_cap',(4.98,2.35,.80),(.28,6.2,.08),'roof_edge')
roof('Rear_eave',0,5.28,3.48,10.8,1.2,.45)
for x in [-4.75,2.9,4.75]:
    box('Redwood_column',(x,5.16,1.76),(.20,.22,3.35),'redwood')
    box('Column_foot',(x,5.16,.27),(.34,.34,.25),'stone_dark')
for x,w in [(-2.55,4.9),(3.55,2.9)]:box('Front_cutaway',(x,-.7,.30),(w,.24,.6),'wall_ivory')
for x in [-.07,2.07]:
    box('Door_jamb',(x,-.7,1.5),(.15,.22,2.8),'redwood')
    box('Tied_curtain',(x+(.16 if x<1 else -.16),-.66,1.7),(.17,.07,2.1),'linen')
    box('Curtain_tie',(x+(.16 if x<1 else -.16),-.72,1.18),(.20,.09,.08),'gold_paint')
box('Door_lintel',(1,-.7,2.94),(2.3,.26,.22),'redwood')
box('Threshold',(1,-.7,.14),(2,.25,.09),'stone_light')
# East room partition, set back from the two actors and doorway route.
box('East_partition',(2.9,3.65,1.45),(.14,3.6,2.6),'redwood')
for i in range(9):
    y=2.05+i*.36
    for side in [2.81,2.99]:
        box('East_lattice_gap',(side,y,1.75),(.025,.29,1.3),'paper')
        for z in [1.3,1.75,2.2]:box('East_lattice_rail',(side+(-.03 if side<2.9 else .03),y,z),(.04,.30,.035),'gold_paint')
# Window behind the platform, with broad pale paper panels.
box('Window_paper',(-2.8,5.25,2.20),(3.2,.05,1.55),'paper')
for x in [-4.45,-1.15]:box('Window_jamb',(x,5.17,2.2),(.1,.1,1.75),'redwood')
for z in [1.35,3.05]:box('Window_rail',(-2.8,5.16,z),(3.4,.1,.10),'redwood')
for i in range(12):box('Window_lattice',(-4.30+i*.27,5.12,2.2),(.035,.04,1.55),'wood_face')
for z in [1.65,2.2,2.75]:box('Window_crossbar',(-2.8,5.1,z),(3.2,.035,.04),'wood_face')
collection('03_Residence_furniture')
box('Kang_base',(-1.7,4.15,.42),(3.6,1.8,.56),'redwood')
box('Kang_edge',(-1.7,4.15,.73),(3.78,1.94,.10),'wood_edge')
box('Kang_cushion',(-1.7,4.15,.82),(3.4,1.6,.09),'roof_jade')
for x in [-2.75,-.65]:box('Back_cushion',(x,4.72,1.02),(.76,.30,.36),'red_panel')
for x in [-3.45,.05]:box('Kang_inlay',(x,3.22,.51),(.08,.03,.34),'gold_paint')
box('Side_desk',(-3.55,1.55,.94),(1.5,1,.10),'redwood')
for dx in [-.61,.61]:
    for dy in [-.36,.36]:box('Desk_leg',(-3.55+dx,1.55+dy,.54),(.11,.11,.72),'redwood')
for i in range(3):box('Closed_book',(-3.8,1.65,1.02+i*.055),(.57,.41,.05),'paper' if i%2 else 'roof_teal')
lathe('Tea_bowl',(-3.3,1.35,1),[(.06,0),(.10,.07),(.09,.07),(.05,.01)],'ceramic',12)
box('East_table',(4,4.25,.90),(1.2,.85,.1),'redwood')
for dx in [-.48,.48]:
    for dy in [-.30,.30]:box('East_table_leg',(4+dx,4.25+dy,.49),(.09,.09,.74),'wood_face')
lathe('East_vase',(4.05,4.25,.95),[(.10,0),(.18,.2),(.11,.42),(.10,.48)],'ceramic',12)
# Quiet decorative clock, no unsupported timing or ringing event.
box('Clock_stand',(.9,4.95,.85),(.65,.45,1.35),'redwood')
box('Clock_case',(.9,4.93,1.95),(.58,.35,.85),'wood_face')
o=cyl('Clock_face',(.9,4.72,2.06),.22,.025,'paper',16);o.rotation_euler.x=math.pi/2
beam('Clock_hand',(.9,4.69,2.06),(.9,4.69,2.20),.012,'wood_edge',4)
beam('Clock_hand',(.9,4.69,2.06),(1.03,4.69,2.10),.012,'wood_edge',4)
for i in range(12):
    a=i*math.tau/12;box('Clock_mark',(.9+.185*math.sin(a),4.68,2.06+.185*math.cos(a)),(.024,.015,.024),'bronze')
collection('04_Blue_green_painting')
box('Painting_silk',(1.7,5.23,2.42),(1.48,.035,1.30),'paper')
for x in [.91,2.49]:box('Painting_frame',(x,5.18,2.42),(.07,.06,1.44),'wood_edge')
for z in [1.7,3.14]:box('Painting_frame',(1.7,5.18,z),(1.65,.06,.07),'wood_edge')
for layer,mat in enumerate(['roof_edge','roof_jade','roof_teal']):
    xs=[1.00+i*.135 for i in range(11)];base=1.82+layer*.035
    top=[base+.12+random.random()*.50+(0.23 if 3<i<7 else 0) for i in range(11)]
    vs=[(x,5.18-layer*.012,base) for x in xs]+[(x,5.18-layer*.012,z) for x,z in zip(xs,top)]
    mesh('Layered_mountain',vs,[(i,i+1,i+12,i+11) for i in range(10)],mat)
collection('05_Standing_space')
box('Woven_mat',(.0,1.3,.158),(3.2,2.8,.012),'roof_edge')
for x in [-1.53,1.53]:box('Mat_border',(x,1.3,.167),(.05,2.7,.008),'gold_paint')
for y in [-.03,2.63]:box('Mat_border',(0,y,.167),(3.1,.05,.008),'gold_paint')
full=collection('90_Optional_full_roof');roof('Complete_room_roof',0,2.35,3.5,10.8,6.8,1.2);full.hide_render=True;full.hide_viewport=True
bpy.context.view_layer.update()
for o in bpy.data.objects:
    if o.type!='MESH':continue
    uv=o.data.uv_layers.new(name='PigmentUV')
    for p in o.data.polygons:
        axis=max(range(3),key=lambda a:abs(p.normal[a]));ds=[a for a in range(3) if a!=axis]
        for li in p.loop_indices:
            co=o.matrix_world@o.data.vertices[o.data.loops[li].vertex_index].co;uv.data[li].uv=(co[ds[0]]*.22,co[ds[1]]*.22)
collection('99_Camera_and_light');scene=bpy.context.scene
d=bpy.data.cameras.new('Stage_camera');cam=bpy.data.objects.new('Stage_camera',d);COL.objects.link(cam);cam.location=(6,-13,10);cam.rotation_euler=(Vector((0,1.4,1))-cam.location).to_track_quat('-Z','Y').to_euler();d.type='ORTHO';d.ortho_scale=13;scene.camera=cam
light=bpy.data.lights.new('Daylight','AREA');light.energy=1800;light.size=8;o=bpy.data.objects.new('Daylight',light);COL.objects.link(o);o.location=(-4,-6,10)
scene.world.color=(.5,.57,.53)
for o in scene.objects:o.select_set(False)
for c in bpy.data.collections:
    if c.name.startswith(('90_','99_')):continue
    for o in c.objects:
        if o.type=='MESH':o.select_set(True)
glb=out/'models/fengjie_room_stage_v01.glb';bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,export_cameras=False,export_lights=False,export_animations=False)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'models/王熙凤正房_可编辑场景_v01.blend'));shutil.copy2(glb,repo/'assets/scene/fengjie-room.glb')
shutil.copy2(__file__,out/'scripts/build.py')
for name in ['geometry.py','architecture.py']:shutil.copy2(repo/'scripts/zhou_home'/name,out/'scripts'/name)
(out/'metadata/design.json').write_text(json.dumps({'scene':'王熙凤正房','source':'项目环境卡14；堂屋、东间、会客炕前的舞台化设计，尺寸陈设不冒称历史复原。','webModel':'assets/scene/fengjie-room.glb','cutaway':'前墙及右墙降低，全顶不导出；演员站立，不坐炕或操作茶碗。','bytes':glb.stat().st_size},ensure_ascii=False,indent=2),'utf-8')
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(glb));meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];assert len(meshes)>50
(out/'metadata/reimport-check.json').write_text(json.dumps({'passed':True,'meshObjects':len(meshes),'file':glb.name},indent=2),'utf-8');print('FENGJIE_ROOM_EXPORT_OK',len(meshes),glb.stat().st_size,flush=True)
