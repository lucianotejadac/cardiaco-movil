/* Referencia en las proyecciones: muestra dos vistas de la adquisicion (la anterior y la lateral
   izquierda) y marca sobre ellas donde queda lo que el estudiante esta ubicando en el volumen (la
   caja del corazon, el centro y el eje del ventriculo). Sirve para confirmar con los datos crudos
   que se esta mirando el corazon y no el higado o el intestino.
   Geometria del motor (simulador95-engine.js): la vista con vector de detector (ux, uy) proyecta un
   punto del paciente (X, Y, Z) en la columna t = ((X-origen0)*ux + (Y-origen1)*uy)/paso + (n-1)/2 y
   en la fila (z0 - Z)/paso. Cada volumen entrega su funcion voxel -> paciente, asi sirve igual para
   la OSEM de la aplicacion y para una reconstruccion del equipo. */
'use strict';
const RefProy=(()=>{
 const $=id=>document.getElementById(id);
 const paleta=v=>{v=Math.max(0,Math.min(1,v));return [255*Math.min(1,v*3),255*Math.max(0,Math.min(1,v*3-1)),255*Math.max(0,v*3-2)];};
 let s=null,aPaciente=null,vistas=null;
 // Vista que mira desde un lado: la de detector mas alineado con esa direccion. Como en
 // attenuationWeights, el detector queda hacia (uy, -ux) en coordenadas del volumen.
 function elegir(dx,dy){let mejor=null,m=-Infinity;for(const v of s.views){if(v.window!==1||(v.slot||1)!==1)continue;const q=v.uy*dx-v.ux*dy;if(q>m){m=q;mejor=v;}}return mejor;}
 function configurar(proyecciones,voxelAPaciente){
  s=proyecciones;aPaciente=voxelAPaciente;
  vistas=s?{anterior:elegir(0,-1),lateral:elegir(1,0)}:null;
  for(const id of ['RefAnt','RefLat'].flatMap(p=>['caja','reo'].map(q=>q+p)))$(id)&&($(id).closest('.refProy').hidden=!s);
 }
 function proyectar(v,[i,j,k]){
  const [X,Y,Z]=aPaciente(i,j,k),c=(s.n-1)/2;
  return [((X-s.origin[0])*v.ux+(Y-s.origin[1])*v.uy)/s.spacing+c,(s.z0-Z)/s.spacing];
 }
 // marcas: {puntos:[[i,j,k,color]], lineas:[[[i,j,k],[i,j,k],color]], cajas:[[x0,x1,y0,y1,z0,z1,color]]}
 function dibujar(id,cual,marcas){
  const c=$(id);if(!c||!s||!vistas)return;const v=vistas[cual],n=s.n,p=n*n;if(c.width!==n*3){c.width=n*3;c.height=n*3;}
  const cuadro=s.data.subarray(v.source*p,(v.source+1)*p);let max=0;for(const q of cuadro)if(q>max)max=q;
  const base=document.createElement('canvas');base.width=n;base.height=n;const bx=base.getContext('2d'),im=bx.createImageData(n,n);
  for(let i=0;i<p;i++){const col=paleta(cuadro[i]/(max*.9||1));im.data[i*4]=col[0];im.data[i*4+1]=col[1];im.data[i*4+2]=col[2];im.data[i*4+3]=255;}
  bx.putImageData(im,0,0);const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.drawImage(base,0,0,c.width,c.height);
  const e=c.width/n,P=q=>{const [t,f]=proyectar(v,q);return [(t+.5)*e,(f+.5)*e];};
  x.lineWidth=2;
  for(const [a,b,col] of marcas.lineas||[]){const [x0,y0]=P(a),[x1,y1]=P(b);x.strokeStyle=col;x.beginPath();x.moveTo(x0,y0);x.lineTo(x1,y1);x.stroke();}
  for(const [x0,x1,y0,y1,z0,z1,col] of marcas.cajas||[]){
   const esq=[];for(const i of [x0,x1])for(const j of [y0,y1])for(const k of [z0,z1])esq.push(P([i,j,k]));
   const xs=esq.map(q=>q[0]),ys=esq.map(q=>q[1]);x.strokeStyle=col;x.strokeRect(Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
  }
  for(const [i,j,k,col] of marcas.puntos||[]){const [px,py]=P([i,j,k]);x.fillStyle=col;x.beginPath();x.arc(px,py,5,0,2*Math.PI);x.fill();x.strokeStyle='#111';x.lineWidth=1;x.stroke();x.lineWidth=2;}
  const ang=Math.round(v.angle*180/Math.PI);$(id).previousElementSibling.querySelector('.mono').textContent=`vista ${ang}°`;
 }
 function hay(){return !!s;}
 return {configurar,dibujar,hay};
})();
window.RefProy=RefProy;
