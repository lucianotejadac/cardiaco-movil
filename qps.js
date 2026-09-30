/* Seccion «Mapa polar y resultados en vivo» (estres con atenuacion). Se cambia el angulo del eje
   o la receta de reconstruccion y se ve, al momento, como cambian el mapa polar y los demas datos
   que el equipo muestra en sus pantallas: resultados, porcentaje anormal por segmento, puntajes,
   cortes con contornos, superficie y todos los cortes.
   Referencia: la reconstruccion del simulador con la receta y el eje del equipo. Con ella se
   calibran, una sola vez, los bordes de la pared, el limite normal y los factores; despues todo
   queda congelado y lo unico que cambia es lo que decide quien procesa.
   La calibracion vale solo para el caso de referencia (se reconoce por la huella de su marco de
   referencia); con otro examen la seccion funciona sin los datos del equipo. */
'use strict';
const Qps=(()=>{
 const Q=QpsNucleo,$=id=>document.getElementById(id),dec=(x,d=0)=>Number(x).toFixed(d).replace('.',',');
 // Lo que informo el equipo en el caso de referencia (pantalla «Splash AC»).
 const INFORME='El informe médico describe un defecto inferolateral apical, medio y basal, de cerca de 10 % del ventrículo, reversible por completo en reposo, en las imágenes sin corrección de atenuación. Las imágenes con corrección de atenuación no se usaron para interpretar, por actividad intestinal en la fase de reposo.';
 const INFORME8='El informe médico describe, en estrés y en reposo, un defecto de perfusión en las paredes inferolateral, inferior y anterolateral, en sus segmentos medios y basales, de cerca de 30 % del ventrículo, sin reversibilidad en reposo. El gatillado muestra hipocinesia marcada inferolateral y una fracción de eyección de 35 % en estrés y 34 % en reposo, sin dilatación transitoria (TID 1,04). Impresión: necrosis en esas paredes, sin isquemia.';
 const ZONA8_ESTRES_AC='1807,2,94,3,94,4,92,5,1,1,90,6,90,7,89,8,87,9,86,11,84,12,82,15,79,17,78,19,76,20,78,18,78,19,77,19,76,20,77,19,77,20,41,1,1,1,32,20,40,4,32,20,39,6,31,20,39,6,30,21,38,8,25,26,37,11,21,27,36,14,19,27,36,16,17,27,37,15,16,28,38,14,13,31,38,14,13,31,37,14,12,33,36,13,13,34,39,6,17,34,39,4,18,35,58,38,59,36,60,36,60,36,59,37,59,37,56,39,57,39,57,39,57,39,56,39,53,1,2,40,57,39,57,38,57,39,56,39,56,40,56,39,58,38,57,38,55,40,55,41,55,40,56,39,57,39,57,38,56,39,52,43,53,42,54,41,54,41,55,40,56,38,58,37,58,36,60,34,62,33,64,30,67,27,72,21,77,15,81,10,138',ZONA8_REPOSO_AC='2102,1,94,2,92,5,89,8,87,9,86,11,86,10,86,11,85,11,85,12,85,11,85,11,83,14,80,16,79,17,79,17,79,18,78,18,78,18,78,18,75,21,73,24,72,24,71,25,71,25,70,26,69,27,69,27,69,27,66,30,66,30,65,31,64,32,60,35,61,35,62,34,62,34,61,35,60,35,60,36,59,37,58,38,58,37,58,38,57,39,57,38,55,1,1,39,55,40,56,40,56,39,58,38,57,38,58,37,59,37,59,36,56,2,1,36,57,39,57,38,58,37,58,37,59,36,56,39,54,41,55,40,56,38,58,37,58,36,60,34,62,33,64,30,67,27,72,21,77,15,81,10,138';
 const ZONA_ESTRES_NOAC='2914,2,89,1,1,6,88,8,87,10,87,9,87,10,85,12,84,11,84,12,84,13,82,15,82,15,81,16,81,15,81,15,81,15,33,1,47,14,27,2,1,6,46,14,26,10,46,14,26,10,47,11,28,10,48,9,29,11,48,4,33,15,81,16,79,18,78,18,78,18,78,17,80,16,80,16,80,15,80,16,79,17,79,16,79,17,79,16,80,16,81,14,82,9,1,3,83,7,89,6,12,1,76,3,93,1,2334',ZONA_REPOSO_NOAC='3968,1,94,2,92,4,91,6,90,7,93,2,4766';
 // Clave: huella de la fase; con «|noac», la reconstruccion sin atenuacion.
 const EQUIPO={'22d4f455':{serie:'Stress [Recon - AC ]',estado:'QC=1.38, IR=0.31',normales:'symbiaMaleStressTc_AC',volumen:43,pared:120,cuentas:1105,defecto:25,extension:21,tpd:16,forma:.46,excentricidad:.86,puntajes:{6:2,14:1,16:2,11:3,5:2,10:2,4:1},
  // Zona bajo el limite normal que dibujo QPS en el estres SIN atenuacion (96 x 96, largos de
  // corrida alternando fuera y dentro). El equipo no guardo el mapa con atenuacion.
  zonaSinAtenuacion:ZONA_ESTRES_NOAC,
  informe:INFORME},
  // Reposo con atenuacion (pantalla «Splash AC»). El equipo marco «Mask Failure: QC=4.47»: su
  // mascara del ventriculo fallo. La referencia reproduce ese resultado tal como lo informo.
  '474e44e4':{serie:'Rest [Recon - AC ]',estado:'Mask Failure: QC=4.47',normales:'symbiaMaleRestTc_AC',volumen:87,pared:197,cuentas:2173,defecto:18,extension:9,tpd:7,forma:.46,excentricidad:.93,puntajes:{6:2,11:2,5:2,4:1},
  aviso:'Mask Failure: QC=4.47',informe:INFORME},
  // Sin atenuacion (pantalla QGS+QPS: QPS). El equipo si guardo estos mapas polares: la zona bajo el
  // limite es la que dibujo y su imagen se muestra al revelar el resultado.
  '22d4f455|noac':{serie:'Stress [Recon - NoAC ]',estado:'QC=1.12, IR=0.33',normales:'symbiaMaleStressTc_NC_F3D',volumen:42,pared:110,cuentas:356,defecto:12,extension:11,tpd:9,forma:.55,excentricidad:.81,puntajes:{14:2,16:1,11:2,5:1},
  zonaSinAtenuacion:ZONA_ESTRES_NOAC,zonaPropia:true,imagen:'caso7-qps-noac-estres.png',informe:INFORME},
  '474e44e4|noac':{serie:'Rest [Recon - NoAC ]',estado:'QC=1.41, IR=0.29',normales:'symbiaMaleRestTc_NC_F3D',volumen:52,pared:128,cuentas:557,defecto:1,extension:1,tpd:1,forma:.53,excentricidad:.83,puntajes:{14:1},
  zonaSinAtenuacion:ZONA_REPOSO_NOAC,zonaPropia:true,imagen:'caso7-qps-noac-reposo.png',informe:INFORME},
  // Caso 8. El equipo guardo los mapas polares CON atenuacion (pantalla QPS): esa zona es la de referencia; sin atenuacion,
  // la zona parte de la dibujada con atenuacion y se ajusta a los segmentos que puntuo (pantalla Splash NO AC).
  '127d82cf':{serie:'Stress [Recon - AC ]',estado:'QC=1.90, IR=0.55',normales:'symbiaMaleStressTc_AC',volumen:94,pared:145,cuentas:1985,defecto:48,extension:33,tpd:30,forma:.71,excentricidad:.84,puntajes:{4:3,5:4,6:2,10:2,11:4,12:2,16:3,17:2},
  zonaSinAtenuacion:ZONA8_ESTRES_AC,zonaPropia:true,imagen:'caso8-qps-ac-estres.png',informe:INFORME8},
  '2061c0ed':{serie:'Rest [Recon - AC ]',estado:'QC=1.82, IR=0.17',normales:'symbiaMaleRestTc_AC',volumen:90,pared:143,cuentas:1473,defecto:37,extension:26,tpd:24,forma:.67,excentricidad:.84,puntajes:{4:3,5:4,6:2,10:2,11:4,16:2},
  zonaSinAtenuacion:ZONA8_REPOSO_AC,zonaPropia:true,imagen:'caso8-qps-ac-reposo.png',informe:INFORME8},
  '127d82cf|noac':{serie:'Stress [Recon - NoAC ]',estado:'QC=1.61, IR=0.60',normales:'symbiaMaleStressTc_NC_F3D',volumen:86,pared:138,cuentas:575,defecto:40,extension:29,tpd:27,forma:.69,excentricidad:.83,puntajes:{4:3,5:4,6:1,10:2,11:4,14:1,16:2,17:2},
  zonaSinAtenuacion:ZONA8_ESTRES_AC,previaDe:'con atenuación',informe:INFORME8},
  '2061c0ed|noac':{serie:'Rest [Recon - NoAC ]',estado:'QC=1.83, IR=0.14',normales:'symbiaMaleRestTc_NC_F3D',volumen:93,pared:144,cuentas:464,defecto:37,extension:26,tpd:26,forma:.65,excentricidad:.85,puntajes:{4:3,5:4,6:2,10:2,11:4,16:2},
  zonaSinAtenuacion:ZONA8_REPOSO_AC,previaDe:'con atenuación',informe:INFORME8}};
 const desplegar=(rle,n)=>{const z=new Uint8Array(n*n);let o=0,v=0;for(const k of rle.split(',').map(Number)){if(v)z.fill(1,o,o+k);o+=k;v^=1;}return z;};
 const N=192,q={listo:false,ocupado:false,dAz:0,dEl:0,t:null,guardadas:new Map()};

 /* ---------- reconstrucciones guardadas en el dispositivo ---------- */
 // Base de datos propia del navegador (IndexedDB). Cada reconstruccion se guarda recortada a la
 // caja que tiene datos (el resto es cero por la mascara), asi pesa menos de medio megabyte.
 const BD={nombre:'cardiaco-movil-recon',tienda:'recon',version:'v1'};
 function bd(){return new Promise((ok,mal)=>{const r=indexedDB.open(BD.nombre,1);r.onupgradeneeded=()=>r.result.createObjectStore(BD.tienda);r.onsuccess=()=>ok(r.result);r.onerror=()=>mal(r.error);});}
 async function tienda(modo,f){const b=await bd();try{return await new Promise((ok,mal)=>{const t=b.transaction(BD.tienda,modo),r=f(t.objectStore(BD.tienda));t.oncomplete=()=>ok(r&&r.result);t.onerror=()=>mal(t.error);t.onabort=()=>mal(t.error);});}finally{b.close();}}
 function empacar(vol,n){
  let x0=n,x1=-1,y0=n,y1=-1,z0=n,z1=-1;const p=n*n;
  for(let z=0;z<n;z++)for(let y=0;y<n;y++){const o=z*p+y*n;for(let x=0;x<n;x++)if(vol[o+x]!==0){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;if(z<z0)z0=z;if(z>z1)z1=z;}}
  if(x1<0)return {n,caja:[0,0,0,0,0,0],datos:new Float32Array(1)};
  const w=x1-x0+1,h=y1-y0+1,k=z1-z0+1,d=new Float32Array(w*h*k);for(let z=0;z<k;z++)for(let y=0;y<h;y++)d.set(vol.subarray((z+z0)*p+(y+y0)*n+x0,(z+z0)*p+(y+y0)*n+x0+w),(z*h+y)*w);
  return {n,caja:[x0,x1,y0,y1,z0,z1],datos:d};
 }
 function desempacar(e){const n=e.n,p=n*n,[x0,x1,y0,y1,z0,z1]=e.caja,w=x1-x0+1,h=y1-y0+1,k=z1-z0+1,vol=new Float32Array(n*p);for(let z=0;z<k;z++)for(let y=0;y<h;y++)vol.set(e.datos.subarray((z*h+y)*w,(z*h+y)*w+w),(z+z0)*p+(y+y0)*n+x0);return vol;}
 const claveReceta=r=>`${r.it}x${r.sub}|${Number(r.fwhm).toFixed(1)}|${r.ac?'ac':'noac'}|${r.dispersion?'disp':'sin'}`;
 // Con atenuacion, la clave de siempre; sin atenuacion lleva «noac|» (otra mascara y otra escala).
 const prefijo=(s,fuente,tipo=q.tipo)=>`${BD.version}|${cardiacoHash(s.frame)}|${fuente}|${tipo==='noac'?'noac|':''}`;
 async function leerReferencia(s,fuente,tipo='ac'){
  try{const e=await tienda('readonly',t=>t.get(prefijo(s,fuente,tipo)+'referencia'));if(!e||!e.vol)return null;return {...e.meta,sim:desempacar(e.vol),guardada:true};}
  catch(err){console.warn('No se pudo leer lo guardado',err);return null;}
 }
 async function guardarReferencia(s,fuente,x,cal,tipo='ac'){
  const meta={marco:x.marco,centro:x.centro,factor:x.factor,receta:x.receta,descripcion:x.descripcion,recetaEquipo:x.recetaEquipo,nombre:x.nombre,cal:cal||null,fecha:Date.now()};
  try{await tienda('readwrite',t=>t.put({meta,vol:empacar(x.sim,s.n)},prefijo(s,fuente,tipo)+'referencia'));if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});return true;}
  catch(err){console.warn('No se pudo guardar la referencia',err);return false;}
 }
 async function guardarReceta(r,vol){try{await tienda('readwrite',t=>t.put({receta:r,vol:empacar(vol,q.s.n),fecha:Date.now()},prefijo(q.s,q.fuente)+'receta|'+claveReceta(r)));}catch(err){console.warn('No se pudo guardar la reconstrucción',err);}}
 async function leerRecetas(){
  q.guardadas=new Map();
  try{const p=prefijo(q.s,q.fuente)+'receta|',b=await bd();try{await new Promise((ok,mal)=>{const c=b.transaction(BD.tienda,'readonly').objectStore(BD.tienda).openCursor(IDBKeyRange.bound(p,p+'\uffff'));c.onsuccess=()=>{const k=c.result;if(!k){ok();return;}q.guardadas.set(claveReceta(k.value.receta),{receta:k.value.receta,vol:desempacar(k.value.vol)});k.continue();};c.onerror=()=>mal(c.error);});}finally{b.close();}}
  catch(err){console.warn('No se pudieron leer las reconstrucciones guardadas',err);}
 }
 async function borrarGuardadas(){
  try{const p=prefijo(q.s,q.fuente);await tienda('readwrite',t=>t.delete(IDBKeyRange.bound(p,p+'\uffff')));}catch(err){console.warn(err);}
  q.guardadas=new Map();aReferencia();
 }
 const PAL=[[0,0,0],[0,15,14],[0,51,50],[0,85,84],[0,119,118],[26,99,154],[60,65,188],[94,31,222],[130,2,246],[164,36,178],[198,70,110],[234,106,38],[254,140,26],[254,174,94],[254,210,166],[254,240,225]],PX=[0,3.5,10.4,17.4,24.3,31.3,38.3,45.2,52.2,59.1,66.1,73,80,87,93.9,100];
 function color(v){v=Math.min(100,Math.max(0,v||0));let i=1;while(i<PX.length-1&&PX[i]<v)i++;const f=(v-PX[i-1])/(PX[i]-PX[i-1]);return [0,1,2].map(c=>PAL[i-1][c]+(PAL[i][c]-PAL[i-1][c])*f);}
 const TABLA=new Uint8Array(1001*3);for(let i=0;i<=1000;i++){const c=color(i/10);TABLA[i*3]=c[0];TABLA[i*3+1]=c[1];TABLA[i*3+2]=c[2];}
 const rgb=v=>{const i=Math.min(1000,Math.max(0,Math.round(v*10)))*3;return [TABLA[i],TABLA[i+1],TABLA[i+2]];};

 /* ---------- preparacion: referencia y calibracion ---------- */
 // ref: resultado de EjeEquipo.ejecutar (simulador con la receta del equipo, en su escala y con su mascara).
 async function abrir({s,reg,ref,fuente,avance}){
  const n=s.n;q.caso7=false;q.tipo='ac';q.s=s;q.reg=reg;q.fuente=fuente;q.d={nx:n,ny:n,nz:n};q.sp=s.spacing;q.x=ref;q.marco=ref.marco;q.O0=ref.centro.slice();q.factor=ref.factor;
  q.recetaEquipo={...ref.receta};q.receta={...ref.receta};q.volRef=ref.sim;q.vol=ref.sim;q.dAz=0;q.dEl=0;
  q.obj=EQUIPO[cardiacoHash(s.frame)]||null;
  avance&&avance('Calibrando con la reconstrucción de referencia…');await new Promise(r=>setTimeout(r,30));
  const c=Q.calibrar(q.volRef,q.d,q.marco,q.O0,q.sp,q.obj,N,ref.cal||null);q.cal=c.cal;q.calibrado=c.calibrado;q.deMemoria=!!ref.guardada;
  if(!ref.guardada)await guardarReferencia(s,fuente,ref,c.cal);else if(!ref.cal)await guardarReferencia(s,fuente,ref,c.cal);
  await leerRecetas();
  const R=Q.medir(q.volRef,q.d,c.E,c.P,c.W,c.S,c.cal,q.sp,N);q.R0=R;
  if(q.obj){
   const z=Q.zonaPorPuntajes(R,q.obj.puntajes,q.obj.extension,q.obj.zonaSinAtenuacion?desplegar(q.obj.zonaSinAtenuacion,96):null,96);q.L=Q.limiteDesdeZona(R,z.zona);q.umbral=z.umbral;const p=Q.perfusion(R,q.L);
   q.f={cuentas:q.obj.cuentas/R.medidas.cuentas,forma:q.obj.forma/R.medidas.forma,excentricidad:q.obj.excentricidad/R.medidas.excentricidad,extension:q.obj.extension/p.extension,severidad:q.obj.tpd/p.extensionArea};
   q.refSeg={};for(let k=1;k<=17;k++)q.refSeg[k]=p.valor[k]/(1.05-.1*(q.obj.puntajes[k]||0));
  }else{q.L=null;q.f={cuentas:1,forma:1,excentricidad:1,extension:1,severidad:.9};q.refSeg=null;}
  q.ref=resultado(R);q.listo=true;controles();calcular();
 }
 /* Caso 7: el eje de partida es el del estudiante; la calibracion viene congelada (constantes
    obtenidas con los datos sin saltos y el eje del equipo) o, si faltan, se hace aqui con el eje del
    equipo. La referencia del equipo queda oculta hasta que se pide. */
 async function abrirCaso7({s,reg,ref,fuente,marco,centro,fase,tipo}){
  const n=s.n;q.caso7=true;q.revelar=false;q.s=s;q.reg=reg;q.fuente=fuente;q.d={nx:n,ny:n,nz:n};q.sp=s.spacing;q.x=ref;q.factor=ref.factor;
  q.recetaEquipo={...ref.receta};q.receta={...ref.receta};q.volRef=ref.sim;q.vol=ref.sim;q.dAz=0;q.dEl=0;q.tipo=tipo==='noac'?'noac':'ac';const clave=cardiacoHash(s.frame)+(q.tipo==='noac'?'|noac':'');q.obj=EQUIPO[clave]||null;
  q.marcoEquipo=ref.marco;q.marco=marco;q.O0=centro.slice();
  q.fase=fase||'estres';const KK=window.CASO7_CONSTANTES,kk=KK&&KK[clave],K=kk?constantesDesde(kk):null;
  if(K){q.cal=K.cal;q.f=K.f;q.refSeg=K.refSeg;q.L=K.L;q.congelado=true;q.R0=Q.evaluar(q.volRef,q.d,ref.marco,ref.centro,q.cal,q.sp,N);}
  else{
   const c=Q.calibrar(q.volRef,q.d,ref.marco,ref.centro,q.sp,q.obj,N,ref.cal||null);q.cal=c.cal;q.congelado=false;const R=Q.medir(q.volRef,q.d,c.E,c.P,c.W,c.S,c.cal,q.sp,N);q.R0=R;
   const z=Q.zonaPorPuntajes(R,q.obj.puntajes,q.obj.extension,q.obj.zonaSinAtenuacion?desplegar(q.obj.zonaSinAtenuacion,96):null,96);q.L=Q.limiteDesdeZona(R,z.zona);const p=Q.perfusion(R,q.L);
   q.f={cuentas:q.obj.cuentas/R.medidas.cuentas,forma:q.obj.forma/R.medidas.forma,excentricidad:q.obj.excentricidad/R.medidas.excentricidad,extension:q.obj.extension/p.extension,severidad:q.obj.tpd/p.extensionArea};
   q.refSeg={};for(let k=1;k<=17;k++)q.refSeg[k]=p.valor[k]/(1.05-.1*(q.obj.puntajes[k]||0));
  }
  if(!ref.guardada)await guardarReferencia(s,fuente,ref,q.cal,q.tipo);
  await leerRecetas();q.ref=resultado(q.R0);
  if(q.obj){const o=q.obj;Object.assign(q.ref,{volumen:o.volumen,pared:o.pared,cuentas:o.cuentas,defecto:o.defecto,extension:o.extension,tpd:o.tpd,forma:o.forma,excentricidad:o.excentricidad,puntajes:Object.fromEntries(Array.from({length:17},(_,i)=>[i+1,o.puntajes[i+1]||0])),sss:Object.values(o.puntajes).reduce((a,b)=>a+b,0)});}
  q.listo=true;controles();calcular();
 }
 // Constantes del caso 7: limite normal en enteros (centesimas; -32768 fuera del disco) en base64.
 function constantesDesde(k){const b=atob(k.L),v=new Int16Array(b.length/2);for(let i=0;i<v.length;i++)v[i]=(b.charCodeAt(2*i)|(b.charCodeAt(2*i+1)<<8))<<16>>16;const L=new Float32Array(v.length);for(let i=0;i<v.length;i++)L[i]=v[i]===-32768?-1e9:v[i]/100;return {cal:k.cal,f:k.f,refSeg:k.refSeg,L};}
 function exportarConstantes(){const v=new Int16Array(q.L.length);for(let i=0;i<v.length;i++)v[i]=q.L[i]<-1000?-32768:Math.max(-32767,Math.min(32767,Math.round(q.L[i]*100)));let s='';const u=new Uint8Array(v.buffer);for(let i=0;i<u.length;i++)s+=String.fromCharCode(u[i]);return {N,cal:q.cal,f:q.f,refSeg:q.refSeg,L:btoa(s)};}
 function resultado(X){
  const m=X.medidas,p=q.L?Q.perfusion(X,X===q.R0?q.L:Q.limiteEn(q.R0,q.L,X)):null,r={X,p};
  r.volumen=m.volumen;r.pared=m.pared;r.cuentas=m.cuentas*q.f.cuentas;r.forma=m.forma*q.f.forma;r.excentricidad=Math.min(.99,m.excentricidad*q.f.excentricidad);r.largo=m.largo;
  if(p){r.extension=p.extension*q.f.extension;r.defecto=r.extension/100*m.pared;r.tpd=p.extensionArea*q.f.severidad;r.porcentaje=p.porcentaje;r.valor=p.valor;r.zona=p.zona;
   r.puntajes={};for(let k=1;k<=17;k++)r.puntajes[k]=Q.puntaje(p.valor[k],q.refSeg[k]);r.sss=Object.values(r.puntajes).reduce((a,b)=>a+b,0);}
  else{const v={},d=new Float64Array(18),s=new Float64Array(18);for(let o=0;o<X.A.length;o++)if(X.rho[o]<1){d[X.seg[o]]+=X.area[o];s[X.seg[o]]+=X.area[o]*X.A[o];}for(let k=1;k<=17;k++)v[k]=s[k]/(d[k]||1);r.valor=v;}
  return r;
 }
 const ejeActual=()=>Q.girar(q.marco,q.dAz,q.dEl);
 function calcular(){
  if(!q.listo)return;const t0=performance.now(),aviso=$('qpsEstado');
  try{
   const X=(!q.caso7&&q.dAz===0&&q.dEl===0&&q.vol===q.volRef)?q.R0:Q.evaluar(q.vol,q.d,ejeActual(),q.caso7?q.O0:q.R0.E.O,q.cal,q.sp,N);q.act=resultado(X);
   const m=X.medidas,m0=q.R0.medidas,salto=Math.abs(m.pared/m0.pared-1)>.2||Math.abs(m.semiejeLargo/m0.semiejeLargo-1)>.12;q.inestable=salto&&q.vol===q.volRef;
   aviso.className=q.inestable?'estado error':'estado ok';aviso.textContent=q.inestable?'Con este eje el ajuste de la pared dejó de ser confiable: la pared medida cambió más de 20 %. Los números de esta condición no deben leerse; '+(q.caso7?'revisa el centro y endereza el eje.':'acerca el eje al del equipo.'):`${q.caso7?(q.dAz||q.dEl?'Tu eje, girado con los deslizadores.':'Tu eje, el que dejaste en la reorientación.'):esReferencia()?'Condición de referencia: eje y receta del equipo.':'Condición modificada.'} Cálculo en ${dec(performance.now()-t0,0)} ms.`;
  }catch(err){aviso.className='estado error';aviso.textContent='No se pudo calcular con este eje: '+(err.message||err)+(q.caso7?' Revisa que el centro (la caja o el punto amarillo de la reorientación) esté sobre el ventrículo y endereza el eje.':' Acerca el eje al del equipo.');console.error(err);return;}
  pintar();
 }
 const mismaReceta=(a,b)=>a.it===b.it&&a.sub===b.sub&&Math.abs(a.fwhm-b.fwhm)<.05&&!!a.ac===!!b.ac&&!!a.dispersion===!!b.dispersion;
 const esReferencia=()=>!q.caso7&&q.dAz===0&&q.dEl===0&&q.vol===q.volRef;
 const oculto=()=>q.caso7&&!q.revelar;
 const textoReceta=r=>`OSEM ${r.it} × ${r.sub}${r.ac?' con atenuación':' sin atenuación'}${r.dispersion?' y dispersión':''}${r.fwhm>0?`, gaussiano ${dec(r.fwhm,1)} mm`:', sin filtro'}`;

 /* ---------- controles ---------- */
 function controles(){
  $('qpsAz').value=q.dAz;$('qpsEl').value=q.dEl;const r=q.receta;$('qpsIter').value=r.it;$('qpsSub').value=String(r.sub);$('qpsFwhm').value=r.fwhm;$('qpsAC').checked=!!r.ac;$('qpsDisp').checked=!!r.dispersion;
  $('qpsAC').disabled=!(q.reg&&q.reg.ct);$('qpsDisp').disabled=!q.s.views.some(v=>v.window===2);
 }
 function leerReceta(){return {it:Math.min(20,Math.max(1,Math.round(+$('qpsIter').value||1))),sub:+$('qpsSub').value,fwhm:Math.min(25,Math.max(0,+$('qpsFwhm').value||0)),ac:$('qpsAC').checked,dispersion:$('qpsDisp').checked};}
 async function reconstruir(){
  if(!q.listo||q.ocupado)return;const r=leerReceta(),aviso=$('qpsEstado');
  if(q.s.views.filter(v=>v.window===1&&v.slot===1).length%r.sub){aviso.className='estado error';aviso.textContent=`Con ${r.sub} subconjuntos el número de vistas no es divisible.`;return;}
  q.ocupado=true;$('qpsReconstruir').disabled=true;
  try{
   if(mismaReceta(r,q.recetaEquipo)){q.vol=q.volRef;q.receta={...q.recetaEquipo};}
   else if(q.guardadas.has(claveReceta(r))){q.vol=q.guardadas.get(claveReceta(r)).vol;q.receta=r;}
   else{const v=await EjeEquipo.reconstruirCon({s:q.s,reg:q.reg,receta:r,factor:q.factor});if(!v)return;q.vol=v.sim;q.receta=r;q.segundos=v.segundos;q.guardadas.set(claveReceta(r),{receta:r,vol:v.sim});await guardarReceta(r,v.sim);}
   calcular();
  }catch(err){const det=EjeEquipo.estado.detenido;aviso.className=det?'estado':'estado error';aviso.textContent=det?'Reconstrucción detenida.':'No se pudo reconstruir: '+(err.message||err);if(!det)console.error(err);}
  finally{q.ocupado=false;$('qpsReconstruir').disabled=false;}
 }
 function aReferencia(){q.dAz=0;q.dEl=0;q.vol=q.volRef;q.receta={...q.recetaEquipo};controles();calcular();}

 /* ---------- dibujo ---------- */
 function lienzo(id,w,h){const c=typeof id==='string'?$(id):id;if(c.width!==w||c.height!==h){c.width=w;c.height=h;}return c.getContext('2d');}
 function polar(id,r,lado,numeros){
  const X=r.X,x=lado,ctx=lienzo(id,x,x),im=ctx.createImageData(x,x),R=x/2;
  for(let j=0;j<x;j++)for(let i=0;i<x;i++){const u=(i+.5)/x*N-.5,v=(j+.5)/x*N-.5,i0=Math.min(N-1,Math.max(0,Math.round(u))),j0=Math.min(N-1,Math.max(0,Math.round(v))),o=j0*N+i0,p=(j*x+i)*4;
   if(Math.hypot(i+.5-R,j+.5-R)>=R-1){im.data[p+3]=255;continue;}
   const c=r.zona&&r.zona[o]?[0,0,0]:rgb(X.A[o]);im.data[p]=c[0];im.data[p+1]=c[1];im.data[p+2]=c[2];im.data[p+3]=255;}
  if(r.zona)for(let j=1;j<x-1;j++)for(let i=1;i<x-1;i++){const o=k=>r.zona[Math.min(N-1,Math.round((j+k[1]+.5)/x*N-.5))*N+Math.min(N-1,Math.round((i+k[0]+.5)/x*N-.5))];if(!o([0,0])&&(o([1,0])||o([-1,0])||o([0,1])||o([0,-1]))&&Math.hypot(i+.5-R,j+.5-R)<R-1){const p=(j*x+i)*4;im.data[p]=im.data[p+1]=im.data[p+2]=255;}}
  ctx.putImageData(im,0,0);ctx.strokeStyle='#00e5e5';ctx.lineWidth=1;
  for(const f of [.25,.5,.75,1]){ctx.beginPath();ctx.arc(R,R,R*f-.5,0,2*Math.PI);ctx.stroke();}
  for(let k=0;k<6;k++){const a=k*Math.PI/3;ctx.beginPath();ctx.moveTo(R+.5*R*Math.cos(a),R+.5*R*Math.sin(a));ctx.lineTo(R+R*Math.cos(a),R+R*Math.sin(a));ctx.stroke();}
  for(let k=0;k<4;k++){const a=Math.PI/4+k*Math.PI/2;ctx.beginPath();ctx.moveTo(R+.25*R*Math.cos(a),R+.25*R*Math.sin(a));ctx.lineTo(R+.5*R*Math.cos(a),R+.5*R*Math.sin(a));ctx.stroke();}
  if(numeros){ctx.fillStyle='#00ff00';ctx.font=`${Math.round(x/24)}px system-ui,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';for(const [s,px,py] of posiciones())ctx.fillText(String(Math.round(numeros[s])),R+px*R,R+py*R);}
 }
 function posiciones(){const p=[[17,0,0]];[1,6,5,4,3,2].forEach((s,k)=>{const a=-Math.PI/2+k*Math.PI/3;p.push([s,.875*Math.cos(a),.875*Math.sin(a)],[s+6,.625*Math.cos(a),.625*Math.sin(a)]);});[13,16,15,14].forEach((s,k)=>{const a=-Math.PI/2+k*Math.PI/2;p.push([s,.375*Math.cos(a),.375*Math.sin(a)]);});return p;}
 function miniatura(id,punt,lado){
  const ctx=lienzo(id,lado,lado),R=lado/2-2,c=lado/2,zona=s=>[5,6,11,12,16].includes(s)?'#7ec4aa':[3,4,9,10,15].includes(s)?'#7ea0de':'#b0a896';ctx.clearRect(0,0,lado,lado);ctx.strokeStyle='#000';ctx.lineWidth=1;
  const sector=(r0,r1,a0,a1,s)=>{ctx.beginPath();ctx.arc(c,c,R*r1,a0,a1);ctx.arc(c,c,R*r0,a1,a0,true);ctx.closePath();ctx.fillStyle=zona(s);ctx.fill();ctx.stroke();};
  [5,4,3,2,1,6].forEach((s,k)=>{sector(.75,1,k*Math.PI/3,(k+1)*Math.PI/3,s);sector(.5,.75,k*Math.PI/3,(k+1)*Math.PI/3,s+6);});[16,15,14,13].forEach((s,k)=>sector(.25,.5,-Math.PI/4+k*Math.PI/2,Math.PI/4+k*Math.PI/2,s));
  ctx.beginPath();ctx.arc(c,c,R*.25,0,2*Math.PI);ctx.fillStyle=zona(17);ctx.fill();ctx.stroke();ctx.font=`${Math.round(lado/13)}px system-ui,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
  for(const [s,px,py] of posiciones()){const v=punt?punt[s]||0:0;ctx.fillStyle=v?'#d00000':'#000';ctx.fillText(String(v),c+px*R,c+py*R);}
 }
 // Corte del volumen: centro C, ejes de la imagen (derecha, abajo) en voxeles; lado en voxeles.
 function corte(ctx,x0,y0,lado,vol,C,der,aba,semi,vmax){
  const im=ctx.createImageData(lado,lado),e=2*semi/lado;
  for(let j=0;j<lado;j++)for(let i=0;i<lado;i++){const a=(i+.5)*e-semi,b=(j+.5)*e-semi,v=Q.muestra(vol,q.d,C[0]+der[0]*a+aba[0]*b,C[1]+der[1]*a+aba[1]*b,C[2]+der[2]*a+aba[2]*b),c=rgb(100*v/vmax),p=(j*lado+i)*4;im.data[p]=c[0];im.data[p+1]=c[1];im.data[p+2]=c[2];im.data[p+3]=255;}
  ctx.putImageData(im,x0,y0);
 }
 function contorno(ctx,x0,y0,lado,S,nsel,C,der,aba,nor,semi,col,soloAnillo){
  const NF=Q.NF,k=lado/(2*semi),P=(i,j)=>{const o=(i*NF+((j+NF)%NF))*3;return [S[o]-C[0],S[o+1]-C[1],S[o+2]-C[2]];},dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];ctx.fillStyle=col;
  const cruce=(a,b)=>{const da=dot(a,nor),db=dot(b,nor);if(da*db>0||da===db)return;const f=da/(da-db),p=[0,1,2].map(c=>a[c]+(b[c]-a[c])*f),x=(dot(p,der)+semi)*k,y=(dot(p,aba)+semi)*k;if(x>=0&&y>=0&&x<lado&&y<lado)ctx.fillRect(x0+x-1,y0+y-1,2,2);};
  for(let i=soloAnillo?nsel-1:0;i<nsel;i++)for(let j=0;j<NF;j++){cruce(P(i,j),P(i,j+1));if(!soloAnillo&&i<nsel-1)cruce(P(i,j),P(i+1,j));}
 }
 function vmaxDe(vol){let m=0;for(let i=0;i<vol.length;i+=7)if(vol[i]>m)m=vol[i];return m*.97||1;}
 function cortes(r,destino){
  const X=r.X,E=X.E,a=E.eje,u=E.u,v=E.v,na=a.map(t=>-t),vm=vmaxDe(q.vol),lado=150,semi=22,ctx=lienzo(destino||'qpsCortes',lado*3+8,lado*2+30);ctx.fillStyle='#000';ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
  const pos=t=>[0,1,2].map(c=>E.O[c]+a[c]*t),rot=(t,x,y)=>{ctx.fillStyle='#00ff00';ctx.font='12px system-ui,sans-serif';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(t,x+3,y+2);};
  [[.55*E.a,'Eje corto · hacia el ápex'],[0,'Eje corto · medio'],[-.45*E.a,'Eje corto · hacia la base']].forEach(([t,n],k)=>{const C=pos(t),x=k*(lado+4);corte(ctx,x,0,lado,q.vol,C,u,v,semi,vm);contorno(ctx,x,0,lado,X.Se,X.nsel,C,u,v,a,semi,'#ffe63c');contorno(ctx,x,0,lado,X.Sp,X.nsel,C,u,v,a,semi,'#ffa028');rot(n,x,0);});
  const y=lado+6;
  corte(ctx,0,y,lado,q.vol,E.O,u,na,semi,vm);for(const [S,c] of [[X.Se,'#ffe63c'],[X.Sp,'#ffa028']]){contorno(ctx,0,y,lado,S,X.nsel,E.O,u,na,v,semi,c);contorno(ctx,0,y,lado,S,X.nsel,E.O,u,na,v,semi,'#fff',true);}rot('Largo horizontal',0,y);
  corte(ctx,lado+4,y,lado,q.vol,E.O,a,v,semi,vm);for(const [S,c] of [[X.Se,'#ffe63c'],[X.Sp,'#ffa028']]){contorno(ctx,lado+4,y,lado,S,X.nsel,E.O,a,v,u,semi,c);contorno(ctx,lado+4,y,lado,S,X.nsel,E.O,a,v,u,semi,'#fff',true);}rot('Largo vertical',lado+4,y);
  superficie3d(ctx,2*(lado+4),y,lado,r);rot('Superficie',2*(lado+4),y);
 }
 function superficie3d(ctx,x0,y0,lado,r){
  const X=r.X,E=X.E,NF=Q.NF,S=X.Sm,nsel=X.nsel,pi=3,pj=4,rotar=(p,qq,g)=>{const c=Math.cos(g*Math.PI/180),s=Math.sin(g*Math.PI/180);return [[0,1,2].map(k=>c*p[k]+s*qq[k]),[0,1,2].map(k=>-s*p[k]+c*qq[k])];};
  let der=E.eje.slice(),arr=E.v.map(t=>-t),hac=E.u.map(t=>-t);[der,hac]=rotar(der,hac,-58);[arr,hac]=rotar(arr,hac,8);[der,arr]=rotar(der,arr,4);
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],esc=lado/36,P=(i,j)=>{const o=(i*NF+((j+NF)%NF))*3,d=[S[o]-E.O[0],S[o+1]-E.O[1],S[o+2]-E.O[2]];return {x:x0+lado/2+dot(d,der)*esc,y:y0+lado/2-dot(d,arr)*esc,z:dot(d,hac),d};},luz=[-.45,.45,.77],ln=Math.hypot(...luz),caras=[];
  const T=Q.arco(E,X.cal.base),frac=t=>{let a=0,b=T.t.length-1;while(b-a>1){const m=(a+b)>>1;if(T.t[m]<=t)a=m;else b=m;}return T.g[a];};
  for(let i=0;i+pi<nsel;i+=pi)for(let j=0;j<NF;j+=pj){const A=P(i,j),B=P(i,j+pj),C=P(i+pi,j+pj),D=P(i+pi,j),e1=[0,1,2].map(k=>B.d[k]-A.d[k]),e2=[0,1,2].map(k=>D.d[k]-A.d[k]);
   let n=[e1[1]*e2[2]-e1[2]*e2[1],e1[2]*e2[0]-e1[0]*e2[2],e1[0]*e2[1]-e1[1]*e2[0]];const l=Math.hypot(...n)||1;n=n.map(t=>t/l);const m=[0,1,2].map(k=>(A.d[k]+C.d[k])/2),ax=dot(m,E.eje),mr=[0,1,2].map(k=>m[k]-(ax>0?0:.7)*ax*E.eje[k]);if(dot(n,mr)<0)n=n.map(t=>-t);
   const nv=[dot(n,der),dot(n,arr),dot(n,hac)];if(nv[2]<=0)continue;const lu=Math.max(0,(nv[0]*luz[0]+nv[1]*luz[1]+nv[2]*luz[2])/ln),rho=frac(X.P.t[Math.min(nsel-1,i+1)]),f=X.P.f[(j+2)%NF],ox=Math.min(N-1,Math.max(0,Math.round((rho*Math.cos(f)+1)/2*N-.5))),oy=Math.min(N-1,Math.max(0,Math.round((rho*Math.sin(f)+1)/2*N-.5))),o=oy*N+ox;
   const c=r.zona&&r.zona[o]?[0,0,0]:rgb(X.A[o]).map(t=>t*(.55+.45*lu));caras.push([(A.z+B.z+C.z+D.z)/4,[A,B,C,D],c]);}
  {const p=[];let z=0;for(let j=0;j<NF;j+=pj){const A=P(0,j);p.push(A);z+=A.z;}const o=Math.round(N/2)*N+Math.round(N/2),c=r.zona&&r.zona[o]?[0,0,0]:rgb(X.A[o]).map(t=>t*.9);if(dot(E.eje,hac)>0)caras.push([z/p.length+.01,p,c]);}
  ctx.fillStyle='#000';ctx.fillRect(x0,y0,lado,lado);caras.sort((a,b)=>a[0]-b[0]);
  for(const [,p,c] of caras){ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);for(let k=1;k<p.length;k++)ctx.lineTo(p[k].x,p[k].y);ctx.closePath();ctx.fillStyle=`rgb(${c[0]|0},${c[1]|0},${c[2]|0})`;ctx.fill();}
  ctx.fillStyle='#ffee00';ctx.font='11px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';for(const [t,a,b] of [['ANT',.5,.13],['INF',.5,.95],['SEPT',.1,.5],['ÁPEX',.9,.6]])ctx.fillText(t,x0+a*lado,y0+b*lado);
 }
 function splash(r){
  const X=r.X,E=X.E,a=E.eje,u=E.u,v=E.v,na=a.map(t=>-t),vm=vmaxDe(q.vol),col=7,lado=64,semi=22,ctx=lienzo('qpsSplash',col*lado,4*lado+4*14);ctx.fillStyle='#000';ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.font='11px system-ui,sans-serif';ctx.textAlign='left';ctx.textBaseline='top';
  const fila=(y,titulo,n,f)=>{ctx.fillStyle='#00ff00';ctx.fillText(titulo,2,y+1);for(let k=0;k<n;k++){const [C,d,b]=f(k);corte(ctx,(k%col)*lado,y+14+Math.floor(k/col)*lado,lado,q.vol,C,d,b,semi,vm);}};
  const L=X.medidas.largo/q.sp,t0=E.a*.95,pos=(w,t)=>[0,1,2].map(c=>E.O[c]+w[c]*t);
  fila(0,'Eje corto, del ápex a la base',14,k=>[pos(a,t0-(k+.5)*L/14),u,v]);
  fila(2*lado+28,'Largo vertical, del septum a la pared lateral',7,k=>[pos(u,(k-3)*3),a,v]);
  fila(3*lado+42,'Largo horizontal, de la pared anterior a la inferior',7,k=>[pos(v,(k-3)*3),u,na]);
 }
 /* Pantallas finales del caso 7: lo que se ve con el eje y la receta actuales, dibujado en lienzos
    aparte (mapa polar, puntajes, cortes con bordes) y filas de cortes como las de la pantalla
    «Splash» del equipo: 28 ejes cortos del apex a la base, 14 largos verticales y 14 horizontales. */
 function instantanea(lado=84){
  const a=q.act,X=a.X,E=X.E,nuevo=()=>document.createElement('canvas'),P=nuevo(),M=nuevo(),C=nuevo();
  polar(P,a,360,a.porcentaje||a.valor);miniatura(M,a.puntajes,150);cortes(a,C);
  const u=E.u,v=E.v,ax=E.eje,na=ax.map(t=>-t),vm=vmaxDe(q.vol),semi=22,L=X.medidas.largo/q.sp,t0=E.a*1.1,pos=(w,t)=>[0,1,2].map(c=>E.O[c]+w[c]*t);
  const fila=(n,f)=>{const c=nuevo();c.width=n*lado;c.height=lado;const ctx=c.getContext('2d');for(let k=0;k<n;k++){const [Cc,d,b]=f(k);corte(ctx,k*lado,0,lado,q.vol,Cc,d,b,semi,vm);}return c;};
  const filas={corto:fila(28,k=>[pos(ax,t0-(k+.5)*L/23),u,v]),vertical:fila(14,k=>[pos(u,k-6.5),ax,v]),horizontal:fila(14,k=>[pos(v,k-6.5),u,na])};
  return {act:a,obj:q.obj,receta:{...q.receta},polar:P,puntajes:M,cortes:C,filas,N};
 }
 function tabla(){
  const a=q.act,r=q.ref,o=q.obj,f=[['Volumen','volumen',0,'ml'],['Pared','pared',0,'ml'],['Cuentas','cuentas',0,'mil'],['Defecto','defecto',0,'ml'],['Extensión','extension',0,'%'],['TPD','tpd',0,'%'],['Forma (SI)','forma',2,''],['Excentricidad','excentricidad',2,'']];
  const t=$('qpsTabla');t.replaceChildren();const cab=t.insertRow();(oculto()?['Medida','Tu resultado']:['Medida',q.caso7?'Tu resultado':'Ahora',q.caso7?'Equipo':'Referencia','Cambio']).forEach(x=>{const c=document.createElement('th');c.textContent=x;cab.append(c);});
  for(const [n,k,d,un] of f){if(a[k]===undefined)continue;const fila=t.insertRow(),dif=a[k]-r[k],cam=Math.abs(dif)<.5*10**-d?'—':(dif>0?'+':'−')+dec(Math.abs(dif),d);
   (oculto()?[n,`${dec(a[k],d)}${un?' '+un:''}`]:[n,`${dec(a[k],d)}${un?' '+un:''}`,`${dec(r[k],d)}${un?' '+un:''}`,cam]).forEach((x,i)=>{const c=fila.insertCell();c.textContent=x;if(i===3&&cam!=='—')c.className='cambia';});}
  if(a.sss!==undefined){const fila=t.insertRow(),d=a.sss-r.sss;(oculto()?['Suma de puntajes (SSS)',String(a.sss)]:['Suma de puntajes (SSS)',String(a.sss),String(r.sss),d?(d>0?'+':'−')+Math.abs(d):'—']).forEach((x,i)=>{const c=fila.insertCell();c.textContent=x;if(i===3&&d)c.className='cambia';});
   const f2=t.insertRow(),p=x=>Math.round(x/68*100);(oculto()?['SS%',p(a.sss)+' %']:['SS%',p(a.sss)+' %',p(r.sss)+' %',p(a.sss)-p(r.sss)?String(p(a.sss)-p(r.sss)):'—']).forEach(x=>f2.insertCell().textContent=x);}
  const s=$('qpsSegmentos');s.replaceChildren();const c2=s.insertRow();(oculto()?['Segmento','Valor',...(a.porcentaje?['% anormal','Puntaje']:[])]:['Segmento','Valor','Ref.',...(a.porcentaje?['% anormal','Ref.','Puntaje','Ref.']:[])]).forEach(x=>{const c=document.createElement('th');c.textContent=x;c2.append(c);});
  for(let k=1;k<=17;k++){const fila=s.insertRow();if(oculto()){const v=[Q.NOMBRES[k-1],dec(a.valor[k])];if(a.porcentaje)v.push(dec(a.porcentaje[k]),String(a.puntajes[k]));v.forEach(x=>fila.insertCell().textContent=x);continue;}const v=[Q.NOMBRES[k-1],dec(a.valor[k]),dec(r.valor[k])];if(a.porcentaje)v.push(dec(a.porcentaje[k]),dec(r.porcentaje[k]),String(a.puntajes[k]),String(r.puntajes[k]));
   v.forEach((x,i)=>{const c=fila.insertCell();c.textContent=x;if((i===1&&Math.abs(a.valor[k]-r.valor[k])>=3)||(i===3&&Math.abs(a.porcentaje[k]-r.porcentaje[k])>=5)||(i===5&&a.puntajes[k]!==r.puntajes[k]))c.className='cambia';});}
 }
 function pintar(){
  const a=q.act,X=a.X,E=X.E,ang=CardiacoCore.angulosDe(E.eje[0],E.eje[1],E.eje[2]),a0=CardiacoCore.angulosDe(q.marco.a[0],q.marco.a[1],q.marco.a[2]);
  // En el caso 7 los deslizadores muestran el angulo del eje (el del estudiante mas el giro); fuera
  // del caso 7, el giro desde el eje del equipo.
  if(q.caso7){const m=ejeActual(),am=CardiacoCore.angulosDe(m.a[0],m.a[1],m.a[2]);$('qpsAzTexto').textContent=`${Math.round(am.azimut)}°`;$('qpsElTexto').textContent=`${Math.round(am.elevacion)}°`;}
  else{$('qpsAzTexto').textContent=`${q.dAz>0?'+':''}${q.dAz}°`;$('qpsElTexto').textContent=`${q.dEl>0?'+':''}${q.dEl}°`;}
  const eq=q.marcoEquipo?CardiacoCore.angulosDe(q.marcoEquipo.a[0],q.marcoEquipo.a[1],q.marcoEquipo.a[2]):a0;
  $('qpsEje').textContent=oculto()?`Tu eje: azimut ${dec(ang.azimut,1)}°, elevación ${dec(ang.elevacion,1)}°${q.dAz||q.dEl?` (girado ${q.dAz>0?'+':''}${q.dAz}° y ${q.dEl>0?'+':''}${q.dEl}° desde el que dejaste en la reorientación)`:', el que dejaste en la reorientación'}. Los deslizadores lo giran desde ahí, hasta 25° a cada lado.`:`Eje actual: azimut ${dec(ang.azimut,1)}°, elevación ${dec(ang.elevacion,1)}°. Eje del equipo: ${dec(eq.azimut,1)}° y ${dec(eq.elevacion,1)}°.`;
  $('qpsPolarRef').closest('figure').hidden=oculto();$('qpsPuntajesRef').closest('figure').hidden=oculto();$('qpsRevelar').hidden=!q.caso7;$('volverQps').textContent=q.caso7?'← Volver a las pantallas finales':'← Volver al control de calidad';$('qpsRevelar').textContent=q.revelar?'Ocultar el resultado del equipo':'Ver el resultado del equipo';$('qpsReferencia').textContent=q.caso7?'Volver a tu eje y a la receta del equipo':'Volver al eje y a la receta del equipo';
  $('qpsRecetaTexto').textContent=`Reconstrucción en pantalla: ${textoReceta(q.receta)}${mismaReceta(q.receta,q.recetaEquipo)?' (la del equipo)':''}.`;
  $('qpsPendiente').hidden=mismaReceta(leerReceta(),q.receta);
  ejes(a);vivo(a);guardadas();
  tabla();polar('qpsPolar',a,300,a.porcentaje||a.valor);polar('qpsPolarRef',q.ref,300,q.ref.porcentaje||q.ref.valor);
  $('qps').classList.toggle('revelado',q.caso7&&!oculto());
  $('qpsPolarTitulo').textContent=q.caso7?(a.porcentaje?`Tu mapa · extensión (%)`:'Tu mapa · valor medio'):a.porcentaje?'Ahora · extensión (%)':'Ahora · valor medio';{const f=$('qpsPuntajes').closest('figure').querySelector('figcaption'),g=$('qpsPuntajesRef').closest('figure').querySelector('figcaption');f.textContent=q.caso7?'Tus puntajes':'Ahora';g.textContent=q.caso7?'Puntajes del equipo':'Referencia';}
  $('qpsPolarRefTitulo').textContent=q.caso7?(q.obj&&q.obj.imagen?'Tu reconstrucción con el eje del equipo':'Equipo · su eje sobre tu reconstrucción'):a.porcentaje?'Referencia · extensión (%)':'Referencia · valor medio';
  miniatura('qpsPuntajes',a.puntajes,150);miniatura('qpsPuntajesRef',q.ref.puntajes,150);$('qpsPuntajesCaja').hidden=!a.puntajes;
  cortes(a);splash(a);
  const o=q.obj,estadoTxt=o&&o.estado?` Estado que informó el equipo: «${o.estado}».`:'';
  $('qpsNota').textContent=o?`${o.informe} Serie del equipo: ${o.serie.trim()}, base de normales ${o.normales}.${estadoTxt} El límite normal y los puntajes son de este paciente y valen para la receta y el eje del equipo: si cambias la receta, la extensión cambia aunque la perfusión sea la misma. `+(o.zonaPropia?`La zona bajo el límite de referencia es la que dibujó el equipo en su mapa polar ${q.tipo==='noac'?'sin':'con'} atenuación; al pulsar «Ver el resultado del equipo» aparece su mapa.`:`El equipo no guardó su mapa polar ${q.tipo==='noac'?'sin':'con'} atenuación: la zona de referencia ${o.zonaSinAtenuacion?`parte de la que dibujó ${o.previaDe||'sin atenuación'}, que es la misma anatomía, y `:''}se extiende dentro de los segmentos que el equipo puntuó hasta su ${o.extension} %.`)+(o.aviso?' En este estudio el equipo marcó una falla de máscara: lee el aviso de arriba.':''):'Este examen no es el caso de referencia: no hay datos del equipo para calibrar. Se muestran las medidas directas, sin extensión, TPD ni puntajes.';
  // Falla de mascara del equipo: aviso siempre visible, con su explicacion.
  const av=$('qpsAviso');if(av){av.hidden=!(q.caso7&&o&&o.aviso);if(!av.hidden)$('qpsAvisoTexto').innerHTML=`<b>El equipo marcó «${o.aviso}» en este estudio.</b> Su máscara del ventrículo se equivocó: informó ${o.volumen} ml de volumen y ${o.pared} ml de pared, cuando el mismo reposo sin atenuación da 52 ml y 128 ml. La causa es la actividad intestinal pegada a la cara inferior del corazón. La referencia de esta sección reproduce ese resultado fallido, así que tu resultado con atenuación en reposo también sale inflado. Compáralo con el reposo sin atenuación.`;}
  const fe=$('qpsPolarEquipo');if(fe){const ver=q.caso7&&!oculto()&&o&&o.imagen;fe.hidden=!ver;if(ver){const im=fe.querySelector('img');if(im.getAttribute('src')!==o.imagen)im.src=o.imagen;$('qpsPolarEquipoTitulo').textContent=`Mapa polar que guardó el equipo · ${o.serie.trim()}`;}}
 }
 /* Los ejes a la vista mientras se mueven: corte transversal (se ve el azimut) y plano vertical que
    contiene el eje del equipo (se ve la elevacion). Celeste, el eje actual con un punto en el apex;
    blanco, el del equipo; amarillo, el centro. */
 function ejes(r){
  const E=r.X.E,m=q.marco,C=q.R0.E.O,lado=132,semi=24,vm=vmaxDe(q.vol),k=lado/(2*semi),L=.8*E.a,dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const h=Math.hypot(m.a[0],m.a[1])||1,hor=[m.a[0]/h,m.a[1]/h,0],planos=[['qpsEjeAxial',[1,0,0],[0,1,0]],['qpsEjeVertical',hor,[0,0,-1]]];
  for(const [id,der,aba] of planos){
   const ctx=lienzo(id,lado,lado);corte(ctx,0,0,lado,q.vol,C,der,aba,semi,vm);
   const linea=(e,O,col,ancho,punto)=>{const o=[0,1,2].map(i=>O[i]-C[i]),x=(dot(o,der)+semi)*k,y=(dot(o,aba)+semi)*k,dx=dot(e,der)*L*k,dy=dot(e,aba)*L*k;ctx.strokeStyle=col;ctx.lineWidth=ancho;ctx.beginPath();ctx.moveTo(x-dx,y-dy);ctx.lineTo(x+dx,y+dy);ctx.stroke();if(punto){ctx.fillStyle=col;ctx.beginPath();ctx.arc(x+dx,y+dy,4,0,2*Math.PI);ctx.fill();}return [x,y];};
   if(!oculto()){ctx.setLineDash([5,4]);linea((q.marcoEquipo||m).a,q.R0.E.O,'rgba(255,255,255,.9)',2,false);ctx.setLineDash([]);}
   const c=linea(E.eje,E.O,'#4dd0e1',2.5,true);ctx.fillStyle='#ffee58';ctx.beginPath();ctx.arc(c[0],c[1],3.5,0,2*Math.PI);ctx.fill();
  }
 }
 // Eje corto, largo vertical y largo horizontal por el centro, con los bordes de la pared.
 function vivo(r){
  const X=r.X,E=X.E,a=E.eje,u=E.u,v=E.v,na=a.map(t=>-t),vm=vmaxDe(q.vol),lado=104,semi=22;
  for(const [id,der,aba,nor] of [['qpsVivoCorto',u,v,a],['qpsVivoVla',a,v,u],['qpsVivoHla',u,na,v]]){
   const ctx=lienzo(id,lado,lado);corte(ctx,0,0,lado,q.vol,E.O,der,aba,semi,vm);
   contorno(ctx,0,0,lado,X.Se,X.nsel,E.O,der,aba,nor,semi,'#ffe63c');contorno(ctx,0,0,lado,X.Sp,X.nsel,E.O,der,aba,nor,semi,'#ffa028');
   if(nor!==a){contorno(ctx,0,0,lado,X.Se,X.nsel,E.O,der,aba,nor,semi,'#fff',true);contorno(ctx,0,0,lado,X.Sp,X.nsel,E.O,der,aba,nor,semi,'#fff',true);}
  }
 }
 function guardadas(){
  const caja=$('qpsGuardadas');caja.replaceChildren();
  const boton=(texto,r,activa)=>{const b=document.createElement('button');b.type='button';b.className='mini'+(activa?' activa':'');b.textContent=texto;b.addEventListener('click',()=>{if(q.ocupado)return;if(mismaReceta(r,q.recetaEquipo)){q.vol=q.volRef;q.receta={...q.recetaEquipo};}else{const g=q.guardadas.get(claveReceta(r));if(!g)return;q.vol=g.vol;q.receta={...r};}controles();calcular();});caja.append(b);};
  boton('Equipo · '+textoCorto(q.recetaEquipo),q.recetaEquipo,mismaReceta(q.receta,q.recetaEquipo));
  for(const g of q.guardadas.values())boton(textoCorto(g.receta),g.receta,mismaReceta(q.receta,g.receta));
  $('qpsGuardadasTexto').textContent=`Reconstrucciones guardadas en este dispositivo: ${q.guardadas.size+1}. Tocar una la muestra sin reconstruir.${q.deMemoria?' La de referencia se recuperó de lo guardado.':''}`;
 }
 const textoCorto=r=>`${r.it}×${r.sub}, ${r.fwhm>0?dec(r.fwhm,1)+' mm':'sin filtro'}${r.ac?', AC':''}${r.dispersion?', disp.':''}`;
 function iniciar(){
  $('qpsBorrar').addEventListener('click',borrarGuardadas);
  $('qpsRevelar').addEventListener('click',()=>{q.revelar=!q.revelar;pintar();});
  $('qpsVerImagenes').addEventListener('click',e=>{const c=document.querySelector('#qps .controles.fijo'),o=c.classList.toggle('sinImagenes');e.target.textContent=o?'Mostrar imágenes':'Ocultar imágenes';e.target.setAttribute('aria-pressed',String(o));});
  let t=null;const vivo=()=>{clearTimeout(t);t=setTimeout(calcular,60);};
  $('qpsAz').addEventListener('input',e=>{q.dAz=+e.target.value;$('qpsAzTexto').textContent=`${q.dAz>0?'+':''}${q.dAz}°`;vivo();});
  $('qpsEl').addEventListener('input',e=>{q.dEl=+e.target.value;$('qpsElTexto').textContent=`${q.dEl>0?'+':''}${q.dEl}°`;vivo();});
  for(const [id,campo,d] of [['qpsAzMenos','dAz',-1],['qpsAzMas','dAz',1],['qpsElMenos','dEl',-1],['qpsElMas','dEl',1]])$(id).addEventListener('click',()=>{const el=$(campo==='dAz'?'qpsAz':'qpsEl');q[campo]=Math.max(+el.min,Math.min(+el.max,q[campo]+d));el.value=q[campo];vivo();});
  for(const id of ['qpsIter','qpsSub','qpsFwhm','qpsAC','qpsDisp'])$(id).addEventListener('input',()=>{if(q.listo)$('qpsPendiente').hidden=mismaReceta(leerReceta(),q.receta);});
  $('qpsReconstruir').addEventListener('click',reconstruir);$('qpsReferencia').addEventListener('click',aReferencia);
  $('qpsRecetaEquipo').addEventListener('click',()=>{if(!q.listo)return;const r=q.recetaEquipo;$('qpsIter').value=r.it;$('qpsSub').value=String(r.sub);$('qpsFwhm').value=r.fwhm;$('qpsAC').checked=!!r.ac;$('qpsDisp').checked=!!r.dispersion;$('qpsPendiente').hidden=mismaReceta(leerReceta(),q.receta);});
 }
 function olvidar(){q.listo=false;q.vol=q.volRef=null;q.R0=null;q.act=q.ref=null;q.L=null;}
 return {instantanea,iniciar,abrir,abrirCaso7,exportarConstantes,guardarReferencia,calcular,reconstruir,aReferencia,olvidar,leerReferencia,borrarGuardadas,estado:q};
})();
window.Qps=Qps;
