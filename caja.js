/* Paso previo a la reorientacion: ubicar el corazon. El estudiante ve un corte coronal y uno
   sagital de la OSEM elegida y pone una caja sobre el corazon. En el coronal la caja fija el
   rango lateral (x) y el vertical (z); en el sagital, el anteroposterior (y) y el mismo vertical.
   El coronal se corta por el centro de la caja en y, y el sagital por su centro en x: mover la
   caja en una imagen cambia el corte de la otra. Tocar dentro de la caja la mueve, tocar cerca de
   una esquina la agranda o achica desde esa esquina, y tocar fuera la lleva a ese punto. Parte
   en el centro del volumen, para que haya que posicionarla. Coordenadas en voxeles del volumen
   con z hacia la cabeza (el mismo que usa la reorientacion). */
'use strict';
const Caja=(()=>{
 const C=CardiacoCore,$=id=>document.getElementById(id);
 const dec=(x,d)=>Number(x).toFixed(d).replace('.',',');
 const LADO_MM=110,MIN_MM=40;
 const k={entrada:null,vol:null,n:0,sp:1,max:1,techo:1,x0:0,x1:0,y0:0,y1:0,z0:0,z1:0,movida:false};

 // Escala de color segun el contenido de la caja: percentil 99,9 de los voxeles de adentro (no el
 // maximo, para que un voxel suelto no apague el resto). Con la caja sobre el corazon, el higado
 // y el intestino dejan de fijar la escala. Se muestrea con paso para que sea inmediato al arrastrar.
 function maxEnCaja(vol,n,q){
  const p=n*n,lo=a=>Math.max(0,Math.floor(q[a+'0'])),hi=a=>Math.min(n-1,Math.ceil(q[a+'1']));
  const total=(hi('x')-lo('x')+1)*(hi('y')-lo('y')+1)*(hi('z')-lo('z')+1),paso=Math.max(1,Math.round(Math.cbrt(total/60000)));
  const v=[];for(let z=lo('z');z<=hi('z');z+=paso)for(let y=lo('y');y<=hi('y');y+=paso)for(let x=lo('x');x<=hi('x');x+=paso){const a=vol[z*p+y*n+x];if(a>0)v.push(a);}
  if(!v.length)return C.percentil(vol,.999)||1;
  v.sort((a,b)=>a-b);return v[Math.min(v.length-1,Math.floor(v.length*.999))]||1;
 }
 function abrir({entrada,s}){
  const aviso=$('cajaEstado');
  if(!entrada||entrada.tipo!=='osem'){aviso.className='estado error';aviso.textContent='Elige a la izquierda una reconstrucción OSEM (no el mapa μ) antes de seguir.';return false;}
  if(k.entrada!==entrada){
   k.entrada=entrada;k.n=s.n;k.sp=s.spacing;k.vol=Reorientar.volumen(entrada,s.n);k.max=C.percentil(k.vol,.999)||1;
   const c=(k.n-1)/2,h=LADO_MM/k.sp/2;k.x0=k.y0=k.z0=c-h;k.x1=k.y1=k.z1=c+h;k.movida=false;
   aviso.className='estado';aviso.textContent=`Reconstrucción «${entrada.etiqueta}». La caja parte en el centro del volumen: llévala al corazón en las dos imágenes.`;
  }
  pintar();return true;
 }
 const centro=()=>[(k.x0+k.x1)/2,(k.y0+k.y1)/2,(k.z0+k.z1)/2];
 // Cada imagen: que eje del volumen va a lo ancho y cual a lo alto (z de arriba abajo).
 const VISTAS={cajaCoronal:{h:'x',v:'z'},cajaSagital:{h:'y',v:'z'}};
 function imagen(id){
  const n=k.n,p=n*n,[cx,cy]=centro(),out=new Float32Array(p);
  if(id==='cajaCoronal'){const y=Math.max(0,Math.min(n-1,Math.round(cy)));for(let v=0;v<n;v++){const z=n-1-v;for(let u=0;u<n;u++)out[v*n+u]=k.vol[z*p+y*n+u];}}
  else{const x=Math.max(0,Math.min(n-1,Math.round(cx)));for(let v=0;v<n;v++){const z=n-1-v;for(let u=0;u<n;u++)out[v*n+u]=k.vol[z*p+u*n+x];}}
  return out;
 }
 // Rectangulo de la caja en pixeles del lienzo: z crece hacia arriba, la imagen hacia abajo.
 function rect(id,c){const n=k.n,e=c.width/n,a=VISTAS[id].h;return {x:k[a+'0']*e,y:(n-1-k.z1)*e,w:(k[a+'1']-k[a+'0'])*e,h:(k.z1-k.z0)*e,e};}
 function pintar(){
  if(!k.vol)return;
  k.max=maxEnCaja(k.vol,k.n,k);
  for(const id of Object.keys(VISTAS)){
   const c=$(id);if(c.width!==k.n*3){c.width=k.n*3;c.height=k.n*3;}
   C.pintar(c,imagen(id),k.n,{paleta:'cardiaca',techo:k.techo,max:k.max});
   const x=c.getContext('2d'),q=rect(id,c);
   x.fillStyle='rgba(0,0,0,.35)';x.fillRect(0,0,c.width,q.y);x.fillRect(0,q.y+q.h,c.width,c.height-q.y-q.h);x.fillRect(0,q.y,q.x,q.h);x.fillRect(q.x+q.w,q.y,c.width-q.x-q.w,q.h);
   x.strokeStyle='#4dd0e1';x.lineWidth=3;x.strokeRect(q.x,q.y,q.w,q.h);
   x.fillStyle='#4dd0e1';for(const [px,py] of [[q.x,q.y],[q.x+q.w,q.y],[q.x,q.y+q.h],[q.x+q.w,q.y+q.h]])x.fillRect(px-7,py-7,14,14);
   x.fillStyle='#ffee58';x.beginPath();x.arc(q.x+q.w/2,q.y+q.h/2,5,0,2*Math.PI);x.fill();
  }
  const mm=a=>dec((k[a+'1']-k[a+'0'])*k.sp/10,1);
  const [cx,cy,cz]=centro();
  $('cajaResumen').textContent=`Caja de ${mm('x')} cm de lado a lado, ${mm('y')} cm de adelante hacia atrás y ${mm('z')} cm de alto. El coronal pasa por el corte ${Math.round(cy)+1} y el sagital por el ${Math.round(cx)+1}. La escala de color se ajusta a lo que hay dentro de la caja.`;
  $('cajaTecho').value=Math.round(k.techo*100);
 }
 // Arrastre: dentro mueve, en una esquina redimensiona, fuera centra la caja en el punto.
 function tactil(id){
  const c=$(id);let modo=null,ult=null;
  const vox=e=>{const b=c.getBoundingClientRect(),n=k.n;return [(e.clientX-b.left)/b.width*n,(e.clientY-b.top)/b.height*n];};
  c.addEventListener('pointerdown',e=>{
   if(!k.vol)return;e.preventDefault();try{c.setPointerCapture(e.pointerId);}catch(err){}
   const a=VISTAS[id].h,[u,v]=vox(e),z=k.n-1-v,tol=Math.max(3,k.n*.05);
   const esquinas=[[a+'0','z1'],[a+'1','z1'],[a+'0','z0'],[a+'1','z0']];
   const cerca=esquinas.find(([ea,ez])=>Math.abs(u-k[ea])<tol&&Math.abs(z-k[ez])<tol);
   if(cerca)modo={tipo:'esquina',ea:cerca[0],ez:cerca[1]};
   else{modo={tipo:'mover'};if(!(u>=k[a+'0']&&u<=k[a+'1']&&z>=k.z0&&z<=k.z1))desplazar(a,u-(k[a+'0']+k[a+'1'])/2,z-(k.z0+k.z1)/2);}
   ult=[u,z];k.movida=true;pintar();
  });
  c.addEventListener('pointermove',e=>{
   if(!modo)return;const a=VISTAS[id].h,[u,v]=vox(e),z=k.n-1-v,du=u-ult[0],dz=z-ult[1];ult=[u,z];
   if(modo.tipo==='mover')desplazar(a,du,dz);
   else{const min=MIN_MM/k.sp,n=k.n-1;
    if(modo.ea.endsWith('0'))k[modo.ea]=Math.max(0,Math.min(k[a+'1']-min,k[modo.ea]+du));else k[modo.ea]=Math.min(n,Math.max(k[a+'0']+min,k[modo.ea]+du));
    if(modo.ez==='z0')k.z0=Math.max(0,Math.min(k.z1-min,k.z0+dz));else k.z1=Math.min(n,Math.max(k.z0+min,k.z1+dz));}
   pintar();
  });
  const soltar=()=>{modo=null;};c.addEventListener('pointerup',soltar);c.addEventListener('pointercancel',soltar);
 }
 // Mueve la caja sin salir del volumen y sin cambiar su tamano.
 function desplazar(a,du,dz){
  const n=k.n-1,lim=(q0,q1,d)=>Math.max(-k[q0],Math.min(n-k[q1],d));
  const d1=lim(a+'0',a+'1',du),d2=lim('z0','z1',dz);k[a+'0']+=d1;k[a+'1']+=d1;k.z0+=d2;k.z1+=d2;
 }
 function iniciar(){
  tactil('cajaCoronal');tactil('cajaSagital');
  $('cajaTecho').addEventListener('input',e=>{k.techo=Math.max(.05,+e.target.value/100);pintar();});
  $('cajaCentro').addEventListener('click',()=>{if(!k.vol)return;const c=(k.n-1)/2,h=LADO_MM/k.sp/2;k.x0=k.y0=k.z0=c-h;k.x1=k.y1=k.z1=c+h;pintar();});
 }
 function caja(){return {x0:k.x0,x1:k.x1,y0:k.y0,y1:k.y1,z0:k.z0,z1:k.z1};}
 function olvidar(){k.entrada=null;k.vol=null;}
 return {iniciar,abrir,olvidar,caja,maxEnCaja,estado:k};
})();
window.Caja=Caja;
