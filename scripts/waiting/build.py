"""Fifth stage: waiting hall, screen wall and forecourt, in the approved palette."""
from pathlib import Path
import sys,argparse
parser=argparse.ArgumentParser();parser.add_argument('--repo',default=str(Path(__file__).resolve().parents[2]));parser.add_argument('--output',default='C:/Users/PZIOO4/Desktop/红楼梦/3D场景/05_候见倒厅_v01')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
helpers=Path(__file__).parent.parent/'zhou_home'
if not helpers.is_dir():helpers=Path(__file__).parent
for lib in ['geometry.py','architecture.py']:exec(compile((helpers/lib).read_text('utf-8-sig'),lib,'exec'))
repo=Path(args.repo).resolve();out=Path(args.output).resolve()
if not (repo/'assets/scene').is_dir():raise SystemExit('Use -- --repo PATH to select the repository.')
for name in ['models','renders','metadata','scripts']:(out/name).mkdir(parents=True,exist_ok=True)
random.seed(605)
collection('01_Paved_forecourt')
box('Ground',(0,.3,-.12),(11,8.1,.24),'yard')
for j in range(12):
    for i in range(15):
        x=-5.15+i*.70+(.16 if j%2 else 0)
        box('Paving',(x,-3.1+j*.60,.012),(.66,.56,.024),'stone_light' if (i+j)%8 else 'stone_dark')
for x in [-4.9,4.9]:box('Drain',(x,.2,.03),(.14,7,.06),'stone_dark')
collection('02_Rear_boundary_and_inner_gate')
wall(-5.2,1.25,3.52,2.85);wall(3.65,5.2,3.52,2.85)
for x in [1.25,3.65]:
    box('Gate_foot',(x,3.4,.16),(.40,.45,.32),'stone_light')
    box('Inner_gate_frame',(x,3.5,1.5),(.17,.25,2.68),'redwood')
box('Inner_gate_lintel',(2.45,3.5,2.85),(2.65,.32,.19),'redwood')
box('Gate_threshold',(2.45,3.5,.09),(2.15,.27,.18),'stone_light')
roof('Inner_gate_eave',2.45,3.5,3.04,3.25,1.65,.58)
# A turn beyond the opening suggests the inner court; no view into the principal room.
box('Inner_passage_floor',(2.45,4.08,.025),(2.5,1.0,.05),'stone_dark')
box('Inner_turn_wall',(3.6,4.0,1.1),(.22,1.0,2.2),'wall_shadow')
box('Inner_shadow',(2.45,4.48,1.15),(2.38,.12,2.3),'wall_shadow')
for x in [1.48,3.42]:box('Folded_plain_curtain',(x,3.46,1.6),(.20,.06,2.22),'linen')
collection('03_Waiting_hall')
box('Hall_platform',(-3.8,1.35,.12),(2.8,4.0,.24),'stone_light')
box('Hall_side_wall',(-5.11,1.35,1.47),(.2,4.0,2.7),'wall_ivory')
for y in [-.55,3.22]:
    for x in [-5.02,-2.5]:
        box('Column_foot',(x,y,.28),(.34,.34,.32),'stone_dark')
        cyl('Hall_column',(x,y,1.55),.075,2.4,'redwood',8)
for x in [-5.02,-2.5]:box('Eave_beam',(x,1.35,2.83),(.16,4.12,.20),'timber')
from mathutils import Matrix
roof_before=set(bpy.data.objects)
roof('Waiting_hall_roof',-3.76,1.35,2.93,4.45,3.2,.64)
roof_center=Vector((-3.76,1.35,0))
rotate_roof=Matrix.Translation(roof_center)@Matrix.Rotation(math.pi/2,4,'Z')@Matrix.Translation(-roof_center)
for item in set(bpy.data.objects)-roof_before:item.matrix_world=rotate_roof@item.matrix_world
for y in [.3,2.15]:
    box('Waiting_bench',(-4.42,y,.63),(.48,1.35,.10),'wood_face')
    for yy in [y-.5,y+.5]:box('Bench_leg',(-4.42,yy,.4),(.33,.085,.46),'timber')
box('Hall_table',(-3.52,2.35,.83),(.68,.6,.08),'wood_face')
for x in [-3.77,-3.27]:
    for y in [2.13,2.57]:box('Table_leg',(x,y,.49),(.055,.055,.62),'timber')
