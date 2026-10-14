from PIL import Image, ImageDraw, ImageFont
import math

W, H = 1365, 768
im = Image.new("RGB", (W, H), "#F7F6F3")
d = ImageDraw.Draw(im)
FONT = r"C:\Windows\Fonts\segoeui.ttf"
SERIF = r"C:\Windows\Fonts\georgia.ttf"
MONO = r"C:\Windows\Fonts\consola.ttf"
def font(size, face=FONT): return ImageFont.truetype(face, size)
def txt(x, y, s, size=13, color="#46414D", face=FONT): d.text((x,y), s, font=font(size,face), fill=color)
def rr(box, radius=12, fill="#FFFFFF", outline="#EAEAEA", width=1): d.rounded_rectangle(box, radius, fill=fill, outline=outline, width=width)
def line(points, fill, width=1): d.line(points, fill=fill, width=width)

# Fixed navigation and dashboard controls
d.rectangle((0,0,W,52), fill="#F7F6F3")
txt(30,18,"BATIMIX",12,"#1F1B24",MONO)
txt(1195,17,"Explorar",13,"#1F1B24")
txt(1272,17,"Método",13,"#67626D")
line([(0,51),(W,51)],"#E3E0DC")
txt(30,70,"REGIÓN EEG",11,"#67626D",MONO)
rr((122,62,291,96),17,"#F1EFEA","#F1EFEA")
rr((124,64,202,94),15,"#1F1B24","#1F1B24")
txt(141,71,"Frontal",12,"#FFFFFF")
txt(214,71,"Centro-temporal",12)
txt(317,60,"68",28,"#1F1B24",SERIF)
txt(363,72,"participantes activos · grupo completo",12)
rr((596,64,742,94),6,"#F7F6F3","#D9D6D2")
txt(610,72,"Limpiar selección",11,"#8A8490")
rr((1132,65,1222,92),14,"#EDF3EC","#EDF3EC")
d.ellipse((1144,76,1150,82),fill="#346538")
txt(1156,71,"EEG n = 68",10,"#346538",MONO)
rr((1230,65,1334,92),14,"#FBF3DB","#FBF3DB")
d.ellipse((1242,76,1248,82),fill="#956400")
txt(1254,71,"PVT n = 30",10,"#956400",MONO)
line([(30,107),(1335,107)],"#EAEAEA")

# Main asymmetric dashboard: large scatter and two stacked response views
lx, ly, lw, lh = 30, 123, 600, 615
rx, rw = 646, 689
rr((lx,ly,lx+lw,ly+lh))
rr((rx,ly,rx+rw,ly+408))
rr((rx,ly+422,rx+rw,ly+lh))

# Scatter panel header and controls
txt(lx+20,ly+15,"Vulnerabilidad",24,"#1F1B24",SERIF)
txt(lx+179,ly+25,"CONDUCE",10,"#67626D",MONO)
txt(lx+20,ly+50,"Cambio de sueño normal (NS) a privación (SD), un punto por persona.",12)
txt(lx+lw-164,ly+23,"ρ = −0.10 · n = 30",10,"#1F1B24",MONO)
txt(lx+20,ly+84,"Eje Y",11,"#67626D")
rr((lx+66,ly+77,lx+271,ly+108),5,"#FFFFFF","#D9D6D2")
txt(lx+78,ly+84,"PVT · tiempo de reacción",11,"#1F1B24")
txt(lx+20,ly+122,"Color",11,"#67626D")
rr((lx+66,ly+115,lx+271,ly+146),5,"#FFFFFF","#D9D6D2")
txt(lx+78,ly+122,"perfil vulnerable",11,"#1F1B24")
d.ellipse((lx+20,ly+162,lx+29,ly+171),fill="#EA5B4B")
txt(lx+35,ly+158,"Cuadrante vulnerable",10)
d.ellipse((lx+179,ly+162,lx+188,ly+171),fill="#8A8490")
txt(lx+194,ly+158,"Resto",10)
txt(lx+lw-169,ly+158,"38 sin PVT, no se dibujan",10,"#67626D")

# Scatter plot, grid, axes, and participant dots
cx0, cy0, cw, ch = lx+65, ly+198, 475, 320
for i in range(6):
    yy=cy0+i*ch/5
    line([(cx0,yy),(cx0+cw,yy)],"#EAEAEA")
    txt(cx0-34,yy-7,str(120-i*30),10,"#67626D",MONO)
