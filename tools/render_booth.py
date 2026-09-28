"""Photoreal Snap Box booth scene for Cycles.

Usage (needs `pip install bpy` on Python 3.11):
  python3 tools/render_booth.py <out_dir> <res_x> <res_y> <samples> [shot ...]
Renders the shots in SHOTS (all by default) with a depth pass, and writes shots.json with the
projected screen corners and booth position of every shot. Then run tools/convert_renders.py <out_dir>.
"""
import sys, os, math, json, random
import bpy, bmesh
from mathutils import Vector, Matrix, Euler
from bpy_extras.object_utils import world_to_camera_view

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.abspath(os.path.join(HERE, '..', 'assets'))
out_dir, RX, RY, SAMPLES = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
shots_arg = sys.argv[5:]

# camera per page section: azimuth (deg), elevation (deg), distance, look-at height, horizontal lens shift
SHOTS = {
    'hero':    dict(az=25, el=8, dist=7.4, tz=1.33, shift=0.2),
    'package': dict(az=58, el=7, dist=6.9, tz=1.36, shift=0.2),
    'try':     dict(az=4, el=4, dist=4.9, tz=1.58, shift=0.17),
    'contact': dict(az=-28, el=9, dist=7.3, tz=1.33, shift=0.2),
}
TARGET = Vector((0, 0, 1.33))

random.seed(7)
rand = random.uniform

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
os.makedirs(out_dir, exist_ok=True)

# ---------------------------------------------------------------- helpers
def mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    return m, m.node_tree.nodes, m.node_tree.links, m.node_tree.nodes['Principled BSDF']

def hexcol(h, a=1.0):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return (*lin, a)

def link(obj):
    bpy.context.collection.objects.link(obj)
    return obj

def mesh_obj(name, verts, faces, material=None, smooth=True):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    if smooth:
        me.shade_smooth()
    ob = link(bpy.data.objects.new(name, me))
    if material:
        ob.data.materials.append(material)
    return ob

def add(op, **kw):
    op(**kw)
    return bpy.context.active_object

def set_mat(ob, m):
    ob.data.materials.clear()
    ob.data.materials.append(m)
    return ob

def bevel(ob, width, segments=6):
    mod = ob.modifiers.new('bevel', 'BEVEL')
    mod.width = width
    mod.segments = segments
    mod.limit_method = 'NONE'
    mod.harden_normals = False
    return mod

def smooth(ob):
    for p in ob.data.polygons:
        p.use_smooth = True

def look_at(ob, target):
    d = Vector(target) - ob.location
    ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()

