"""Shared scene geometry and pigment palette; copied from approved scene 01."""
import bpy, math, random, json, shutil
from pathlib import Path
from mathutils import Vector

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
