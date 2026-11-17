"""Fourth stage: a playable cutaway of Zhou Rui's wife's modest home.
Palette/geometry helpers reuse approved scenes. Exact layout is stage design.
Run with Blender --background --python scripts/assets/zhou_home/build.py.
"""
from pathlib import Path
import sys,argparse
parser=argparse.ArgumentParser();parser.add_argument('--repo',default=str(Path(__file__).resolve().parents[3]));parser.add_argument('--output',default='C:/Users/PZIOO4/Desktop/红楼梦/3D场景/04_周瑞妻子住处_v01')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
for lib in ['geometry.py','architecture.py']:
    exec(compile(Path(__file__).with_name(lib).read_text('utf-8-sig'),lib,'exec'))
repo=Path(args.repo).resolve();out=Path(args.output).resolve()
if not (repo/'assets/scene').is_dir():raise SystemExit('Use -- --repo PATH to select the honglou-storytelling-stage repository.')
for name in ['models','metadata','renders','scripts']:(out/name).mkdir(parents=True,exist_ok=True)
random.seed(604)
collection('01_Courtyard_floor')
box('Ground',(0,.8,-.13),(9.6,8.0,.26),'yard')
for row in range(5):
    for i in range(12):
        x=-4.45+i*.75+(.20 if row%2 else 0)
        box('Courtyard_brick',(x,-2.65+row*.56,.015),(.70,.51,.03),'street' if (i+row)%7 else 'stone_dark')
box('House_floor',(0,2.35,.06),(7.4,4.1,.12),'stone_light')
for row in range(7):
    for i in range(11):box('Room_tile',(-3.32+i*.65,.61+row*.55,.125),(.61,.51,.025),'stone_light' if (i+row)%6 else 'street')
collection('02_Cutaway_room')
wall(-3.75,3.75,4.45,2.85)
# Left side closes the room; right side is cut low for audience sightlines.
box('Left_wall',(-3.72,2.36,1.43),(.22,4.15,2.86),'wall_ivory')
box('Left_dado',(-3.58,2.36,.39),(.07,4.15,.55),'stone_dark')
box('Right_cutaway',(3.72,2.36,.38),(.22,4.15,.76),'wall_ivory')
box('Right_cutaway_cap',(3.72,2.36,.79),(.29,4.15,.08),'roof_edge')
roof('Back_eave',0,4.27,2.92,8.1,1.18,.42)
# Front elevation retains the doorway and low wall, leaving the acting space visible.
for x,w in [(-1.92,3.58),(2.92,1.58)]:box('Front_cutaway',(x,.30,.29),(w,.22,.58),'wall_ivory')
for x in [.03,1.97]:box('Door_jamb',(x,.30,1.30),(.12,.18,2.5),'timber')
box('Door_lintel',(1,.30,2.58),(2.10,.21,.17),'timber')
box('Threshold',(1,.30,.085),(1.82,.28,.17),'stone_light')
for x in [.12,1.88]:
    box('Tied_curtain',(x,.34,1.53),(.14,.06,1.96),'linen')
    box('Curtain_tie',(x,.28,1.06),(.16,.07,.06),'cord')
box('Curtain_top',(1,.34,2.45),(1.82,.07,.16),'linen')
# A restrained lattice window, rather than a ceremonial mansion facade.
box('Window_paper',(-1.58,4.25,1.8),(2.05,.045,1.12),'paper')
for x in [-2.65,-.51]:box('Window_jamb',(x,4.19,1.8),(.075,.075,1.23),'wood_face')
for z in [1.19,2.41]:box('Window_rail',(-1.58,4.19,z),(2.2,.075,.075),'wood_face')
for i in range(8):box('Window_lattice',(-2.5+i*.265,4.15,1.8),(.028,.04,1.12),'wood_face')
for z in [1.52,1.91,2.23]:box('Window_crossbar',(-1.58,4.14,z),(2.05,.035,.025),'wood_face')
collection('03_Furniture')
# Table stays left of the route; speech positions are standing, not seated sprites.
box('Tea_table',(-2.1,2.1,.83),(1.35,.85,.09),'wood_face')
for dx in [-.54,.54]:
    for dy in [-.31,.31]:box('Table_leg',(-2.1+dx,2.1+dy,.44),(.08,.08,.78),'timber')
for x,y in [(-2.9,1.38),(-1.22,2.55)]:
    box('Low_stool',(x,y,.44),(.47,.44,.085),'wood_face')
    for dx in [-.16,.16]:
        for dy in [-.14,.14]:box('Stool_leg',(x+dx,y+dy,.23),(.055,.055,.4),'timber')