# ---------------------------------------------------------------- materials
def oak(name='Oak', tint=None, scale=1.0):
    m, n, l, bsdf = mat(name)
    tc = n.new('ShaderNodeTexCoord')
    mp = n.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1.0 * scale, 1.0 * scale, 1.0 * scale)
    l.new(tc.outputs['Object'], mp.inputs['Vector'])
    # growth rings
    wave = n.new('ShaderNodeTexWave'); wave.wave_type = 'RINGS'; wave.rings_direction = 'Z'
    wave.inputs['Scale'].default_value = 1.6; wave.inputs['Distortion'].default_value = 2.2
    wave.inputs['Detail'].default_value = 3.0; wave.inputs['Detail Scale'].default_value = 1.2
    l.new(mp.outputs['Vector'], wave.inputs['Vector'])
    # fine pores/streaks stretched along the grain
    mp2 = n.new('ShaderNodeMapping'); mp2.inputs['Scale'].default_value = (60, 60, 2.5)
    l.new(tc.outputs['Object'], mp2.inputs['Vector'])
    noise = n.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 9.0; noise.inputs['Detail'].default_value = 8.0
    l.new(mp2.outputs['Vector'], noise.inputs['Vector'])
    ramp = n.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.2; ramp.color_ramp.elements[0].color = hexcol('#d2b186')
    ramp.color_ramp.elements[1].position = 0.95; ramp.color_ramp.elements[1].color = hexcol('#a47a4a')
    l.new(wave.outputs['Fac'], ramp.inputs['Fac'])
    streak = n.new('ShaderNodeValToRGB')
    streak.color_ramp.elements[0].position = 0.38; streak.color_ramp.elements[0].color = (0.7, 0.64, 0.56, 1)
    streak.color_ramp.elements[1].position = 0.62; streak.color_ramp.elements[1].color = (1, 1, 1, 1)
    l.new(noise.outputs['Fac'], streak.inputs['Fac'])
    mix = n.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs['Factor'].default_value = 1.0
    l.new(ramp.outputs['Color'], mix.inputs[6]); l.new(streak.outputs['Color'], mix.inputs[7])
    col = mix.outputs[2]
    if tint:
        mt = n.new('ShaderNodeMix'); mt.data_type = 'RGBA'; mt.blend_type = 'MULTIPLY'; mt.inputs['Factor'].default_value = 1.0
        l.new(col, mt.inputs[6]); mt.inputs[7].default_value = hexcol(tint)
        col = mt.outputs[2]
    l.new(col, bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.5
    bsdf.inputs['Coat Weight'].default_value = 0.35
    bsdf.inputs['Coat Roughness'].default_value = 0.12
    bsdf.inputs['Sheen Weight'].default_value = 0.15
    bump = n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.18; bump.inputs['Distance'].default_value = 0.002
    l.new(noise.outputs['Fac'], bump.inputs['Height'])
    l.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return m

def metal(name, color, rough):
    m, n, l, b = mat(name)
    b.inputs['Base Color'].default_value = hexcol(color)
    b.inputs['Metallic'].default_value = 1.0
    b.inputs['Roughness'].default_value = rough
    return m

def plastic(name, color, rough, coat=0.0):
    m, n, l, b = mat(name)
    b.inputs['Base Color'].default_value = hexcol(color)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Coat Weight'].default_value = coat
    return m

def emissive(name, color, strength):
    m, n, l, b = mat(name)
    b.inputs['Base Color'].default_value = (0, 0, 0, 1)
    b.inputs['Emission Color'].default_value = hexcol(color)
    b.inputs['Emission Strength'].default_value = strength
    return m

OAK = oak()
OAK_LIGHT = oak('OakFrame', tint='#fff4e6', scale=2.0)
OAK_LEG = oak('OakLeg', scale=3.0)
BRASS = metal('Brass', '#c9a263', 0.22)
GRAPHITE = metal('Graphite', '#2a2826', 0.38)
BLACK_GLASS = plastic('Bezel', '#070708', 0.08, coat=1.0)

# screen with the booth photo
def screen_mat():
    m, n, l, b = mat('Screen')
    img = n.new('ShaderNodeTexImage')
    img.image = bpy.data.images.load(os.path.join(ASSETS, 'screen.jpg'))
    b.inputs['Base Color'].default_value = (0.01, 0.01, 0.01, 1)
    l.new(img.outputs['Color'], b.inputs['Emission Color'])
    b.inputs['Emission Strength'].default_value = 1.6
    b.inputs['Roughness'].default_value = 0.04
    b.inputs['Coat Weight'].default_value = 1.0
    b.inputs['Coat Roughness'].default_value = 0.02
    return m
SCREEN = screen_mat()

# ---------------------------------------------------------------- booth
BW, BH, BD, BY = 0.92, 1.0, 0.84, 1.52
FRONT = -BD / 2

body = add(bpy.ops.mesh.primitive_cube_add, size=1, location=(0, 0, BY))
body.scale = (BW, BD, BH)
bpy.ops.object.transform_apply(scale=True)
bevel(body, 0.085, 10); smooth(body); set_mat(body, OAK)

frame = add(bpy.ops.mesh.primitive_cube_add, size=1, location=(0, FRONT - 0.02, BY - 0.08))
frame.scale = (0.44, 0.045, 0.6)
bpy.ops.object.transform_apply(scale=True)
bevel(frame, 0.016, 5); smooth(frame); set_mat(frame, OAK_LIGHT)

bez = add(bpy.ops.mesh.primitive_plane_add, size=1, location=(0, FRONT - 0.0431, BY - 0.08))
bez.rotation_euler = (math.radians(90), 0, 0); bez.scale = (0.372, 0.51, 1)
set_mat(bez, BLACK_GLASS)
scr = add(bpy.ops.mesh.primitive_plane_add, size=1, location=(0, FRONT - 0.0436, BY - 0.08))
scr.rotation_euler = (math.radians(90), 0, 0); scr.scale = (0.34, 0.472, 1)
set_mat(scr, SCREEN)
bpy.ops.object.transform_apply(rotation=True, scale=True)
# image UVs: plane default UVs map the full image; flip handled by rotation
SCREEN_CORNERS_LOCAL = None

lens = add(bpy.ops.mesh.primitive_cylinder_add, radius=0.03, depth=0.03, location=(0, FRONT - 0.01, BY + 0.255), vertices=48)
lens.rotation_euler = (math.radians(90), 0, 0); smooth(lens); set_mat(lens, GRAPHITE)
lg = add(bpy.ops.mesh.primitive_circle_add, radius=0.02, fill_type='NGON', location=(0, FRONT - 0.0255, BY + 0.255), vertices=48)
lg.rotation_euler = (math.radians(90), 0, 0); set_mat(lg, plastic('LensGlass', '#0a1224', 0.02, coat=1.0))

# brass lettering
FONT_N = bpy.data.fonts.load(os.path.join(HERE, 'fonts', 'latin-600-normal.ttf'))
FONT_I = bpy.data.fonts.load(os.path.join(HERE, 'fonts', 'latin-500-italic.ttf'))
def text(body_txt, size, loc, rot, font=FONT_N, align='CENTER', extrude=0.0025):
    bpy.ops.object.text_add(location=loc, rotation=rot)
    t = bpy.context.active_object
    t.data.body = body_txt
    t.data.font = font
    t.data.size = size
    t.data.align_x = align
    t.data.align_y = 'CENTER'
    t.data.extrude = extrude
    t.data.bevel_depth = 0.0006
    t.data.bevel_resolution = 2
    t.data.space_character = 1.12
    t.data.materials.append(BRASS)
    return t

front_rot = (math.radians(90), 0, 0)
text('SMILE  HERE', 0.062, (0, FRONT - 0.003, BY + 0.36), front_rot)
# thin cartouche under the lettering
cart = add(bpy.ops.mesh.primitive_torus_add, major_radius=0.25, minor_radius=0.0016, location=(0, FRONT - 0.002, BY + 0.36), major_segments=96, minor_segments=8)
cart.rotation_euler = (math.radians(90), 0, 0); cart.scale = (1.0, 0.24, 1.0); set_mat(cart, BRASS)

side_rot = (math.radians(90), 0, math.radians(90))
SX = BW / 2 + 0.003
text('S', 0.42, (SX, -0.24, BY - 0.02), side_rot, FONT_I, 'LEFT', 0.003)
text('NAP', 0.17, (SX, -0.03, BY + 0.1), side_rot, FONT_N, 'LEFT', 0.003)
text('BOX', 0.17, (SX, -0.06, BY - 0.1), side_rot, FONT_N, 'LEFT', 0.003)
back_rot = (math.radians(90), 0, math.radians(-90))
text('SNAP', 0.19, (-SX, 0, BY + 0.06), back_rot, FONT_N, 'CENTER', 0.003)
text('box', 0.15, (-SX, 0, BY - 0.12), back_rot, FONT_I, 'CENTER', 0.003)

# mount + tripod
mount = add(bpy.ops.mesh.primitive_cone_add, radius1=0.095, radius2=0.075, depth=0.07, location=(0, 0, BY - BH / 2 - 0.035), vertices=48)
smooth(mount); set_mat(mount, GRAPHITE)
hub = Vector((0, 0, BY - BH / 2 - 0.06))
for a in (math.pi * 0.22, math.pi * 0.78, math.pi * 1.5):
    foot = Vector((math.cos(a) * 0.62, math.sin(a) * 0.62, 0.0))
    d = hub - foot
    leg = add(bpy.ops.mesh.primitive_cone_add, radius1=0.021, radius2=0.027, depth=d.length, vertices=24, location=foot + d / 2)
    leg.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    smooth(leg); set_mat(leg, OAK_LEG)
    cap = add(bpy.ops.mesh.primitive_cylinder_add, radius=0.024, depth=0.02, location=(foot.x, foot.y, 0.01), vertices=24)
    smooth(cap); set_mat(cap, BRASS)

# ring light
R = 0.3
RING_Z = BY + BH / 2 + 0.16 + R
ring_root = add(bpy.ops.object.empty_add, location=(0, -0.02, RING_Z))
ring_root.rotation_euler = (math.radians(90 - 5), 0, 0)
stem = add(bpy.ops.mesh.primitive_cylinder_add, radius=0.011, depth=0.18, location=(0, -0.02, BY + BH / 2 + 0.09), vertices=16)
smooth(stem); set_mat(stem, GRAPHITE)
def ring_child(ob):
    ob.parent = ring_root
    return ob
tor = add(bpy.ops.mesh.primitive_torus_add, major_radius=R, minor_radius=0.021, major_segments=160, minor_segments=24)
smooth(tor); set_mat(tor, GRAPHITE); ring_child(tor)
disc = add(bpy.ops.mesh.primitive_circle_add, radius=R - 0.01, fill_type='NGON', vertices=128, location=(0, 0, 0.004))
set_mat(disc, emissive('RingLight', '#fff6ec', 9.0)); ring_child(disc)
disc.rotation_euler = (math.radians(180), 0, 0)
back = add(bpy.ops.mesh.primitive_circle_add, radius=R - 0.004, fill_type='NGON', vertices=96, location=(0, 0, -0.005))
set_mat(back, GRAPHITE); ring_child(back)
yoke = add(bpy.ops.mesh.primitive_torus_add, major_radius=R + 0.045, minor_radius=0.007, major_segments=96, minor_segments=10)
smooth(yoke); set_mat(yoke, GRAPHITE); ring_child(yoke)
# keep only the lower half of the yoke
bm = bmesh.new(); bm.from_mesh(yoke.data)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y > 0.0], context='VERTS')
bm.to_mesh(yoke.data); bm.free()
for s in (-1, 1):
    k = add(bpy.ops.mesh.primitive_cylinder_add, radius=0.017, depth=0.03, location=(s * (R + 0.045), 0, 0), vertices=24)
    k.rotation_euler = (0, math.radians(90), 0); smooth(k); set_mat(k, BRASS); ring_child(k)

