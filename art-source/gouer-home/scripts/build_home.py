"""Gouer's rural home: human-scale cutaway stage. Blender 4.5 background."""
import bpy, math, random, json, shutil
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parent.parent
for folder in ['models','renders','metadata','textures']: (ROOT/folder).mkdir(parents=True,exist_ok=True)
random.seed(624)
for obj in list(bpy.data.objects): bpy.data.objects.remove(obj,do_unlink=True)
for col in list(bpy.data.collections): bpy.data.collections.remove(col)
def collection(name):
    global COL
    COL=bpy.data.collections.new(name);bpy.context.scene.collection.children.link(COL);return COL
collection('01_Earth_and_floor')
def mesh(name,vs,fs,mat):
    d=bpy.data.meshes.new(name);d.from_pydata(vs,[],fs);d.update()
    o=bpy.data.objects.new(name,d);COL.objects.link(o)
    if mat:o.data.materials.append(M[mat] if isinstance(mat,str) else mat)
    return o
def box(name,pos,size,mat):
    a,b,c=[s/2 for s in size]
    vs=[(-a,-b,-c),(a,-b,-c),(a,b,-c),(-a,b,-c),(-a,-b,c),(a,-b,c),(a,b,c),(-a,b,c)]
    o=mesh(name,vs,[(3,2,1,0),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)],mat);o.location=pos;return o