for x in [-2.4,-1.82]:lathe('Tea_bowl',(x,2.05,.88),[(.055,0),(.09,.065),(.08,.065),(.045,.012)],'ceramic',12)
lathe('Tea_pot',(-2.1,2.3,.88),[(.08,0),(.12,.10),(.09,.17),(.06,.18)],'jar',12)
box('Clothes_chest',(2.9,3.9,.5),(1.05,.69,.76),'wood_face')
box('Chest_lid',(2.9,3.9,.91),(1.10,.74,.08),'wood_edge')
box('Folded_cloth',(2.92,3.9,1.0),(.6,.48,.1),'quilt')
box('Wall_shelf',(.70,4.18,1.82),(1.0,.32,.08),'wood_face')
for x in [.4,.8]:lathe('Shelf_jar',(x,4.12,1.86),[(.07,0),(.10,.12),(.065,.23)],'ceramic',10)
collection('04_Courtyard_details')
for x,y in [(-4.15,.1),(3.9,-.7)]:
    lathe('Courtyard_crock',(x,y,0),[(.2,0),(.29,.28),(.22,.53),(.16,.55)],'jar',12)
    cyl('Crock_opening',(x,y,.54),.15,.015,'jar_dark',12)
box('Courtyard_bench',(-3,-1.05,.48),(1.65,.4,.10),'wood_face')
for x in [-3.6,-2.4]:box('Bench_foot',(x,-1.05,.24),(.09,.33,.45),'timber')
wall(-4.6,-3.85,-1.95,1.65)
roof('Small_entry_eave',-4.2,-1.95,1.72,1.1,.75,.26)
for i in range(12):
    o=box('Fallen_leaf',(random.uniform(-3.8,3.7),random.uniform(-2.5,-.5),.04),(.08,.04,.008),'dry_leaf');o.rotation_euler.z=random.uniform(0,6)
# Optional full roof belongs to the editable model, omitted from performance GLB.
full=collection('90_Optional_full_roof')
roof('Complete_house_roof',0,2.35,2.97,8.2,4.7,.95)
full.hide_render=True;full.hide_viewport=True
bpy.context.view_layer.update()
for o in bpy.data.objects:
    if o.type!='MESH':continue
    uv=o.data.uv_layers.new(name='PigmentUV')
    for p in o.data.polygons:
        axis=max(range(3),key=lambda a:abs(p.normal[a]));ds=[a for a in range(3) if a!=axis]
        for li in p.loop_indices:
            co=o.matrix_world@o.data.vertices[o.data.loops[li].vertex_index].co;uv.data[li].uv=(co[ds[0]]*.22,co[ds[1]]*.22)
collection('99_Camera_and_light');scene=bpy.context.scene
d=bpy.data.cameras.new('Stage_camera');cam=bpy.data.objects.new('Stage_camera',d);COL.objects.link(cam);cam.location=(7,-13,10);cam.rotation_euler=(Vector((0,1,1))-cam.location).to_track_quat('-Z','Y').to_euler();d.type='ORTHO';d.ortho_scale=12;scene.camera=cam
light=bpy.data.lights.new('Daylight','AREA');light.energy=1800;light.size=8;o=bpy.data.objects.new('Daylight',light);COL.objects.link(o);o.location=(-4,-6,10);o.rotation_euler=(Vector((0,1,0))-o.location).to_track_quat('-Z','Y').to_euler()
scene.world.color=(.5,.57,.53);scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=1440;scene.render.resolution_y=900;scene.render.resolution_percentage=100
for o in scene.objects:o.select_set(False)
for c in bpy.data.collections:
    if c.name.startswith(('90_','99_')):continue
    for o in c.objects:
        if o.type=='MESH':o.select_set(True)
glb=out/'models/zhou_wife_home_stage_v01.glb'
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,export_cameras=False,export_lights=False,export_animations=False)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'models/周瑞妻子住处_可编辑场景_v01.blend'))
shutil.copy2(glb,repo/'assets/scene/zhou-wife-home.glb')
for f in Path(__file__).parent.glob('*.py'):shutil.copy2(f,out/'scripts'/f.name)
(out/'metadata/design.json').write_text(json.dumps({'scene':'周瑞妻子住处','source':'第六回接待发生于其家；布局、家具尺寸、剖面为本项目舞台设计。','webModel':'assets/scene/zhou-wife-home.glb','cutaway':'前墙和右侧降低、全顶不导出；90_Optional_full_roof可在Blender启用','bytes':glb.stat().st_size},ensure_ascii=False,indent=2),'utf-8')
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(glb))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];assert len(meshes)>50
(out/'metadata/reimport-check.json').write_text(json.dumps({'passed':True,'meshObjects':len(meshes),'file':glb.name},indent=2),'utf-8')
print('ZHOU_HOME_EXPORT_OK',len(meshes),glb.stat().st_size,flush=True)