for i in range(7):
    xx=cx0+i*cw/6
    line([(xx,cy0),(xx,cy0+ch)],"#F0EEEA")
    txt(xx-10,cy0+ch+8,[-.06,-.04,-.02,0,.02,.04,.06][i].__str__(),9,"#67626D",MONO)
line([(cx0+cw*.56,cy0),(cx0+cw*.56,cy0+ch)],"#D9D6D2")
line([(cx0,cy0+ch*.43),(cx0+cw,cy0+ch*.43)],"#B5B0B8")
pts=[(.08,.16),(.16,.30),(.19,.27),(.20,.52),(.24,.48),(.28,.56),(.32,.62),(.37,.44),(.39,.38),(.41,.55),(.44,.58),(.49,.67),(.51,.49),(.53,.42),(.54,.36),(.57,.73),(.58,.77),(.60,.68),(.61,.91),(.65,.25),(.70,.31),(.72,.88),(.74,.84),(.78,.80),(.81,.42),(.85,.48),(.89,.33),(.92,.28),(.95,.56),(.60,.18),(.58,.10)]
for i,(px,py) in enumerate(pts):
    xx=cx0+px*cw; yy=cy0+py*ch
    col="#EA5B4B" if (px>.56 and py<.45) or i in (8,14) else "#938D98"
    d.ellipse((xx-5,yy-5,xx+5,yy+5),fill=col,outline="#FFFFFF",width=1)
txt(cx0+cw*.59,cy0+6,"vulnerables · 6",10,"#B8382A",MONO)
txt(cx0+cw*.34,cy0+ch+31,"Δσθ frontal (SD − NS)  ·  más inestable →",10,"#67626D",MONO)
txt(lx+17,ly+340,"Δ PVT, mediana (ms)",9,"#67626D")
rr((lx+18,ly+lh-47,lx+lw-18,ly+lh-17),5,"#F7F6F3","#EAEAEA")
txt(lx+30,ly+lh-40,"Arrastra para seleccionar participantes · clic para fijar · Esc para limpiar",11,"#67626D")

# Topography card and the regional distribution directly below it
txt(rx+18,ly+14,"Cuero cabelludo",21,"#1F1B24",SERIF)
txt(rx+194,ly+23,"RESPONDE",9,"#67626D",MONO)
txt(rx+18,ly+47,"Theta en 61 electrodos · Δσθ entre condiciones",11)
txt(rx+rw-181,ly+19,"4 / 61 con p < 0.05",10,"#1F1B24",MONO)
rr((rx+18,ly+72,rx+rw-18,ly+101),7,"#F1EFEA","#F1EFEA")
rr((rx+20,ly+74,rx+157,ly+99),6,"#1F1B24","#1F1B24")
txt(rx+31,ly+79,"σ variabilidad",10,"#FFFFFF")
txt(rx+173,ly+79,"μ media",10)
txt(rx+rw-188,ly+79,"NS     SD      Δ",10,"#1F1B24",MONO)
# Head shape with interpolated warm/cool soft regions
hx,hy,hr=rx+rw/2,ly+198,82
d.ellipse((hx-hr,hy-hr,hx+hr,hy+hr),fill="#F6D4C8",outline="#1F1B24",width=2)
d.polygon([(hx-14,hy-hr+3),(hx,hy-hr-14),(hx+14,hy-hr+3)],fill="#F7F6F3",outline="#1F1B24")
d.ellipse((hx-hr-7,hy-13,hx-hr+4,hy+15),outline="#1F1B24",width=1)
d.ellipse((hx+hr-4,hy-13,hx+hr+7,hy+15),outline="#1F1B24",width=1)
for px,py,rad,col in [(-.55,-.03,18,"#EF9B88"),(.52,.57,16,"#E87965"),(-.38,.60,12,"#C9BCEB"),(.02,.05,15,"#F1A18B"),(.03,.86,13,"#E76553"),(.72,-.48,13,"#E97865"),(-.72,.55,10,"#C9BCEB")]:
    d.ellipse((hx+px*hr-rad,hy+py*hr-rad,hx+px*hr+rad,hy+py*hr+rad),fill=col)