def cyl(name,pos,r,h,mat,n=10):
    vs=[(r*math.cos(i*math.tau/n),r*math.sin(i*math.tau/n),z) for z in [-h/2,h/2] for i in range(n)]
    fs=[tuple(reversed(range(n))),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    o=mesh(name,vs,fs,mat);o.location=pos;return o
def beam(name,a,b,r,mat,n=6):
    a,b=Vector(a),Vector(b);o=cyl(name,(a+b)/2,r,(b-a).length,mat,n);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
def lathe(name,pos,profile,mat,n=16):
    vs=[(r*math.cos(i*math.tau/n),r*math.sin(i*math.tau/n),z) for r,z in profile for i in range(n)]
    fs=[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(len(profile)-1) for i in range(n)]
    o=mesh(name,vs,fs,mat);o.location=pos;return o
def ring(name,pos,r,thick,mat):
    return lathe(name,pos,[(r-thick/2,-thick/2),(r+thick/2,-thick/2),(r+thick/2,thick/2),(r-thick/2,thick/2),(r-thick/2,-thick/2)],mat)
palette={
'plaster':(.59,.52,.38),'plaster_light':(.72,.65,.49),'patch':(.48,.40,.28),
'earth':(.39,.31,.205),'yard':(.47,.39,.26),'stone':(.36,.39,.35),
'timber':(.20,.135,.079),'wood_face':(.31,.22,.125),'wood_edge':(.41,.30,.17),
'crack':(.32,.27,.18),'straw':(.49,.38,.20),'straw_light':(.61,.49,.28),
'clay':(.32,.18,.105),'jar':(.16,.23,.20),'jar_dark':(.075,.09,.075),
'linen':(.60,.53,.38),'quilt':(.24,.33,.31),'quilt_dark':(.16,.24,.24),
'patch_blue':(.21,.29,.31),'paper':(.78,.73,.57),'iron':(.075,.085,.08),
'soot':(.18,.16,.12),'dry_leaf':(.40,.32,.16),'moss':(.24,.30,.21),
'grain':(.63,.49,.27),'ceramic':(.51,.56,.48),'cord':(.38,.29,.16)
}
M={}
for name,color in palette.items():
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1)
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.92
    im=bpy.data.images.new('Pigment_'+name,width=32,height=32);rng=random.Random(name)
    px=[]
    # Subtle clustered pigments; not a floor-wide checkerboard.
    cells=[[rng.choice([.95,.98,1,1,1,1.02,1.04]) for _ in range(16)] for _ in range(16)]
    for y in range(32):
        for x in range(32):px.extend([min(.99,c*cells[y//2][x//2]) for c in color]+[1])
    im.pixels=px;im.pack()
    t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=im;t.interpolation='Closest'
    m.node_tree.links.new(t.outputs['Color'],bs.inputs['Base Color']);M[name]=m

# Interior clear floor 6.4 x 4.5 m. Right yard 3.2 m wide, continuous walking surface.
box('Packed_earth_floor',(-.8,.05,-.12),(6.5,4.9,.24),'earth')
box('Courtyard_ground',(4.18,-.18,-.14),(3.5,5.35,.28),'yard')
box('Front_foundation',(-.8,-2.38,-.12),(6.65,.20,.28),'stone')
box('West_foundation',(-4.02,.04,-.12),(.20,4.9,.30),'stone')
for j in range(5):
    for i in range(2):box('Entry_stone',(2.25+i*.54,-1.38+j*.39,.018),(.50,.35,.035),'stone')
for i in range(24):
    x=random.uniform(-3.8,5.6);y=random.uniform(-2.1,2.1)
    if x<2.5 and y>.2:continue
    o=box('Dry_earth_fleck',(x,y,.006),(random.uniform(.04,.13),random.uniform(.02,.05),.009),'patch');o.rotation_euler.z=random.random()*6

collection('02_Cutaway_walls_and_joinery')
# Two back windows have actual apertures.
box('Rear_wall_sill',(-.8,2.42,.61),(6.5,.22,1.22),'plaster')
box('Rear_wall_top',(-.8,2.42,2.76),(6.5,.22,.45),'plaster_light')
for x,w in [(-3.505,1.09),(-.71,1.14),(1.995,.91)]:box('Rear_wall_pier',(x,2.42,1.88),(w,.22,1.33),'plaster')
box('West_wall',(-4.02,.02,1.48),(.22,4.78,2.96),'plaster')
box('East_cutaway_rear',(2.43,1.24,.43),(.20,2.36,.86),'plaster')
box('East_cutaway_front',(2.43,-2.12,.43),(.20,.55,.86),'plaster')
for x in [-3.94,2.36]:box('Rear_post',(x,2.28,1.52),(.14,.17,3.04),'timber')
box('Rear_tie_beam',(-.8,2.26,2.90),(6.45,.18,.19),'timber')
for x in [-2.12,.70]:
    y=2.30;z=1.89;w=1.68;h=1.18
    box('Paper_window',(x,y+.07,z),(w,.025,h),'paper')
    for xx in [x-w/2,x+w/2]:box('Window_jamb',(xx,y-.01,z),(.075,.10,h+.13),'wood_face')
    for zz in [z-h/2,z+h/2]:box('Window_rail',(x,y-.01,zz),(w+.12,.10,.075),'wood_face')
    for k in range(1,6):box('Window_vertical',(x-w/2+k*w/6,y-.055,z),(.028,.035,h),'timber')
    for k in range(1,4):box('Window_horizontal',(x,y-.06,z-h/2+k*h/4),(w,.04,.028),'timber')
    box('Window_sill',(x,2.19,1.25),(w+.22,.34,.085),'wood_edge')
    # A few repairs on translucent paper.
    box('Window_paper_patch',(x+.24,y+.045,z+.27),(.23,.012,.18),'linen')
for yy in [-1.91,-.48]:box('Door_jamb',(2.39,yy,1.15),(.16,.14,2.3),'wood_face')
box('Door_header',(2.39,-1.20,2.29),(.19,1.61,.16),'timber')
# Open door around fixed hinge; swung into the yard.
door=bpy.data.objects.new('Door_hinge',None);COL.objects.link(door);door.location=(2.47,-.49,0);door.rotation_euler.z=math.radians(64)
for i in range(6):
    o=box('Door_plank',(0,-.12-i*.205,1.10),(.065,.193,2.11),'wood_face' if i%3 else 'wood_edge');o.parent=door
for zz in [.42,1.7]:
    o=box('Door_brace',(-.045,-.64,zz),(.075,1.25,.10),'timber');o.parent=door
o=box('Door_latch',(-.10,-1.05,1.15),(.10,.22,.07),'iron');o.parent=door
# Exposed earthen plaster repairs and shallow cracks.
for x,z,w,h in [(-3.15,.50,.55,.20),(-.78,.73,.48,.14),(1.64,.30,.52,.19),(-3.53,2.58,.28,.12)]:
    mesh('Irregular_plaster_repair',[(x-w/2,2.298,z),(x-w*.3,2.297,z+h),(x+w*.35,2.298,z+h*.8),(x+w/2,2.298,z-.02)],[(0,1,2,3)],'patch')
for points in [[(-3.36,2.30,2.63),(-3.43,2.30,2.34),(-3.32,2.30,2.17)],[(1.68,2.30,.78),(1.79,2.30,.55),(1.72,2.30,.40)]]:
    for a,b in zip(points,points[1:]):beam('Plaster_hairline',a,b,.008,'crack',4)

collection('03_Kang_and_bedding')
box('Earth_kang',(-2.55,1.31,.34),(2.65,1.8,.68),'plaster')
box('Kang_top',(-2.55,1.31,.70),(2.68,1.82,.065),'linen')
box('Kang_front_lip',(-2.55,.39,.66),(2.72,.09,.10),'wood_face')
for x in [-3.65,-3.10,-2.55,-2.0,-1.45]:box('Kang_base_brick',(x,.405,.10),(.50,.035,.17),'patch')
for yy in [1.9,2.1]:
    o=cyl('Rolled_quilt',(-2.70,yy,.93),.17,1.78,'quilt',12);o.rotation_euler.y=math.pi/2
    for xx in [-3.25,-2.15]:
        o=ring('Quilt_binding',(xx,yy,.93),.175,.025,'linen');o.rotation_euler.y=math.pi/2
box('Folded_cover',(-3.25,1.41,.80),(1.02,.65,.15),'quilt')
box('Cover_patch',(-3.34,1.41,.881),(.23,.19,.012),'patch_blue')
box('Cloth_pillow',(-3.33,1.9,1.13),(.66,.38,.18),'linen')
for i in range(19):box('Reed_mat_weave',(-2.5,.92+i*.036,.742),(2.35,.012,.006),'straw')

def stool(x,y,rot=0):
    pieces=[];pieces.append(box('Stool_seat',(x,y,.46),(.55,.41,.11),'wood_face'))
    for dx in [-.19,.19]:
        for dy in [-.125,.125]:beam('Stool_leg',(x+dx*1.18,y+dy*1.18,.035),(x+dx,y+dy,.43),.043,'timber',4)
    for dx in [-.19,.19]:box('Stool_stretcher',(x+dx,y,.21),(.055,.32,.055),'wood_edge')
def table(x,y,z=.0,w=1.12,d=.72,h=.69):
    for i in range(4):box('Table_top_plank',(x,y-d/2+(i+.5)*d/4,z+h),(w,d/4-.008,.075),'wood_face' if i%2 else 'wood_edge')
    for dx in [-w*.39,w*.39]:
        for dy in [-d*.34,d*.34]:box('Table_leg',(x+dx,y+dy,z+h/2),(.075,.075,h),'timber')
    for yy in [-d*.34,d*.34]:box('Table_apron',(x,y+yy,z+h-.11),(w-.1,.07,.16),'wood_face')
def bowl(x,y,z,r=.13,mat='ceramic'):
    lathe('Earthenware_bowl',(x,y,z),[(.065,0),(r,.09),(r,.12),(r-.018,.12),(.052,.025),(0,.025)],mat,14)
def jar(x,y,z=0,s=1):
    lathe('Storage_jar',(x,y,z),[(.19*s,0),(.29*s,.13*s),(.32*s,.45*s),(.23*s,.65*s),(.19*s,.67*s),(.16*s,.65*s),(.18*s,.58*s)],'jar',16)
    cyl('Jar_dark_opening',(x,y,z+.58*s),.18*s,.015,'jar_dark',16)
    ring('Jar_lip',(x,y,z+.66*s),.19*s,.035*s,'clay')
def basket(x,y,z=0,s=1):
    lathe('Basket_body',(x,y,z),[(.21*s,0),(.31*s,.40*s),(.28*s,.40*s),(.18*s,.03*s)],'straw',14)
    for j in range(8):ring('Basket_weft',(x,y,z+j*.05*s),(.215+j*.012)*s,.018*s,'straw_light')
    for i in range(14):
        a=i*math.tau/14;beam('Basket_upright',(x+.21*s*math.cos(a),y+.21*s*math.sin(a),z),(x+.31*s*math.cos(a),y+.31*s*math.sin(a),z+.40*s),.012*s,'cord',4)
    ring('Basket_rim',(x,y,z+.40*s),.30*s,.035*s,'wood_edge')

collection('04_Tables_seats_and_daily_objects')
table(-2.7,-.55,w=1.15,d=.68,h=.69)
stool(-3.48,-.58);stool(-1.88,-.80)
bowl(-2.85,-.51,.735);bowl(-2.39,-.52,.735,.105)
lathe('Small_tea_pot',(-2.76,-.32,.735),[(.09,0),(.13,.10),(.10,.19),(.06,.20)],'clay')
cyl('Teapot_lid',(-2.76,-.32,.95),.08,.03,'clay')
beam('Teapot_spout',(-2.85,-.32,.83),(-2.99,-.32,.91),.033,'clay')
box('Old_storage_chest',(-3.61,-1.74,.29),(.52,.81,.58),'wood_face')
for y in [-2.03,-1.45]:box('Chest_iron_band',(-3.61,y,.59),(.54,.045,.018),'iron')
box('Chest_latch',(-3.33,-1.73,.48),(.02,.07,.15),'iron')
basket(-1.45,1.82,.74,.62)
# Shelf on back wall, sparsely supplied.
box('Wall_shelf',(-.65,2.08,1.32),(.93,.40,.07),'wood_face')
for x in [-.96,-.36]:beam('Shelf_support',(x,2.27,1.05),(x,1.89,1.30),.028,'timber')
for x in [-.9,-.57]:bowl(x,2.04,1.36,.12,'clay')
lathe('Small_crock',(-.32,2.08,1.36),[(.07,0),(.09,.13),(.065,.18)],'ceramic',10)
# Hanging worn blue cloth, with one patch.
beam('Cloth_peg',(-3.89,-.62,1.8),(-3.68,-.62,1.8),.035,'wood_face')
mesh('Hanging_work_cloth',[(-3.86,-.88,1.76),(-3.84,-.40,1.76),(-3.73,-.37,.87),(-3.80,-.55,.91),(-3.71,-.74,.84),(-3.79,-.9,.89)],[(0,1,2,3,4,5)],'patch_blue')
box('Cloth_mend',(-3.72,-.60,1.12),(.012,.16,.17),'linen')

collection('05_Stove_and_water')
box('Earthen_stove',(1.39,1.71,.45),(1.45,1.05,.90),'plaster')
box('Stove_top',(1.39,1.71,.92),(1.49,1.08,.09),'soot')
box('Firebox_shadow',(1.40,1.173,.34),(.40,.015,.37),'iron')
for x in [1.14,1.66]:box('Firebox_side',(x,1.15,.36),(.11,.09,.43),'clay')
box('Firebox_arch',(1.40,1.15,.60),(.61,.10,.09),'clay')
lathe('Iron_cooking_pot',(1.35,1.66,.94),[(.22,0),(.34,.18),(.36,.25),(.33,.26),(.21,.025)],'iron',18)
lathe('Wooden_pot_lid',(1.35,1.66,1.205),[(0,.065),(.34,0),(.34,.03),(0,.08)],'wood_face',18)
box('Pot_lid_handle',(1.35,1.66,1.31),(.19,.04,.07),'timber')
box('Chimney_stack',(2.02,2.13,1.72),(.31,.34,1.61),'patch')
box('Chimney_soot',(2.02,2.13,2.57),(.34,.37,.11),'soot')
jar(.35,1.65,0,.94)
box('Chopping_board',(.70,.90,.035),(.47,.31,.07),'wood_edge')
for i in range(7):
    beam('Stove_firewood',(.9+(i%3)*.11,.76,.08+(i//3)*.09),(1.39+(i%3)*.11,.70,.08+(i//3)*.09),.044,'timber')

collection('06_Yard_fence_and_tools')
# Low uneven wattle fence frames depth without enclosing the picture like a model base.
for x in [2.7,3.45,4.2,4.95,5.7]:beam('Fence_post',(x,2.38,0),(x,2.38,1.04+random.uniform(-.09,.10)),.06,'timber')
for j in range(8):
    yy=2.38+(.035 if j%2 else -.035)
    beam('Wattle_fence',(2.7,yy,.16+j*.09),(5.8,yy,.16+j*.09),.022,'wood_face',4)
for x in [2.88+i*.16 for i in range(18)]:beam('Fence_warp',(x,2.39,.08),(x,2.39,.91),.013,'straw',4)
# Bare late-autumn tree, not a lush garden.
trunk=(5.17,1.63)
beam('Tree_trunk',(5.17,1.63,0),(5.04,1.68,1.78),.10,'timber')
for a,b,c in [((5.10,1.65,1.2),(4.58,1.61,2.08),(4.40,1.52,2.46)),((5.04,1.68,1.6),(5.54,1.78,2.18),(5.8,1.78,2.4)),((5.04,1.68,1.78),(4.99,1.72,2.63),(5.18,1.73,2.92))]:
    beam('Bare_branch',a,b,.047,'wood_face');beam('Bare_twig',b,c,.024,'wood_face')
    p=Vector(b);beam('Bare_twig',p,p+Vector((-.30,.13,.27)),.018,'wood_face')
for i in range(18):
    x=5.1+random.uniform(-.6,.6);y=1.5+random.uniform(-.6,.6)
    o=box('Fallen_leaf',(x,y,.013),(.075,.045,.015),'dry_leaf');o.rotation_euler.z=random.random()*6
basket(3.4,1.5,0,1.05);jar(3.15,.57,0,1.2)
for i in range(11):
    y=.94+(i%4)*.14;z=.08+(i//4)*.12
    beam('Yard_log',(3.68,y,z),(4.48,y+.04,z),.063,'wood_face')
beam('Broom_handle',(2.65,.13,.24),(2.80,.26,1.61),.026,'wood_face')
for i in range(15):beam('Broom_straw',(2.65+random.uniform(-.17,.17),.10+random.uniform(-.04,.04),.04),(2.69,.17,.57),.014,'straw_light',4)
for i in range(2):ring('Broom_binding',(2.69,.17,.35+i*.09),.045,.025,'cord')
# A spare carrying pole and hoe, stored against the rear wall.
beam('Carrying_pole',(3.0,2.12,.04),(3.61,2.15,1.63),.025,'wood_edge')
beam('Hoe_handle',(3.55,2.12,.04),(3.90,2.12,1.50),.027,'wood_face')
box('Hoe_blade',(3.94,2.12,1.50),(.28,.15,.045),'iron')
for x,y in [(4.2,-1.9),(5.5,-.6),(3.8,2.15)]:
    for j in range(5):beam('Dry_grass',(x,y,.01),(x+random.uniform(-.13,.13),y+random.uniform(-.12,.12),random.uniform(.12,.24)),.009,'straw',4)

# Reversible cutaway components: complete outer shell is available independently.
shell=collection('07_Removable_roof_and_front_wall')
box('Front_wall',(-.8,-2.40,1.46),(6.5,.22,2.92),'plaster')
box('East_wall_upper_rear',(2.43,.985,1.89),(.20,2.97,2.06),'plaster')
box('East_wall_upper_front',(2.43,-2.185,1.89),(.20,.55,2.06),'plaster')
box('East_door_lintel_wall',(2.43,-1.20,2.64),(.20,1.42,.56),'plaster')
for xx in [-4.02,2.43]:
    mesh('Closed_gable',[(xx,-2.49,2.92),(xx,2.53,2.92),(xx,.05,4.05)],[(0,1,2),(2,1,0)],'plaster')
for side in [-1,1]:
    mesh('Thatched_roof_plane',[(-4.35,.05,4.05),(2.76,.05,4.05),(2.76,.05+side*2.85,2.92),(-4.35,.05+side*2.85,2.92)],[(0,1,2,3),(3,2,1,0)],'straw')
    for j in range(4):
        for i in range(85):
            x=-4.30+i*.083
            t0=j/4;t1=min(1.025,(j+1)/4+random.uniform(.005,.025))
            beam('Thatch_bundle',(x,.05+side*2.85*t0,4.065-1.13*t0),(x+random.uniform(-.01,.01),.05+side*2.85*t1,4.065-1.13*t1),.026,'straw_light' if random.random()<.22 else 'straw',4)
beam('Plain_roof_ridge',(-4.40,.05,4.08),(2.80,.05,4.08),.13,'straw_light')
for yy in [-1.95,.05,2.05]:beam('Roof_timber',(-4.14,yy,3.08),(2.55,yy,3.08),.095,'timber')
shell.hide_render=True;shell.hide_viewport=True

anchors=[
 {'id':'liu_laolao_start','position':[-.85,-.85,.02],'purpose':'刘姥姥站位'},
 {'id':'gouer_start','position':[-.55,.48,.02],'purpose':'狗儿站位'},
 {'id':'liushi_start','position':[.50,-.48,.02],'purpose':'刘氏站位'},
 {'id':'baner_start','position':[.70,-1.47,.02],'purpose':'板儿站位'},
 {'id':'qinger_start','position':[-1.14,-1.76,.02],'purpose':'青儿备用站位'},
 {'id':'kang_front','position':[-2.55,.08,.02],'purpose':'炕前'},
 {'id':'door_inside','position':[1.75,-1.25,.02],'purpose':'室内门前'},
 {'id':'door_outside','position':[3.23,-1.25,.02],'purpose':'门外院内'},
 {'id':'yard_exit','position':[5.5,-1.65,.02],'purpose':'出门去城里的场景切换点'}
]
collection('08_Stage_anchors')
for a in anchors:
    o=bpy.data.objects.new(a['id'],None);COL.objects.link(o);o.location=a['position'];o.empty_display_type='PLAIN_AXES';o.empty_display_size=.12;o['purpose']=a['purpose'];x,y,z=a['position'];a['position_gltf']=[x,z,-y]

# Texture UVs in world metres keep all earthen walls and floors coherent.
for o in bpy.data.objects:
    if o.type!='MESH':continue
    uv=o.data.uv_layers.new(name='Pixel_pigment_UV')
    for p in o.data.polygons:
        axis=max(range(3),key=lambda a:abs(p.normal[a]));ds=[a for a in range(3) if a!=axis]
        for li in p.loop_indices:
            co=o.matrix_world@o.data.vertices[o.data.loops[li].vertex_index].co;uv.data[li].uv=(co[ds[0]]*.22,co[ds[1]]*.22)
    o['asset_role']='static_scene'

rig=collection('99_Cameras_and_lights');scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=40;scene.cycles.use_denoising=True
scene.render.resolution_x=1600;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.64,.70,.68,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.55
scene.view_settings.view_transform='AgX'
def camera(name,pos,target,scale):
    d=bpy.data.cameras.new(name);o=bpy.data.objects.new(name,d);COL.objects.link(o);o.location=pos;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();d.type='ORTHO';d.ortho_scale=scale;return o
main=camera('Camera_Story_Stage',(8.5,-15.5,9.6),(.25,.05,1),12.1)
close=camera('Camera_Interior',(5.7,-13,7.7),(-.7,.35,1.15),8.2)
outside=camera('Camera_Exterior',(10,-13,9),(.2,0,1.2),12.8)
def light(name,pos,energy,size,color,target):
    d=bpy.data.lights.new(name,'AREA');d.energy=energy;d.shape='DISK';d.size=size;d.color=color;o=bpy.data.objects.new(name,d);COL.objects.link(o);o.location=pos;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();return o
light('Warm_daylight',(-3,-4,8),1500,7,(1,.84,.61),(0,0,0))
light('Cool_sky_fill',(4,4,6),1100,6,(.64,.80,1),(0,0,.7))
scene.camera=main

# Existing approved sprites: demo only, not mixed into the static model export.
demo=collection('90_Character_scale_demo')
asset_root=ROOT.parents[1]/'assets'/'characters'
for name,aid,height in [('刘姥姥','liu_laolao_start',1.63),('狗儿','gouer_start',1.85),('刘氏','liushi_start',1.76),('板儿','baner_start',1.0)]:
    src=asset_root/{'刘姥姥':'granny','狗儿':'gouer','刘氏':'liushi','板儿':'baner'}[name]/'front.png'
    if not src.exists():raise FileNotFoundError(src)
    dst=ROOT/'textures'/(name+'_正面.png');shutil.copy2(src,dst)
    im=bpy.data.images.load(str(dst));im.pack()
    # Find alpha bounds without editing the image; put actual shoe pixels on floor.
    w,h=im.size;pix=list(im.pixels);xs=[];ys=[]
    for yy in range(h):
        for xx in range(w):
            if pix[(yy*w+xx)*4+3]>.3:xs.append(xx);ys.append(yy)
    bottom=min(ys)/h;top=(max(ys)+1)/h;plane_h=height/(top-bottom);plane_w=plane_h*w/h
    m=bpy.data.materials.new('Sprite_'+name);m.use_nodes=True;n=m.node_tree.nodes;n.clear()
    out=n.new('ShaderNodeOutputMaterial');mix=n.new('ShaderNodeMixShader');transparent=n.new('ShaderNodeBsdfTransparent');em=n.new('ShaderNodeEmission');tex=n.new('ShaderNodeTexImage');tex.image=im;tex.interpolation='Linear'
    m.node_tree.links.new(tex.outputs['Color'],em.inputs['Color']);em.inputs['Strength'].default_value=.85
    for a,b in [(tex.outputs['Alpha'],mix.inputs[0]),(transparent.outputs[0],mix.inputs[1]),(em.outputs[0],mix.inputs[2]),(mix.outputs[0],out.inputs[0])]:m.node_tree.links.new(a,b)
    o=mesh('Preview_'+name,[(-plane_w/2,0,-bottom*plane_h),(plane_w/2,0,-bottom*plane_h),(plane_w/2,0,plane_h*(1-bottom)),(-plane_w/2,0,plane_h*(1-bottom))],[(0,1,2,3)],m)
    uv=o.data.uv_layers.new()
    for p in o.data.polygons:
        for li in p.loop_indices:uv.data[li].uv=[(0,0),(1,0),(1,1),(0,1)][o.data.loops[li].vertex_index]
    o.location=next(a['position'] for a in anchors if a['id']==aid)
    direction=main.location-Vector(o.location);o.rotation_euler.z=math.atan2(direction.x,-direction.y)
    o['demo_only']=True
demo.hide_render=True;demo.hide_viewport=True

def export(name,include_shell=False):
    # Explicit selection prevents hidden demo planes/rig entering runtime geometry.
    shell.hide_viewport=False;demo.hide_viewport=False
    for o in bpy.context.scene.objects:o.select_set(False)
    for c in bpy.data.collections:
        if c.name in ['90_Character_scale_demo','99_Cameras_and_lights']:continue
        if c==shell and not include_shell:continue
        for o in c.objects:
            if o.type in ['MESH','EMPTY']:o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(ROOT/'models'/name),export_format='GLB',use_selection=True,export_extras=True,export_cameras=False,export_lights=False,export_animations=False)
    shell.hide_viewport=True;demo.hide_viewport=True
export('gouer_home_stage_v01.glb');export('gouer_home_complete_shell_v01.glb',True)

stats={'scene':'狗儿家','units':'metres / Blender Z-up; glTF Y-up','static_mesh_objects':sum(o.type=='MESH' for c in bpy.data.collections if c.name not in ['90_Character_scale_demo','99_Cameras_and_lights','07_Removable_roof_and_front_wall'] for o in c.objects),'triangles_stage':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for c in bpy.data.collections if c.name not in ['90_Character_scale_demo','99_Cameras_and_lights','07_Removable_roof_and_front_wall'] for o in c.objects if o.type=='MESH'),'anchors':anchors,'status':'static stage, no navigation mesh or animation controller'}
(ROOT/'metadata'/'stage_manifest.json').write_text(json.dumps(stats,ensure_ascii=False,indent=2),encoding='utf-8')
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.shading.type='MATERIAL';area.spaces.active.region_3d.view_perspective='CAMERA'
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'models'/'狗儿家_可编辑场景_v01.blend'))
def render(name,cam):
    scene.camera=cam;scene.render.filepath=str(ROOT/'renders'/name);bpy.ops.render.render(write_still=True);print('RENDERED',name,flush=True)
render('01_狗儿家_舞台全景.png',main)
render('02_狗儿家_室内细节.png',close)
demo.hide_render=False;render('03_人物比例与站位.png',main);demo.hide_render=True
shell.hide_render=False;render('04_完整屋舍外观.png',outside);shell.hide_render=True
scene.camera=main
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'models'/'狗儿家_可编辑场景_v01.blend'))
print('BUILD COMPLETE',flush=True)
