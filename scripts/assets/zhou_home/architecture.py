import bmesh
def pigment(name,color):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1)
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.88
    im=bpy.data.images.new('Pixel_'+name,width=32,height=32);r=random.Random(name);pixels=[]
    shades=[[r.choice([.94,.98,1,1,1,1.025,1.055]) for x in range(16)] for y in range(16)]
    for y in range(32):
        for x in range(32):pixels.extend([min(.99,c*shades[y//2][x//2]) for c in color]+[1])
    im.pixels=pixels;im.pack();tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im;tex.interpolation='Closest';m.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color']);M[name]=m
for n,c in {'wall_ivory':(.68,.65,.52),'wall_shadow':(.48,.48,.39),'roof_teal':(.075,.20,.21),'roof_jade':(.13,.28,.27),'roof_edge':(.20,.35,.31),'redwood':(.31,.09,.065),'red_panel':(.40,.13,.085),'stone_light':(.48,.52,.48),'stone_dark':(.32,.37,.36),'street':(.39,.39,.34),'joint':(.26,.28,.26),'bronze':(.44,.31,.12),'lantern':(.52,.18,.105),'gold_paint':(.72,.53,.24),'pine':(.12,.29,.22)}.items():pigment(n,c)

def ellipsoid(name,pos,scale,mat,sub=1):
    d=bpy.data.meshes.new(name);bm=bmesh.new();bmesh.ops.create_icosphere(bm,subdivisions=sub,radius=1);bm.to_mesh(d);bm.free()
    o=bpy.data.objects.new(name,d);COL.objects.link(o);o.location=pos;o.scale=scale;o.data.materials.append(M[mat]);return o
def roof(name,x,y,z,w,d,h):
    # A compact hipped roof with raised eaves, actual thickness and no floating ribs.
    vs=[];fs=[];levels=[(0,.14),(.13,0),(.42,.30),(.72,.69),(1,1)]
    for t,hh in levels:
        a=w/2-(d/2-.08)*t;b=max(.035,d/2*(1-t))
        for xx,yy in [(-a,-b),(0,-b),(a,-b),(a,0),(a,b),(0,b),(-a,b),(-a,0)]:
            tip=.15*(abs(xx)/a)**4*(abs(yy)/max(b,.01))**4*(1-t)**3
            vs.append((x+xx,y+yy,z+hh*h+tip))
    for k in range(4):
        for i in range(8):fs.append((k*8+i,k*8+(i+1)%8,(k+1)*8+(i+1)%8,(k+1)*8+i))
    fs.append(tuple(range(32,40)))
    o=mesh(name,vs,fs,'roof_teal');o.data.materials.append(M['roof_jade']);o.data.materials.append(M['roof_edge'])
    for i,p in enumerate(o.data.polygons):p.material_index=2 if i<8 else (1 if i%4==1 else 0)
    half=max(.1,w/2-d/2)
    beam('Tile_ridge',(x-half,y,z+h+.05),(x+half,y,z+h+.05),.075,'roof_edge',6)
    for s in [-1,1]:
        beam('Ridge_end',(x+s*half,y,z+h+.05),(x+s*(half+.17),y,z+h+.28),.055,'roof_edge')
        for xx in [-half+.08+i*.19 for i in range(max(1,int((2*half-.16)/.19)))]:
            pp=[(x+xx,y+s*d/2*(1-t),z+h*hh+.018) for t,hh in levels[:-1]]
            for a,b in zip(pp,pp[1:]):beam('Tile_course',a,b,.022,'roof_jade',5)
        for i in range(int(w/.18)):
            xx=x-w/2+.09+i*.18
            cyl_o=cyl('Eave_tile_end',(xx,y+s*(d/2-.045),z+.12*h),.044,.10,'roof_edge',8);cyl_o.rotation_euler.x=math.pi/2
    return o
def plaque(text,x,y,z,width):
    box('Plaque_board',(x,y,z),(width,.11,.54),'roof_teal')
    for zz in [z-.275,z+.275]:box('Plaque_frame',(x,y-.06,zz),(width+.08,.035,.04),'gold_paint')
    for xx in [x-width/2,x+width/2]:box('Plaque_frame',(xx,y-.06,z),(.04,.035,.55),'gold_paint')
    font=bpy.data.curves.new('Rongguo_plaque_text','FONT');font.body=text;font.align_x='CENTER';font.align_y='CENTER';font.size=.34;font.space_character=1.35;font.extrude=.004;font.font=bpy.data.fonts.load('C:/Windows/Fonts/simkai.ttf')
    o=bpy.data.objects.new('荣国府_匾额',font);COL.objects.link(o);o.location=(x,y-.065,z);o.rotation_euler.x=math.pi/2;font.materials.append(M['gold_paint'])
    for obj in bpy.context.selected_objects:obj.select_set(False)
    o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');o.select_set(False)
def lantern(x,y,z,s=1):
    beam('Lantern_bracket',(x,y+.28,z+.48*s),(x,y,z+.48*s),.025,'iron')
    beam('Lantern_hanger',(x,y,z+.48*s),(x,y,z+.29*s),.015,'iron')
    lathe('Lantern_shade',(x,y,z),[(.13*s,-.24*s),(.21*s,-.14*s),(.22*s,.14*s),(.13*s,.24*s)],'lantern',10)
    for zz in [-.25,.25]:cyl('Lantern_cap',(x,y,z+zz*s),.15*s,.045*s,'wood_face',10)
    for i in range(10):
        a=i*math.tau/10;beam('Lantern_rib',(x+.145*s*math.cos(a),y+.145*s*math.sin(a),z-.23*s),(x+.145*s*math.cos(a),y+.145*s*math.sin(a),z+.23*s),.008,'bronze',4)
    for i in range(5):beam('Lantern_tassel',(x+(i-2)*.017,y,z-.28*s),(x+(i-2)*.020,y,z-.52*s),.009,'lantern',4)
def wall(x0,x1,y,h=3.05):
    box('Boundary_wall',((x0+x1)/2,y,h/2),(x1-x0,.30,h),'wall_ivory')
    box('Wall_stone_dado',((x0+x1)/2,y-.015,.31),(x1-x0,.34,.62),'stone_dark')
    box('Wall_cap',((x0+x1)/2,y,h+.04),(x1-x0+.08,.43,.13),'roof_teal')
    for xx in [x0+.18+i*.36 for i in range(int((x1-x0)/.36))]:
        beam('Wall_cap_tile',(xx,y-.23,h+.07),(xx,y+.23,h+.07),.065,'roof_jade',5)
    for z in [.15,.43]:
        for i in range(int((x1-x0)/.6)):
            xx=x0+.1+i*.6+(.25 if z>.2 else 0)
            if xx<x1:box('Dado_brick_joint',(xx,y-.19,z),(.008,.008,.25),'joint')