for row in range(5):
    for col in range(7):
        px=(col-3)*.22; py=(row-2)*.25
        if px*px+py*py < .82:
            xx=hx+px*hr; yy=hy+py*hr
            d.ellipse((xx-2,yy-2,xx+2,yy+2),fill="#8A8490")
txt(rx+18,ly+286,"○ p < 0.05 sin corregir",9,"#67626D")
txt(rx+rw-160,ly+286,"● sobrevive FDR",9,"#67626D")
txt(rx+18,ly+307,"Distribución por región · selecciona un grupo para compararlo",11,"#1F1B24",FONT)
txt(rx+18,ly+332,"Δσθ frontal",10,"#67626D",MONO)
txt(rx+rw-101,ly+332,"x̄ +0.00431",10,"#1F1B24",MONO)
for j in range(27):
    xx=rx+278+j*8
    hh=5+(j*7%12)
    line([(xx,ly+342-hh/2),(xx,ly+342+hh/2)],"#B5B0B8")
d.polygon([(rx+391,ly+334),(rx+385,ly+342),(rx+397,ly+342)],fill="#1F1B24")
d.ellipse((rx+414,ly+338,rx+421,ly+345),fill="#EA5B4B")
line([(rx+18,ly+350),(rx+rw-18,ly+350)],"#EAEAEA")
txt(rx+18,ly+356,"Δσθ centro-temporal",10,"#67626D",MONO)
txt(rx+rw-101,ly+356,"x̄ +0.00266",10,"#1F1B24",MONO)
for j in range(27):
    xx=rx+278+j*8
    hh=5+(j*11%12)
    line([(xx,ly+366-hh/2),(xx,ly+366+hh/2)],"#B5B0B8")
d.polygon([(rx+391,ly+358),(rx+385,ly+366),(rx+397,ly+366)],fill="#1F1B24")
d.ellipse((rx+414,ly+362,rx+421,ly+369),fill="#EA5B4B")
txt(rx+18,ly+378,"▲ Todos     ● Selección",9,"#67626D")
txt(rx+190,ly+378,"Franjas regionales se recalculan al seleccionar.",9,"#67626D")
txt(rx+18,ly+392,"El mapa promedia los 68: no hay datos por electrodo desagregados por sujeto.",9,"#67626D")

# Dynamic series card
dy=ly+422
txt(rx+18,dy+12,"Cinco minutos",20,"#1F1B24",SERIF)
txt(rx+164,dy+21,"RESPONDE",9,"#67626D",MONO)
txt(rx+rw-180,dy+17,"n = 68  ·  SD − NS +0.005",9,"#1F1B24",MONO)
txt(rx+18,dy+43,"Theta media por época de 4 s  ·  banda: ± 1 error estándar",10)
rr((rx+18,dy+62,rx+131,dy+91),5,"#1F1B24","#1F1B24")
txt(rx+36,dy+68,"▶  Reproducir",10,"#FFFFFF")
rr((rx+141,dy+62,rx+rw-18,dy+91),7,"#F1EFEA","#F1EFEA")
txt(rx+153,dy+69,"NS y SD        solo NS        solo SD",10,"#1F1B24")
gx,gy,gw,gh=rx+54,dy+107,rw-98,58
for i in range(4):
    yy=gy+i*gh/3
    line([(gx,yy),(gx+gw,yy)],"#EAEAEA")
for i in range(6):
    xx=gx+i*gw/5
    txt(xx-8,gy+gh+7,str(i*60),8,"#67626D",MONO)
def series(col,phase,trend):
    p=[]
    for i in range(75):
        x=gx+i*gw/74
        val=.50 + .12*math.sin(i*.54+phase)+.075*math.sin(i*1.71+phase*.4)+trend*i/74
        y=gy+gh*(.5-val)
        p.append((x,y))
    line(p,col,2)
series("#6A4BC4",0,-.05)
series("#EA5B4B",1.0,.02)
txt(gx+gw-35,gy+12,"SD",9,"#B8382A",MONO)
txt(gx+gw-35,gy+gh-13,"NS",9,"#5639A8",MONO)
txt(gx+gw//2-46,dy+gh+78,"tiempo (s) · 75 épocas",9,"#67626D",MONO)

im.save(r"D:\Documents-D\UTEC\Data-visualization\data-visualization-project\deliveries\week10\layout-mockup.png")
