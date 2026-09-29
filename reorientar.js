/* Segunda parte en la version movil: reorientacion de los ejes del ventriculo izquierdo sobre la
   OSEM elegida, sin cambiar de simulador. En vez de marcar base y apex con clics, como en
   simulador-cardiaco, el estudiante gira el eje con deslizadores: azimut (en el plano
   transaxial, desde anterior hacia la izquierda del paciente) y elevacion (cuanto baja el apex
   respecto del plano transaxial). Usa cardiaco-core.js copiado tal cual de simulador-cardiaco:
   el mismo marco, los mismos cortes oblicuos (eje corto, largo vertical, largo horizontal), la
   misma busqueda del ventriculo y la misma paleta. El eje parte en 0 y 0, sin girar; el centro
   del ventriculo es el centro de la caja que el estudiante puso sobre el corazon (caja.js) y se
   puede mover arrastrando sobre las imagenes. */
'use strict';
const Reorientar=(()=>{
 const C=CardiacoCore,M=56; // lado de los cortes oblicuos en voxeles: 56 x 3,3 mm = 185 mm
 const $=id=>document.getElementById(id);
 const dec=(x,d)=>Number(x).toFixed(d).replace('.',',');
 const r={vol:null,n:0,sp:1,max:1,az:0,el:0,Cv:null,L:20,t:0,techo:1,origen:null,etiqueta:''};

 // La OSEM movil tiene el corte 0 en la cabeza; cardiaco-core espera z hacia la cabeza (como la
 // exportacion de SPECT Lab 95, que invierte el orden de los cortes). Se invierte una vez.
 function invertirZ(data,n){const p=n*n,out=new Float32Array(n*p);for(let z=0;z<n;z++)out.set(data.subarray((n-1-z)*p,(n-z)*p),z*p);return out;}

 // Volumen con z hacia la cabeza, una vez por reconstruccion (lo usan la caja y la reorientacion).
 const cacheVol={entrada:null,vol:null};
 // La reconstruccion del equipo ya viene con z hacia la cabeza (zArriba): no se invierte.
 function volumen(entrada,n){if(cacheVol.entrada!==entrada){cacheVol.entrada=entrada;cacheVol.vol=entrada.zArriba?entrada.data:invertirZ(entrada.data,n);}return cacheVol.vol;}

 // El buscador de anillo de cardiaco-core recorre todo el volumen; con pocas cuentas (estres del
 // caso 1) gana un anillo falso del abdomen. Por eso busca solo dentro de la caja que el
 // estudiante puso sobre el corazon en el paso anterior.
 function buscar(Mk){
  const n=r.n,p=n*n,k=r.caja,dentro=new Float32Array(r.vol.length);
  for(let z=Math.max(0,Math.floor(k.z0));z<=Math.min(n-1,Math.ceil(k.z1));z++)for(let y=Math.max(0,Math.floor(k.y0));y<=Math.min(n-1,Math.ceil(k.y1));y++){const o=z*p+y*n,x0=Math.max(0,Math.floor(k.x0)),x1=Math.min(n-1,Math.ceil(k.x1));dentro.set(r.vol.subarray(o+x0,o+x1+1),o+x0);}
  return C.buscarVentriculo(dentro,n,n,Mk,r.sp);
 }
 // caja: {x0,x1,y0,y1,z0,z1} en voxeles, con z hacia la cabeza. Su centro es el centro del
 // ventriculo y su tamano da el largo inicial del eje.
 function abrir({entrada,s,referencia,caja}){
  const aviso=$('reoEstado');
  if(!entrada||!['osem','equipo'].includes(entrada.tipo)){aviso.className='estado error';aviso.textContent='Elige a la izquierda una reconstrucción OSEM (no el mapa μ) antes de reorientar.';return false;}
  const clave=JSON.stringify(caja);
  if(r.origen!==entrada){r.az=0;r.el=0;r.marcoFijo=null;r.comparar=null;r.equipo=null;}
  if(r.origen!==entrada||r.claveCaja!==clave){
   r.origen=entrada;r.claveCaja=clave;r.caja={...caja};r.n=s.n;r.sp=s.spacing;r.vol=volumen(entrada,s.n);r.max=Caja.maxEnCaja(r.vol,r.n,caja);r.etiqueta=entrada.etiqueta;
   r.Cv=[(caja.x0+caja.x1)/2,(caja.y0+caja.y1)/2,(caja.z0+caja.z1)/2];
   r.L=Math.max(12,Math.round(.7*Math.min(caja.x1-caja.x0,caja.y1-caja.y0,caja.z1-caja.z0)));r.t=0;
   aviso.className='estado ok';
   aviso.textContent=`Reconstrucción «${entrada.etiqueta}». El centro del ventrículo es el centro de tu caja. El eje parte sin girar: gíralo con los deslizadores.`;
  }
  r.referencia=referencia||null;
  pintar();return true;
 }

 // Con el eje del equipo el marco es el de su DICOM, exacto; al mover un deslizador se vuelve al
 // marco de los angulos.
 const marco=()=>r.marcoFijo||C.marco(r.az,r.el);
 /* Eje y receta del equipo: x viene de EjeEquipo.ejecutar. La reconstruccion del simulador (misma
    receta, enmascarada y en la escala del equipo) pasa a ser el volumen que se reorienta, y la del
    equipo se muestra debajo con el mismo centro, el mismo marco y la misma escala de color. */
 function usarEquipo(x,s){
  r.origen=x.entrada;r.claveCaja=null;r.n=s.n;r.sp=s.spacing;r.vol=x.sim;r.comparar=x.equipo;r.max=x.max;r.etiqueta=x.entrada.etiqueta;
  r.Cv=x.centro.slice();r.L=x.largo;r.t=0;r.techo=1;r.equipo=x;r.marcoFijo=x.marco;
  // Sin caja previa (acceso directo): una caja alrededor del centro del equipo, para «Buscar el centro».
  if(!r.caja){const h=x.largo/2,c=x.centro;r.caja={x0:c[0]-h,x1:c[0]+h,y0:c[1]-h,y1:c[1]+h,z0:c[2]-h,z1:c[2]+h};}
  r.az=Math.max(-30,Math.min(120,Math.round(x.azimut)));r.el=Math.max(-40,Math.min(60,Math.round(x.elevacion)));
  const aviso=$('reoEstado');aviso.className='estado ok';
  aviso.textContent=`Imagen del equipo: «${x.descripcion}». Arriba, el simulador (${x.modo==='receta'?'reconstruido con la receta del equipo':'tu reconstrucción «'+x.nombre+'»'}); abajo, el equipo. Mismo centro, mismo marco, mismo zoom y misma escala de color.`;
  pintar();
 }
 function ejeExacto(){if(!r.equipo)return;r.marcoFijo=r.equipo.marco;r.Cv=r.equipo.centro.slice();r.t=0;r.az=Math.round(r.equipo.azimut);r.el=Math.round(r.equipo.elevacion);pintar();}
 // Plano vertical que contiene el eje (el mismo que el escritorio usa para marcar el apex):
 // horizontal a lo largo del azimut, vertical hacia los pies. Ahi se ve la elevacion.
 function planoVertical(){const M0=C.marco(r.az,0);return {derecha:M0.a.map(q=>-q),abajo:[0,0,-1],normal:M0.u};}
 const punto=(ctx,x,y,col)=>{ctx.fillStyle=col;ctx.beginPath();ctx.arc(x,y,4,0,2*Math.PI);ctx.fill();};
 function linea(ctx,x0,y0,x1,y1,col){ctx.strokeStyle=col;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.stroke();}
 function lienzo(id,lado){const c=$(id);if(c.width!==lado){c.width=lado;c.height=lado;}return c;}
 function pintar(){
  if(!r.vol)return;
  const n=r.n,Mk=marco(),op={paleta:'cardiaca',techo:r.techo,max:r.max},Cv=r.Cv,esc=4;
  // Transaxial por el centro, con el eje proyectado.
  const z=Math.max(0,Math.min(n-1,Math.round(Cv[2]))),ct=lienzo('reoAxial',n*2);
  C.pintar(ct,r.vol.subarray(z*n*n,(z+1)*n*n),n,op);
  {const x=ct.getContext('2d'),k=ct.width/n,h=r.L/2,X=q=>(q+.5)*k;
   linea(x,X(Cv[0]-Mk.a[0]*h),X(Cv[1]-Mk.a[1]*h),X(Cv[0]+Mk.a[0]*h),X(Cv[1]+Mk.a[1]*h),'rgba(77,208,225,.9)');
   punto(x,X(Cv[0]+Mk.a[0]*h),X(Cv[1]+Mk.a[1]*h),'#4dd0e1');punto(x,X(Cv[0]),X(Cv[1]),'#ffee58');}
  // Plano vertical del eje, con el eje en su elevacion.
  const pv=planoVertical(),cv=lienzo('reoVertical',M*esc);
  C.pintar(cv,C.corte(r.vol,n,n,Cv,pv.derecha,pv.abajo,pv.normal,0,M,1),M,op);
  {const x=cv.getContext('2d'),k=cv.width/M,c=(M-1)/2,h=r.L/2,di=Mk.a[0]*pv.derecha[0]+Mk.a[1]*pv.derecha[1]+Mk.a[2]*pv.derecha[2],dj=Mk.a[0]*pv.abajo[0]+Mk.a[1]*pv.abajo[1]+Mk.a[2]*pv.abajo[2];
   linea(x,(c-di*h+.5)*k,(c-dj*h+.5)*k,(c+di*h+.5)*k,(c+dj*h+.5)*k,'rgba(77,208,225,.9)');
   punto(x,(c+di*h+.5)*k,(c+dj*h+.5)*k,'#4dd0e1');punto(x,(c+.5)*k,(c+.5)*k,'#ffee58');}
  // Los tres ejes del ventriculo.
  C.pintar(lienzo('reoCorto',M*esc),C.ejeCorto(r.vol,n,n,Cv,Mk,r.t,M,1),M,op);
  const lv=lienzo('reoVla',M*esc);C.pintar(lv,C.ejeLargoVertical(r.vol,n,n,Cv,Mk,0,M,1),M,op);
  const lh=lienzo('reoHla',M*esc);C.pintar(lh,C.ejeLargoHorizontal(r.vol,n,n,Cv,Mk,0,M,1),M,op);
  // La reconstruccion del equipo, cortada igual.
  const fe=$('reoEq');if(fe){fe.hidden=!r.comparar;if(r.comparar){
   C.pintar(lienzo('reoCortoEq',M*esc),C.ejeCorto(r.comparar,n,n,Cv,Mk,r.t,M,1),M,op);
   C.pintar(lienzo('reoVlaEq',M*esc),C.ejeLargoVertical(r.comparar,n,n,Cv,Mk,0,M,1),M,op);
   C.pintar(lienzo('reoHlaEq',M*esc),C.ejeLargoHorizontal(r.comparar,n,n,Cv,Mk,0,M,1),M,op);}}
  const be=$('reoEjeExacto');if(be)be.hidden=!r.equipo||!!r.marcoFijo;
  // En los ejes largos, una linea marca donde esta el corte de eje corto que se muestra.
  // Largo vertical: el apex hacia la izquierda (columna h - t). Largo horizontal: el apex hacia
  // arriba (fila h - t).
  {const k=lv.width/M,q=((M-1)/2-r.t+.5)*k;lv.getContext('2d').fillStyle='rgba(255,238,88,.6)';lv.getContext('2d').fillRect(q-1,0,2,lv.height);
   const x=lh.getContext('2d');x.fillStyle='rgba(255,238,88,.6)';x.fillRect(0,q-1,lh.width,2);}
  // Referencia en las proyecciones: centro y eje hacia el apex.
  {const h=r.L/2,ap=[0,1,2].map(q=>Cv[q]+Mk.a[q]*h),ba=[0,1,2].map(q=>Cv[q]-Mk.a[q]*h),m={lineas:[[ba,ap,'#4dd0e1']],puntos:[[...ap,'#4dd0e1'],[...Cv,'#ffee58']]};RefProy.dibujar('reoRefAnt','anterior',m);RefProy.dibujar('reoRefLat','lateral',m);}
  $('reoAz').value=r.az;$('reoEl').value=r.el;$('reoAzTexto').textContent=`${r.az}°`;$('reoElTexto').textContent=`${r.el}°`;
  const h=r.L/2;$('reoT').min=Math.round(-h);$('reoT').max=Math.round(h);$('reoT').value=Math.round(r.t);
  $('reoTTexto').textContent=Math.abs(r.t)<.5?'centro':r.t>0?`${dec(r.t*r.sp,0)} mm hacia el ápex`:`${dec(-r.t*r.sp,0)} mm hacia la base`;
  $('reoTecho').value=Math.round(r.techo*100);
  let txt=`Azimut ${r.az}°, elevación ${r.el}° · reconstrucción «${r.etiqueta}».`;
  const ref=r.referencia,q=r.equipo;
  if(q){
   txt=r.marcoFijo?`Eje exacto del equipo: azimut ${dec(q.azimut,1)}°, elevación ${dec(q.elevacion,1)}°.`:`Moviste el eje: azimut ${r.az}°, elevación ${r.el}° (el equipo usó ${dec(q.azimut,1)}° y ${dec(q.elevacion,1)}°).`;
   txt+=` Equipo: ${q.recetaEquipo}. Simulador: ${q.modo==='receta'?`${q.nombre}, sobre proyecciones ${q.fuente||'sin corregir'}; tomó ${dec(q.segundos,0)} s`:`tu reconstrucción «${q.nombre}», sin reconstruir de nuevo`}. Se enmascaró con la máscara del equipo (${q.voxeles.toLocaleString('es-CL')} vóxeles) y se multiplicó por ${dec(q.factor,3)} para igualar la suma dentro de la máscara. Las dos filas usan la misma escala de color, de 0 a ${dec(q.max,0)}. Dentro de la región con actividad: correlación r = ${dec(q.correlacion,3)} y diferencia media ${dec(q.diferencia,1)} %.`;
   if(q.modo==='propia')txt+=' Tu reconstrucción puede tener otra receta que la del equipo: para igualarla usa «Reconstruir con la receta del equipo y comparar».';
   else txt+=` Diferencias que quedan: la OSEM del equipo es 3D y la del simulador es por cortes, sin recuperación de resolución${q.receta.dispersion?(q.dispersion?'; la dispersión se corrigió por doble ventana con k = 0,5, que puede no ser el método del equipo':'; el equipo corrigió dispersión y aquí no se pudo'):''}.`;
  }
  else if(ref)txt+=` El equipo usó azimut ${dec(ref.azimut,1)}° y elevación ${dec(ref.elevacion,1)}°: te separan ${dec(Math.abs(r.az-ref.azimut),0)}° y ${dec(Math.abs(r.el-ref.elevacion),0)}° (tolerancia ${CARDIACO_TOLERANCIA.angulo}°).`;
  else txt+=' Este caso no trae el eje del equipo para comparar: guíate por las imágenes.';
  $('reoResumen').textContent=txt;
  if(typeof r.alCambiar==='function')r.alCambiar(); // el caso 7 recuerda el eje vivo de cada paso
 }

 // Arrastrar mueve el centro del ventriculo en el plano de la imagen tocada.
 function arrastre(id,ejes){
  const c=$(id);let ult=null;
  c.addEventListener('pointerdown',e=>{ult=[e.clientX,e.clientY];try{c.setPointerCapture(e.pointerId);}catch(err){}e.preventDefault();});
  c.addEventListener('pointermove',e=>{
   if(!ult||!r.vol)return;const b=c.getBoundingClientRect(),[der,aba,vox]=ejes(),k=vox/b.width,du=(e.clientX-ult[0])*k,dv=(e.clientY-ult[1])*k;ult=[e.clientX,e.clientY];
   for(let q=0;q<3;q++)r.Cv[q]=Math.max(0,Math.min(r.n-1,r.Cv[q]+der[q]*du+aba[q]*dv));
   pintar();
  });
  const soltar=()=>{ult=null;};c.addEventListener('pointerup',soltar);c.addEventListener('pointercancel',soltar);
 }
 function iniciar(){
  const Mk=()=>marco();
  arrastre('reoAxial',()=>[[1,0,0],[0,1,0],r.n]);
  arrastre('reoVertical',()=>{const p=planoVertical();return [p.derecha,p.abajo,M];});
  arrastre('reoCorto',()=>{const m=Mk();return [m.u,m.v,M];});
  arrastre('reoVla',()=>{const m=Mk();return [m.a.map(q=>-q),m.v,M];});
  arrastre('reoHla',()=>{const m=Mk();return [m.u,m.a.map(q=>-q),M];});
  $('reoAz').addEventListener('input',e=>{r.marcoFijo=null;r.az=+e.target.value;pintar();});
  $('reoEl').addEventListener('input',e=>{r.marcoFijo=null;r.el=+e.target.value;pintar();});
  $('reoT').addEventListener('input',e=>{r.t=+e.target.value;pintar();});
  $('reoTecho').addEventListener('input',e=>{r.techo=Math.max(.05,+e.target.value/100);pintar();});
  const paso=(id,campo,d)=>{let t=null;const f=()=>{const el=$(id);r.marcoFijo=null;r[campo]=Math.max(+el.min,Math.min(+el.max,r[campo]+d));pintar();};const b=$(id+(d>0?'Mas':'Menos'));const parar=()=>{clearInterval(t);t=null;};b.addEventListener('pointerdown',e=>{e.preventDefault();f();parar();t=setInterval(f,120);});['pointerup','pointercancel','pointerleave'].forEach(ev=>b.addEventListener(ev,parar));};
  paso('reoAz','az',1);paso('reoAz','az',-1);paso('reoEl','el',1);paso('reoEl','el',-1);
  $('reoBuscar').addEventListener('click',()=>{if(!r.vol)return;const b=buscar(marco());if(b){r.Cv=b.C.slice();r.L=Math.max(12,b.L);r.t=0;$('reoEstado').className='estado ok';$('reoEstado').textContent='Centro y largo del ventrículo buscados de nuevo con el eje actual.';}else{$('reoEstado').className='estado error';$('reoEstado').textContent='Con este eje no se encontró un anillo dentro de tu caja: gira el eje, arrastra el punto amarillo al centro del ventrículo o vuelve a revisar la caja.';}pintar();});
  $('reoCero').addEventListener('click',()=>{r.marcoFijo=null;r.az=0;r.el=0;r.t=0;pintar();});
  $('reoEjeExacto').addEventListener('click',ejeExacto);
  for(const [id,ejes] of [['reoCortoEq',()=>{const m=Mk();return [m.u,m.v,M];}],['reoVlaEq',()=>{const m=Mk();return [m.a.map(q=>-q),m.v,M];}],['reoHlaEq',()=>{const m=Mk();return [m.u,m.a.map(q=>-q),M];}]])arrastre(id,ejes);
 }
 function olvidar(){r.vol=null;r.origen=null;r.claveCaja=null;r.caja=null;r.referencia=null;r.marcoFijo=null;r.comparar=null;r.equipo=null;cacheVol.entrada=null;cacheVol.vol=null;}
 function fijar(az,el){r.marcoFijo=null;r.az=Math.max(-30,Math.min(120,az));r.el=Math.max(-40,Math.min(60,el));pintar();}
 return {iniciar,abrir,usarEquipo,fijar,olvidar,volumen,estado:r};
})();
window.Reorientar=Reorientar;
