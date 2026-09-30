/* Superficies lisas en WebGL: el ventriculo que late (mapa QGS) y la superficie de perfusion (QPS).
   Recibe la malla de anillos x angulos de QpsNucleo (anillo 0 junto al apex), calcula una normal
   por vertice y la dibuja con luz suave en un lienzo WebGL aparte, que la seccion copia a su lienzo
   2D con drawImage (ahi siguen las etiquetas y el alambre). Si el equipo no tiene WebGL, dibujar()
   devuelve null y cada seccion usa su dibujo por caras. Tambien remuestrea la malla a un numero fijo
   de anillos (para interpolar entre intervalos con la misma topologia) y la alisa sin encogerla
   (Taubin: un paso que contrae y otro que expande), asi lo que se ve calza con los volumenes. */
'use strict';
const Malla3D=(()=>{
 let cv=null,gl=null,pr=null,loc=null,bufP=null,bufN=null,bufU=null,bufI=null,tex=null,claveI='',nI=0,roto=false;
 const VS=`attribute vec3 p;attribute vec3 n;attribute vec2 uv;uniform vec3 O,D,A,H;uniform vec2 k;varying vec3 vn;varying vec2 vuv;
void main(){vec3 d=p-O;gl_Position=vec4(dot(d,D)*k.x,dot(d,A)*k.y,-dot(d,H)*.008,1.);vn=vec3(dot(n,D),dot(n,A),dot(n,H));vuv=uv;}`;
 // Cara de afuera hacia el observador: gris claro con brillo; cara de adentro (se ve por la base): gris oscuro.
 const FS=`precision mediump float;varying vec3 vn;varying vec2 vuv;uniform sampler2D tx;uniform vec3 luz;uniform float mano,textura,oculto,brillo;
void main(){bool frente=gl_FrontFacing==(mano>0.);if(!frente&&oculto>.5)discard;vec3 nn=normalize(vn);if(!frente)nn=-nn;float lu=max(0.,dot(nn,luz));vec3 c;
if(textura>.5)c=texture2D(tx,vuv).rgb*(.55+.45*lu);
else if(frente)c=vec3((35.+215.*pow(lu,1.1))/255.+brillo*pow(max(0.,dot(reflect(-luz,nn),vec3(0.,0.,1.))),24.));
else c=vec3((25.+70.*lu)/255.);
gl_FragColor=vec4(c,1.);}`;
 function sombreador(tipo,src){const s=gl.createShader(tipo);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s)||'sombreador');return s;}
 function iniciar(){
  if(gl)return true;if(roto)return false;
  try{
   cv=document.createElement('canvas');const op={antialias:true,preserveDrawingBuffer:true,alpha:false};
   gl=cv.getContext('webgl',op)||cv.getContext('experimental-webgl',op);if(!gl)throw Error('sin WebGL');
   pr=gl.createProgram();gl.attachShader(pr,sombreador(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sombreador(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);
   if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(pr)||'programa');
   loc={p:gl.getAttribLocation(pr,'p'),n:gl.getAttribLocation(pr,'n'),uv:gl.getAttribLocation(pr,'uv')};
   for(const u of ['O','D','A','H','k','luz','mano','textura','oculto','brillo','tx'])loc[u]=gl.getUniformLocation(pr,u);
   bufP=gl.createBuffer();bufN=gl.createBuffer();bufU=gl.createBuffer();bufI=gl.createBuffer();tex=gl.createTexture();claveI='';
   cv.addEventListener('webglcontextlost',e=>{e.preventDefault();gl=null;});
   return true;
  }catch(err){console.warn('Superficies sin WebGL:',err.message||err);gl=null;roto=true;return false;}
 }
 // Normal por vertice: producto de la tangente del anillo por la del meridiano.
 function normales(S,nr,nf){
  const N=new Float32Array(S.length);
  for(let i=0;i<nr;i++){const i0=Math.max(0,i-1),i1=Math.min(nr-1,i+1);for(let j=0;j<nf;j++){
   const a=(i*nf+(j+1)%nf)*3,b=(i*nf+(j+nf-1)%nf)*3,c=(i1*nf+j)*3,e=(i0*nf+j)*3,o=(i*nf+j)*3;
   const tx=S[a]-S[b],ty=S[a+1]-S[b+1],tz=S[a+2]-S[b+2],ux=S[c]-S[e],uy=S[c+1]-S[e+1],uz=S[c+2]-S[e+2];
   const nx=ty*uz-tz*uy,ny=tz*ux-tx*uz,nz=tx*uy-ty*ux,l=Math.hypot(nx,ny,nz);if(l>1e-9){N[o]=nx/l;N[o+1]=ny/l;N[o+2]=nz/l;}}}
  for(let j=0;j<nf;j++){const o=j*3;if(!N[o]&&!N[o+1]&&!N[o+2]){N[o]=N[o+nf*3];N[o+1]=N[o+nf*3+1];N[o+2]=N[o+nf*3+2];}}
  return N;
 }
 // Promedia cada normal con sus 4 vecinas: la luz no marca las ondulaciones finas de la superficie.
 function suavizarNormales(N,nr,nf,pases){
  let a=N;for(let k=0;k<pases;k++){const b=new Float32Array(a.length);for(let i=0;i<nr;i++){const i0=Math.max(0,i-1),i1=Math.min(nr-1,i+1);for(let j=0;j<nf;j++){const o=(i*nf+j)*3,v=[(i0*nf+j)*3,(i1*nf+j)*3,(i*nf+(j+1)%nf)*3,(i*nf+(j+nf-1)%nf)*3];
   let x=2*a[o],y=2*a[o+1],z=2*a[o+2];for(const q of v){x+=a[q];y+=a[q+1];z+=a[q+2];}const l=Math.hypot(x,y,z)||1;b[o]=x/l;b[o+1]=y/l;b[o+2]=z/l;}}a=b;}
  return a;
 }
 // Suaviza un campo escalar sobre la malla (p. ej., el desplazamiento de cada punto sobre el elipsoide):
 // alisa la forma sin encogerla, porque el elipsoide de base queda intacto.
 function alisarCampo(d,nr,nf,pases){
  let a=Float32Array.from(d.subarray?d.subarray(0,nr*nf):d.slice(0,nr*nf));
  for(let v=0;v<pases;v++){const b=new Float32Array(a.length);for(let i=0;i<nr;i++){const i0=Math.max(0,i-1),i1=Math.min(nr-1,i+1);for(let j=0;j<nf;j++){const j0=(j+nf-1)%nf,j1=(j+1)%nf;b[i*nf+j]=(a[i0*nf+j]+a[i1*nf+j]+a[i*nf+j0]+a[i*nf+j1]+4*a[i*nf+j])/8;}}a=b;}
  return a;
 }
 // Remuestrea nsel anillos a nr, repartidos del apex a la base.
 function remuestrear(S,nsel,nf,nr){
  const out=new Float32Array(nr*nf*3);
  for(let r=0;r<nr;r++){const x=r/(nr-1)*(nsel-1),i=Math.max(0,Math.min(nsel-2,Math.floor(x))),f=x-i;
   for(let j=0;j<nf;j++){const a=(i*nf+j)*3,b=((i+1)*nf+j)*3,o=(r*nf+j)*3;for(let c=0;c<3;c++)out[o+c]=S[a+c]*(1-f)+S[b+c]*f;}}
  return out;
 }
 // Alisado de Taubin sobre la malla: los anillos de los extremos se apoyan en si mismos, los angulos dan la vuelta.
 function alisar(S,nr,nf,pares=10,l=.5,m=-.53){
  let a=Float32Array.from(S),b=new Float32Array(S.length);
  const paso=f=>{for(let i=0;i<nr;i++){const i0=Math.max(0,i-1),i1=Math.min(nr-1,i+1);for(let j=0;j<nf;j++){const j0=(j+nf-1)%nf,j1=(j+1)%nf,o=(i*nf+j)*3;
   for(let c=0;c<3;c++){const v=a[o+c],pm=(a[(i0*nf+j)*3+c]+a[(i1*nf+j)*3+c]+a[(i*nf+j0)*3+c]+a[(i*nf+j1)*3+c])/4;b[o+c]=v+f*(pm-v);}}}const t=a;a=b;b=t;};
  for(let k=0;k<pares;k++){paso(l);paso(m);}
  return a;
 }
 function indices(nr,nf,inv){
  const clave=`${nr}x${nf}${inv?'i':''}`;if(clave===claveI)return;
  const I=new Uint16Array(((nr-1)*nf*2+nf)*3);let q=0;
  for(let i=0;i+1<nr;i++)for(let j=0;j<nf;j++){const a=i*nf+j,b=i*nf+(j+1)%nf,c=(i+1)*nf+j,d=(i+1)*nf+(j+1)%nf;I[q++]=a;I[q++]=b;I[q++]=c;I[q++]=b;I[q++]=d;I[q++]=c;}
  const t=nr*nf;for(let j=0;j<nf;j++){const a=j,b=(j+1)%nf;I[q++]=t;if(inv){I[q++]=b;I[q++]=a;}else{I[q++]=a;I[q++]=b;}}
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,bufI);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,I,gl.STATIC_DRAW);claveI=clave;nI=I.length;
 }
 function subir(buf,datos,at,n){gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,datos,gl.DYNAMIC_DRAW);gl.enableVertexAttribArray(at);gl.vertexAttribPointer(at,n,gl.FLOAT,false,0,0);}
 /* o: {w,h,S,nr,nf,O,D,A,H,k:[clip por mm en x,y],fondo:[r,g,b] 0..1,luz:[x,y,z] en la vista,
       modo:'gris'|'textura',tex:{data RGBA,n},uv:(nr*nf*2),interior:'oscuro'|'oculto',
       pasesNormales:promedios de normales,brillo:intensidad del reflejo} */
 function dibujar(o){
  if(!iniciar())return null;
  const {w,h,S,nr,nf,D,A,H}=o,nv=nr*nf;if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}
  const Nn=suavizarNormales(normales(S,nr,nf),nr,nf,o.pasesNormales||0);
  // Normales hacia afuera: mayoria respecto del centro de la malla.
  let cx=0,cy=0,cz=0;for(let q=0;q<nv;q++){cx+=S[q*3];cy+=S[q*3+1];cz+=S[q*3+2];}cx/=nv;cy/=nv;cz/=nv;
  let suma=0;for(let q=0;q<nv;q++)suma+=Nn[q*3]*(S[q*3]-cx)+Nn[q*3+1]*(S[q*3+1]-cy)+Nn[q*3+2]*(S[q*3+2]-cz);
  const s=suma<0?-1:1;if(s<0)for(let q=0;q<Nn.length;q++)Nn[q]=-Nn[q];
  // Tapa del apex: un vertice en el centro del primer anillo.
  const P=new Float32Array((nv+1)*3),Nm=new Float32Array((nv+1)*3),U=new Float32Array((nv+1)*2);P.set(S);Nm.set(Nn);if(o.uv)U.set(o.uv);
  let ax=0,ay=0,az=0,nx=0,ny=0,nz=0;for(let j=0;j<nf;j++){ax+=S[j*3];ay+=S[j*3+1];az+=S[j*3+2];nx+=Nn[j*3];ny+=Nn[j*3+1];nz+=Nn[j*3+2];}
  ax/=nf;ay/=nf;az/=nf;const nl=Math.hypot(nx,ny,nz)||1;P[nv*3]=ax;P[nv*3+1]=ay;P[nv*3+2]=az;Nm[nv*3]=nx/nl;Nm[nv*3+1]=ny/nl;Nm[nv*3+2]=nz/nl;U[nv*2]=.5;U[nv*2+1]=.5;
  // Todas las caras con el mismo sentido que la malla (normal del orden = s x afuera).
  const e1=[S[0]-ax,S[1]-ay,S[2]-az],e2=[S[3]-ax,S[4]-ay,S[5]-az],fn=[e1[1]*e2[2]-e1[2]*e2[1],e1[2]*e2[0]-e1[0]*e2[2],e1[0]*e2[1]-e1[1]*e2[0]];
  const inv=(fn[0]*nx+fn[1]*ny+fn[2]*nz)*s<0;
  // mano: si la cara de adelante para WebGL es la de afuera, segun la orientacion de la vista.
  const cr=[D[1]*A[2]-D[2]*A[1],D[2]*A[0]-D[0]*A[2],D[0]*A[1]-D[1]*A[0]],m=cr[0]*H[0]+cr[1]*H[1]+cr[2]*H[2]<0?-1:1;
  gl.viewport(0,0,w,h);const f=o.fondo||[0,0,0];gl.clearColor(f[0],f[1],f[2],1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.useProgram(pr);
  subir(bufP,P,loc.p,3);subir(bufN,Nm,loc.n,3);if(loc.uv>=0)subir(bufU,U,loc.uv,2);indices(nr,nf,inv);
  const L=o.luz||[-.4,.55,.73],ll=Math.hypot(...L);
  gl.uniform3fv(loc.O,o.O);gl.uniform3fv(loc.D,D);gl.uniform3fv(loc.A,A);gl.uniform3fv(loc.H,H);gl.uniform2fv(loc.k,o.k);gl.uniform3fv(loc.luz,L.map(t=>t/ll));
  gl.uniform1f(loc.mano,s*m);gl.uniform1f(loc.brillo,o.brillo==null?.16:o.brillo);gl.uniform1f(loc.oculto,o.interior==='oculto'?1:0);
  const conTex=o.modo==='textura'&&o.tex;gl.uniform1f(loc.textura,conTex?1:0);
  if(conTex){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,o.tex.n,o.tex.n,0,gl.RGBA,gl.UNSIGNED_BYTE,o.tex.data);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.uniform1i(loc.tx,0);}
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,bufI);gl.drawElements(gl.TRIANGLES,nI,gl.UNSIGNED_SHORT,0);
  return cv;
 }
 return {dibujar,remuestrear,alisar,alisarCampo,normales,disponible:()=>iniciar()};
})();
window.Malla3D=Malla3D;