# ---------------------------------------------------------------- rug + floor (shadow catcher)
def jute():
    m, n, l, b = mat('Jute')
    tc = n.new('ShaderNodeTexCoord')
    wave = n.new('ShaderNodeTexWave'); wave.wave_type = 'RINGS'; wave.rings_direction = 'Z'
    wave.inputs['Scale'].default_value = 34; wave.inputs['Distortion'].default_value = 0.8; wave.inputs['Detail'].default_value = 2
    l.new(tc.outputs['Object'], wave.inputs['Vector'])
    noise = n.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 180; noise.inputs['Detail'].default_value = 4
    l.new(tc.outputs['Object'], noise.inputs['Vector'])
    ramp = n.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = hexcol('#8f7148'); ramp.color_ramp.elements[1].color = hexcol('#d9c39a')
    mixv = n.new('ShaderNodeMath'); mixv.operation = 'MULTIPLY'
    l.new(wave.outputs['Fac'], mixv.inputs[0]); l.new(noise.outputs['Fac'], mixv.inputs[1])
    l.new(mixv.outputs[0], ramp.inputs['Fac'])
    l.new(ramp.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.95
    b.inputs['Sheen Weight'].default_value = 0.4
    bump = n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 1.0
    l.new(mixv.outputs[0], bump.inputs['Height']); l.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m
rug = add(bpy.ops.mesh.primitive_cylinder_add, radius=1.2, depth=0.012, location=(0, 0, 0.006), vertices=160)
bevel(rug, 0.005, 3); smooth(rug); set_mat(rug, jute())

floor = add(bpy.ops.mesh.primitive_plane_add, size=60, location=(0, 0, 0))
floor.is_shadow_catcher = True
set_mat(floor, plastic('Floor', '#efe9df', 0.6))

# ---------------------------------------------------------------- moon arch + botanicals
AR, AY, AZ = 1.42, 1.05, 1.48
arch = add(bpy.ops.mesh.primitive_torus_add, major_radius=AR, minor_radius=0.018, major_segments=256, minor_segments=16, location=(0, AY, AZ))
arch.rotation_euler = (math.radians(90), 0, 0); smooth(arch); set_mat(arch, BRASS)
base = add(bpy.ops.mesh.primitive_cylinder_add, radius=0.3, depth=0.03, location=(0, AY, 0.015), vertices=64)
bevel(base, 0.006, 3); smooth(base); set_mat(base, BRASS)

def arc_pt(deg, radial=0.0, depth=0.0):
    a = math.radians(deg)
    return Vector((math.cos(a) * (AR + radial), AY + depth, AZ + math.sin(a) * (AR + radial)))

def leaf_mesh(name, w):
    verts, faces = [], []
    NU, NV = 6, 10
    for j in range(NV + 1):
        v = j / NV
        for i in range(NU + 1):
            u = i / NU * 2 - 1
            x = u * w * (math.sin(math.pi * min(1, v * 0.95 + 0.05)) ** 0.85)
            verts.append((x, -(x * x) * 1.6 + math.sin(math.pi * v) * 0.06, v))
    for j in range(NV):
        for i in range(NU):
            a = j * (NU + 1) + i
            faces.append((a, a + 1, a + NU + 2, a + NU + 1))
    return mesh_obj(name, verts, faces)

def foliage_mat():
    m, n, l, b = mat('Leaf')
    info = n.new('ShaderNodeObjectInfo')
    ramp = n.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = hexcol('#56684b'); ramp.color_ramp.elements[1].color = hexcol('#a4b39a')
    l.new(info.outputs['Random'], ramp.inputs['Fac'])
    l.new(ramp.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.45
    b.inputs['Sheen Weight'].default_value = 0.35
    b.inputs['Coat Weight'].default_value = 0.1
    return m
LEAF = foliage_mat()
leaf_a = leaf_mesh('leafA', 0.34); leaf_b = leaf_mesh('leafB', 0.55)
for lf in (leaf_a, leaf_b):
    set_mat(lf, LEAF); lf.hide_render = True; lf.hide_viewport = True

def rose_mesh():
    verts, faces = [], []
    N = 24
    for p in range(N):
        t = p / (N - 1)
        size = 0.38 + t * 0.78
        open_ = 0.1 + (t ** 1.4) * 1.25
        r = 0.04 + t * 0.32
        ang = p * 2.39996
        base_i = len(verts)
        NU, NV = 7, 7
        for j in range(NV + 1):
            v = j / NV
            for i in range(NU + 1):
                u = i / NU - 0.5
                x = u * (0.25 + 0.75 * math.sin(math.pi * min(1, v * 0.92 + 0.08)))
                y = -(x * x) * 1.6 + v * v * 0.35     # cup + curl
                z = v
                x *= size * (0.9 + t * 0.35); y *= size; z *= size
                # tilt outward around local X, then push out, then rotate around Z (up)
                cy, sy = math.cos(open_), math.sin(open_)
                y2 = y * cy - z * sy; z2 = y * sy + z * cy
                y2 -= r
                ca, sa = math.cos(ang), math.sin(ang)
                verts.append((x * ca - y2 * sa, x * sa + y2 * ca, z2 - t * 0.18))
        for j in range(NV):
            for i in range(NU):
                a = base_i + j * (NU + 1) + i
                faces.append((a, a + 1, a + NU + 2, a + NU + 1))
    return mesh_obj('rose', verts, faces)

def rose_mat():
    m, n, l, b = mat('Rose')
    info = n.new('ShaderNodeObjectInfo')
    ramp = n.new('ShaderNodeValToRGB')
    ramp.color_ramp.interpolation = 'CONSTANT'
    els = ramp.color_ramp.elements
    els[0].position = 0.0; els[0].color = hexcol('#f7eee6')
    els[1].position = 0.4; els[1].color = hexcol('#efd2c6')
    e3 = els.new(0.7); e3.color = hexcol('#e2b4a5')
    l.new(info.outputs['Random'], ramp.inputs['Fac'])
    l.new(ramp.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.55
    b.inputs['Subsurface Weight'].default_value = 0.35
    b.inputs['Subsurface Radius'].default_value = (0.02, 0.01, 0.008)
    b.inputs['Sheen Weight'].default_value = 0.6
    return m
ROSE = rose_mat()
rose_proto = rose_mesh(); set_mat(rose_proto, ROSE); rose_proto.hide_render = True; rose_proto.hide_viewport = True
bloom_proto = add(bpy.ops.mesh.primitive_ico_sphere_add, subdivisions=2, radius=1)
smooth(bloom_proto); set_mat(bloom_proto, plastic('Gyps', '#fbf8f2', 0.8)); bloom_proto.hide_render = True; bloom_proto.hide_viewport = True

def instance(proto, loc, rot, scale):
    ob = link(bpy.data.objects.new(proto.name + '_i', proto.data))
    ob.location = loc; ob.rotation_euler = rot; ob.scale = (scale, scale, scale)
    return ob

clusters = [dict(frm=188, to=300, leaves=620, roses=12, center=238), dict(frm=20, to=78, leaves=260, roses=6, center=48)]
for cl in clusters:
    for i in range(cl['leaves']):
        t = random.random()
        deg = cl['frm'] + (cl['to'] - cl['frm']) * t
        thick = math.sin(math.pi * t) ** 0.8
        loc = arc_pt(deg, rand(-0.16, 0.2) * thick, rand(-0.15, 0.15) * thick)
        a = math.radians(deg)
        rot = Euler((rand(-1.2, 1.2), rand(-1.2, 1.2), 0))
        # orient leaves roughly along the arc, alternating directions
        rot = (Matrix.Rotation(math.radians(90), 4, 'X') @ Matrix.Rotation(a + (1 if i % 2 else -1) * rand(0.4, 1.6) - math.pi / 2, 4, 'Z') @ rot.to_matrix().to_4x4()).to_euler()
        instance(leaf_b if i % 2 else leaf_a, loc, rot, rand(0.06, 0.12) * (0.55 + 0.45 * thick))
    for r in range(cl['roses']):
        spread = (cl['to'] - cl['frm']) * 0.3
        loc = arc_pt(cl['center'] + rand(-spread, spread), rand(-0.1, 0.12), rand(-0.17, -0.04))
        rot = Euler((math.radians(90) + rand(-0.5, 0.2), rand(-0.4, 0.4), rand(0, 6.28)))
        instance(rose_proto, loc, rot, rand(0.075, 0.11))
    for g in range(90 if cl['roses'] > 8 else 40):
        deg = cl['frm'] + (cl['to'] - cl['frm']) * rand(0.1, 0.9)
        instance(bloom_proto, arc_pt(deg, rand(-0.2, 0.24), rand(-0.2, 0.05)), (0, 0, 0), rand(0.007, 0.013))

# ---------------------------------------------------------------- vases + pampas (hair)
def vase(x, y, s, color, stems):
    prof = [(0.0, 0), (0.1, 0), (0.15, 0.06), (0.19, 0.22), (0.2, 0.38), (0.16, 0.56), (0.09, 0.7), (0.075, 0.78), (0.09, 0.8)]
    verts, faces = [], []
    SEG = 72
    for k in range(SEG):
        a = k / SEG * math.tau
        for (r, z) in prof:
            verts.append((math.cos(a) * r * s + x, math.sin(a) * r * s + y, z * s))
    P = len(prof)
    for k in range(SEG):
        k2 = (k + 1) % SEG
        for j in range(P - 1):
            faces.append((k * P + j, k2 * P + j, k2 * P + j + 1, k * P + j + 1))
    m, n, l, b = mat('Vase%.1f' % x)
    b.inputs['Base Color'].default_value = hexcol(color)
    b.inputs['Roughness'].default_value = 0.7
    b.inputs['Coat Weight'].default_value = 0.2
    nz = n.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 60
    bump = n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.08
    l.new(nz.outputs['Fac'], bump.inputs['Height']); l.new(bump.outputs['Normal'], b.inputs['Normal'])
    mesh_obj('vase', verts, faces, m)
    for i in range(stems):
        ang = rand(0, math.tau); lean = rand(0.12, 0.55); h = rand(1.0, 1.55)
        top = Vector((x + math.cos(ang) * lean * s, y + math.sin(ang) * lean * 0.6 * s, (0.78 + h) * s))
        start = Vector((x, y, 0.7 * s))
        mid = start.lerp(top, 0.55); mid.x = x + (top.x - x) * 0.35; mid.y = y + (top.y - y) * 0.35
        cu = bpy.data.curves.new('stem', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 0.004 * s; cu.bevel_resolution = 1
        sp = cu.splines.new('BEZIER'); sp.bezier_points.add(1)
        p0, p1 = sp.bezier_points
        p0.co = start; p0.handle_left = start; p0.handle_right = mid
        p1.co = top; p1.handle_left = mid; p1.handle_right = top + (top - mid).normalized() * 0.05
        so = link(bpy.data.objects.new('stem', cu)); so.data.materials.append(STEM)
        # plume: one mesh made of hundreds of fine curved fibres
        tan = (top - mid).normalized()
        q = tan.to_track_quat('Z', 'Y')
        verts, faces = [], []
        L = rand(0.42, 0.6) * s
        for k in range(520):
            t = random.random() ** 0.8
            spread = math.sin(math.pi * min(1, (1 - t) * 1.05 + 0.05)) * 1.0 + 0.12
            a = random.random() * math.tau
            axis = Vector((math.cos(a), math.sin(a), 0))
            fq = q @ Matrix.Rotation(spread * rand(0.7, 1.1), 3, axis).to_quaternion()
            root = top + (q @ Vector((0, 0, t * L)))
            fl = rand(0.09, 0.17) * s * (1.1 - t * 0.5)
            w = 0.006 * s
            base = len(verts)
            for j in range(4):
                v = j / 3
                off = fq @ Vector((0, v * v * 0.02 * s, v * fl))
                side = fq @ Vector((w * (1 - v * 0.8), 0, 0))
                verts.append(tuple(root + off - side)); verts.append(tuple(root + off + side))
            for j in range(3):
                b0 = base + j * 2
                faces.append((b0, b0 + 1, b0 + 3, b0 + 2))
        mesh_obj('plume', verts, faces, PLUME, smooth=True)

STEM = plastic('Stem', '#c9b58f', 0.8)
def plume_mat():
    m, n, l, b = mat('Plume')
    info = n.new('ShaderNodeObjectInfo')
    b.inputs['Base Color'].default_value = hexcol('#e9d8b6')
    b.inputs['Roughness'].default_value = 0.7
    b.inputs['Sheen Weight'].default_value = 1.0
    b.inputs['Sheen Tint'].default_value = hexcol('#fff3dc')
    b.inputs['Subsurface Weight'].default_value = 0.0
    return m
PLUME = plume_mat()

vase(-1.95, 0.45, 1.0, '#e4dacb', 8)
vase(-1.35, 1.75, 0.78, '#c8a88e', 5)

# ---------------------------------------------------------------- lights, world, camera
def area(name, loc, size, power, color, target=TARGET, shape='DISK'):
    li = bpy.data.lights.new(name, 'AREA'); li.shape = shape; li.size = size; li.energy = power; li.color = color
    ob = link(bpy.data.objects.new(name, li)); ob.location = loc; look_at(ob, target)
    return ob
area('Key', (-4.2, -5.0, 6.0), 3.5, 1150, (1.0, 0.93, 0.84))
area('Fill', (5.0, -4.0, 2.4), 3.0, 300, (0.93, 0.96, 1.0))
area('Rim', (2.2, 5.0, 4.5), 2.5, 900, (1.0, 0.88, 0.72))
area('Top', (0, 0, 7.5), 4.0, 350, (1.0, 0.98, 0.95), target=(0, 0, 0))

world = bpy.data.worlds.new('World'); scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes['Background']
bg.inputs['Color'].default_value = hexcol('#efe9df'); bg.inputs['Strength'].default_value = 0.55

cam_data = bpy.data.cameras.new('Cam'); cam_data.lens = 50
cam_data.dof.use_dof = True; cam_data.dof.aperture_fstop = 5.6
cam = link(bpy.data.objects.new('Cam', cam_data)); scene.camera = cam

# ---------------------------------------------------------------- render settings
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = SAMPLES
scene.cycles.use_adaptive_sampling = True
scene.cycles.adaptive_threshold = 0.015
scene.cycles.use_denoising = True
scene.cycles.denoiser = 'OPENIMAGEDENOISE'
scene.cycles.max_bounces = 8
scene.cycles.caustics_reflective = False; scene.cycles.caustics_refractive = False
scene.render.film_transparent = True
scene.render.resolution_x, scene.render.resolution_y = RX, RY
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Base Contrast'
scene.view_settings.exposure = 0.0
scene.render.threads_mode = 'AUTO'

def place_camera(sh):
    tgt = Vector((0, 0, sh['tz']))
    az, el = math.radians(sh['az']), math.radians(sh['el'])
    cam.location = tgt + Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el))) * sh['dist']
    look_at(cam, tgt)
    cam_data.shift_x = sh['shift']
    cam_data.dof.focus_distance = (cam.location - Vector((0, 0, BY))).length

# depth (mist) pass -> separate grayscale image for the 2.5D parallax on the site
vl = scene.view_layers[0]
vl.use_pass_mist = True
world.mist_settings.start = 3.0
world.mist_settings.depth = 9.0
world.mist_settings.falloff = 'LINEAR'
scene.use_nodes = True
nt = scene.node_tree
for nd in list(nt.nodes):
    nt.nodes.remove(nd)
rl = nt.nodes.new('CompositorNodeRLayers')
comp = nt.nodes.new('CompositorNodeComposite')
nt.links.new(rl.outputs['Image'], comp.inputs['Image'])
nt.links.new(rl.outputs['Alpha'], comp.inputs['Alpha'])
fo = nt.nodes.new('CompositorNodeOutputFile')
fo.base_path = out_dir
fo.format.file_format = 'PNG'; fo.format.color_mode = 'BW'; fo.format.color_depth = '16'
nt.links.new(rl.outputs['Mist'], fo.inputs[0])

vs = [scr.matrix_world @ v.co for v in scr.data.vertices]
xs = sorted(set(round(v.x, 5) for v in vs)); zs = sorted(set(round(v.z, 5) for v in vs))
yv = vs[0].y
corners = [Vector((xs[0], yv, zs[-1])), Vector((xs[-1], yv, zs[-1])), Vector((xs[-1], yv, zs[0])), Vector((xs[0], yv, zs[0]))]

meta_path = os.path.join(out_dir, 'shots.json')
meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
for name in (shots_arg or list(SHOTS)):
    sh = SHOTS[name]
    place_camera(sh)
    bpy.context.view_layer.update()
    booth_px = world_to_camera_view(scene, cam, Vector((0, 0, BY)))
    meta[name] = {
        'screen': [[round(c.x, 5), round(1 - c.y, 5)] for c in (world_to_camera_view(scene, cam, v) for v in corners)],
        'booth': [round(booth_px.x, 4), round(1 - booth_px.y, 4)],
    }
    fo.file_slots[0].path = name + '-depth-'
    scene.render.filepath = os.path.join(out_dir, name + '.png')
    bpy.ops.render.render(write_still=True)
    json.dump(meta, open(meta_path, 'w'), indent=1)
    print('rendered', name, flush=True)