collection('04_Screen_wall')
box('Screen_base',(-1.85,.45,.16),(2.80,.60,.32),'stone_dark')
box('Screen_wall',(-1.85,.45,1.3),(2.55,.28,2.28),'wall_ivory')
box('Screen_panel',(-1.85,.285,1.35),(2.05,.035,1.5),'wall_shadow')
box('Screen_inset',(-1.85,.26,1.35),(1.91,.035,1.36),'wall_ivory')
for x in [-3.10,-.60]:box('Screen_edge',(x,.24,1.3),(.10,.12,2.25),'stone_light')
roof('Screen_cap',-1.85,.45,2.49,2.95,.78,.29)
# Low-relief brick lozenges, without a fabricated inscription or crest.
for x in [-2.55,-1.85,-1.15]:
    o=box('Brick_lozenge',(x,.22,1.40),(.35,.04,.35),'stone_light');o.rotation_euler.y=math.pi/4
collection('05_Court_details')
for x,y in [(4.6,2.7),(-4.8,-2.7)]:
    lathe('Stone_planter',(x,y,.02),[(.25,0),(.35,.42),(.30,.47),(.23,.08)],'stone_dark',12)
    cyl('Planter_soil',(x,y,.38),.27,.03,'earth',12)
    for i in range(4):
        a=i*1.7;beam('Plant_stem',(x,y,.4),(x+.24*math.cos(a),y+.21*math.sin(a),.87),.015,'timber',5)
        ellipsoid('Plant_leaf',(x+.22*math.cos(a),y+.2*math.sin(a),.86),(.18,.11,.08),'pine')
for i in range(8):
    o=box('Dry_leaf',(random.uniform(.4,4.4),random.uniform(-2.8,.9),.04),(.08,.04,.008),'dry_leaf');o.rotation_euler.z=random.uniform(0,6)
bpy.context.view_layer.update()
for o in bpy.data.objects:
    if o.type!='MESH':continue
    uv=o.data.uv_layers.new(name='PigmentUV')
    for p in o.data.polygons:
        axis=max(range(3),key=lambda a:abs(p.normal[a]));ds=[a for a in range(3) if a!=axis]
        for li in p.loop_indices:
            co=o.matrix_world@o.data.vertices[o.data.loops[li].vertex_index].co;uv.data[li].uv=(co[ds[0]]*.22,co[ds[1]]*.22)
collection('99_Cameras_and_lights');scene=bpy.context.scene
d=bpy.data.cameras.new('Stage_camera');cam=bpy.data.objects.new('Stage_camera',d);COL.objects.link(cam);cam.location=(8,-16,11);cam.rotation_euler=(Vector((0,.3,1))-cam.location).to_track_quat('-Z','Y').to_euler();d.type='ORTHO';d.ortho_scale=13;scene.camera=cam
light=bpy.data.lights.new('Daylight','AREA');light.energy=1900;light.size=8;o=bpy.data.objects.new('Daylight',light);COL.objects.link(o);o.location=(-4,-6,10);o.rotation_euler=(Vector((0,1,0))-o.location).to_track_quat('-Z','Y').to_euler()
scene.world.color=(.5,.57,.53);scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=1440;scene.render.resolution_y=900;scene.render.resolution_percentage=100
for o in scene.objects:o.select_set(o.type=='MESH')
glb=out/'models/rongfu_waiting_stage_v01.glb'
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,export_cameras=False,export_lights=False,export_animations=False)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'models/候见倒厅_可编辑场景_v01.blend'))
shutil.copy2(glb,repo/'assets/scene/rongfu-waiting.glb');shutil.copy2(__file__,out/'scripts/build.py')
for f in ['geometry.py','architecture.py']:shutil.copy2(helpers/f,out/'scripts'/f)
(out/'metadata/design.json').write_text(json.dumps({'scene':'候见倒厅与院落','basis':'第六回倒厅、影壁与院门的通报关系，以及项目13号环境卡。','adaptation':'尺寸、廊亭、砖纹和陈设为舞台设计，不是精确建筑复原。','bytes':glb.stat().st_size},ensure_ascii=False,indent=2),'utf-8')
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(glb));meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];assert len(meshes)>80
(out/'metadata/reimport-check.json').write_text(json.dumps({'passed':True,'meshObjects':len(meshes),'file':glb.name},indent=2),'utf-8')
print('WAITING_EXPORT_OK',len(meshes),glb.stat().st_size,flush=True)
