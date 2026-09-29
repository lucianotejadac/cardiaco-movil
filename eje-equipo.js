/* Eje del equipo (provisional, para examenes cargados por carpeta): usa una reconstruccion en eje
   corto hecha por el equipo como referencia dentro de la reorientacion.
   - Lee de su DICOM la grilla (posicion, orientacion de filas y columnas, voxel) y la receta
     (ConvolutionKernel: «3DOSEM,6i,4s» y «Gauss,9,00mm»; CorrectedImage: ATTN, SCAT).
   - Reconstruye con el motor del simulador con esa misma receta: iteraciones, subconjuntos,
     gaussiano final, atenuacion con el CT registrado y dispersion por doble ventana.
   - Lleva la reconstruccion del equipo a la grilla del simulador (x izquierda, y posterior, z
     hacia la cabeza), de modo que las dos se cortan con el mismo centro, el mismo marco y el
     mismo zoom.
   - Enmascara el simulador con la mascara del equipo (el equipo deja en cero lo que esta fuera
     del corazon) y lo lleva a la escala de valores del equipo: misma suma dentro de la mascara.
   Lo que el simulador no hace igual: su OSEM es por cortes (2D), sin recuperacion de resolucion;
   la del equipo es 3D. La dispersion usa doble ventana con k = 0,5; no se sabe cual usa el equipo. */
'use strict';
const EjeEquipo=(()=>{
 const C=CardiacoCore;
 const K_DISPERSION=.5,FWHM_DISPERSION=10;
 const e={dispersion:true,manual:false,tipo:'ac',series:[],leidas:null,resultado:null,clave:'',tarea:null,rechazo:null,ocupado:false,detenido:false};
 const cruz=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const punto=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];

 function configurar(series){cancelar();e.series=Array.isArray(series)?series:[];e.leidas=null;e.resultado=null;e.clave='';e.manual=false;}
 const disponible=()=>e.series.length>0;

 // Una serie reconstruida: grilla y receta. Devuelve null si no es un eje corto (cortes oblicuos).
 async function leer(bytes){
  const v=await C.leerVolumen(new File([bytes],'serie.dcm'));if(v.slots!==1)return null;
  const d=dicomParser.parseDicom(new Uint8Array(bytes)),det=d.elements.x00540022?.items?.[0]?.dataSet;
  const iop=(det?.string('x00200037')||d.string('x00200037')||'').split('\\').map(Number);if(iop.length!==6||iop.some(q=>!Number.isFinite(q)))return null;
  const r=iop.slice(0,3),c=iop.slice(3,6),n=cruz(r,c);
  if(Math.abs(n[2])>.9||!v.posicion)return null; // transversal: no sirve como eje
  const nucleo=(d.string('x00181210')||''),corr=(d.string('x00280051')||'').toUpperCase();
  const mo=/OSEM,\s*(\d+)i,\s*(\d+)s/i.exec(nucleo),mg=/Gauss,\s*(\d+)(?:[.,](\d+))?\s*mm/i.exec(nucleo);
  if(!mo)return null; // no es una OSEM: no hay receta que repetir
  let max=0;for(let i=0;i<v.data[0].length;i++)if(v.data[0][i]>max)max=v.data[0][i];
  return {W:v.n,H:v.n,K:v.nz,sp:v.spacing,dz:v.dz,pos:v.posicion,r,c,n,vol:v.data[0],max:max||1,descripcion:v.descripcion,marco:v.frame,
   receta:{it:+mo[1],sub:+mo[2],fwhm:mg?Number(mg[1]+'.'+(mg[2]||'0')):0,ac:/ATTN/.test(corr),dispersion:/SCAT/.test(corr)}};
 }
 async function series(marco){
  if(!e.leidas){e.leidas=[];for(const b of e.series){try{const q=await leer(b);if(q)e.leidas.push(q);}catch(err){console.warn('Serie del equipo no legible',err);}}}
  return e.leidas.filter(q=>!marco||q.marco===marco);
 }

 function osem(s,settings,mu,filas,avance){
  return new Promise((ok,mal)=>{
   const codigo=[createModel.toString(),sampleGrid.toString(),attenuationWeights.toString(),gaussianKernel95.toString(),scatterBlur95.toString(),createPsfView95.toString(),'('+osem95Worker.toString()+')()'].join('\n');
   const t=createOsem95Pool(codigo);e.tarea=t;e.rechazo=mal;
   t.onerror=err=>{t.terminate();mal(Error(err.message||'Error del cálculo.'));};
   t.onmessage=({data:q})=>{if(q.error){t.terminate();mal(Error(q.error));return;}if(q.progress){let f=q.total?q.completed/q.total:0;const m=String(q.progress).match(/corte (\d+)\/(\d+), vista (\d+)\/(\d+)/);if(m)f=Math.max(f,(m[1]-1+m[3]/m[4])/m[2]);avance(f);return;}if(q.volume){t.terminate();e.tarea=null;e.rechazo=null;ok(q.volume);}};
   t.postMessage({n:s.n,data:s.data,views:s.views,spacing:s.spacing,window:1,scatterWindow:2,settings,mu,fbp:null,outsideAir:true,previewRow:Math.round((filas[0]+filas[1])/2),previewRadius:Math.ceil((filas[1]-filas[0])/2)});
  });
 }
 function cancelar(){if(e.ocupado)e.detenido=true;if(e.tarea){e.tarea.terminate();e.tarea=null;}if(e.rechazo){e.rechazo(Error('detenida'));e.rechazo=null;}}

 // Voxel del simulador (z hacia la cabeza) -> paciente, y paciente -> indices de la grilla del equipo.
 const aPaciente=(s,x,y,z)=>{const c=(s.n-1)/2;return [s.origin[0]+(x-c)*s.spacing,s.origin[1]+(y-c)*s.spacing,s.z0-(s.n-1-z)*s.spacing];};
 const aVoxel=(s,P)=>{const c=(s.n-1)/2;return [(P[0]-s.origin[0])/s.spacing+c,(P[1]-s.origin[1])/s.spacing+c,s.n-1-(s.z0-P[2])/s.spacing];};
 function filasDe(D,s,margen){
  let zmin=Infinity,zmax=-Infinity;for(const i of [0,D.W-1])for(const j of [0,D.H-1])for(const k of [0,D.K-1]){const Z=D.pos[2]+i*D.sp*D.r[2]+j*D.sp*D.c[2]+k*D.dz*D.n[2];zmin=Math.min(zmin,Z);zmax=Math.max(zmax,Z);}
  return [Math.max(0,Math.floor((s.z0-zmax)/s.spacing)-margen),Math.min(s.n-1,Math.ceil((s.z0-zmin)/s.spacing)+margen)];
 }
 // La reconstruccion del equipo en la grilla del simulador (trilineal) y su mascara (vecino mas
 // cercano: dentro solo donde el equipo tiene dato).
 function equipoEnGrilla(D,s){
  const n=s.n,p=n*n,vol=new Float32Array(n*p),mascara=new Uint8Array(n*p),at=(i,j,k)=>D.vol[(k*D.H+j)*D.W+i];
  for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){
   const P=aPaciente(s,x,y,z),d=[P[0]-D.pos[0],P[1]-D.pos[1],P[2]-D.pos[2]],i=punto(d,D.r)/D.sp,j=punto(d,D.c)/D.sp,k=punto(d,D.n)/D.dz;
   if(i<0||j<0||k<0||i>D.W-1||j>D.H-1||k>D.K-1)continue;
   if(!(at(Math.round(i),Math.round(j),Math.round(k))>0))continue;
   const i0=Math.min(D.W-2,Math.floor(i)),j0=Math.min(D.H-2,Math.floor(j)),k0=Math.min(D.K-2,Math.floor(k)),fi=i-i0,fj=j-j0,fk=k-k0;
   const c00=at(i0,j0,k0)*(1-fi)+at(i0+1,j0,k0)*fi,c10=at(i0,j0+1,k0)*(1-fi)+at(i0+1,j0+1,k0)*fi,c01=at(i0,j0,k0+1)*(1-fi)+at(i0+1,j0,k0+1)*fi,c11=at(i0,j0+1,k0+1)*(1-fi)+at(i0+1,j0+1,k0+1)*fi;
   const o=z*p+y*n+x;vol[o]=(c00*(1-fj)+c10*fj)*(1-fk)+(c01*(1-fj)+c11*fj)*fk;mascara[o]=1;
  }
  return {vol,mascara};
 }

 /* Lo comun a los dos usos: lleva la reconstruccion del equipo a la grilla del simulador,
    enmascara el volumen del simulador (sim, z hacia la cabeza; se modifica), iguala la escala de
    valores y devuelve centro, marco y medidas de parecido. */
 function alinear(D,s,sim){
  const n=s.n,p=n*n,R=D.receta,G=equipoEnGrilla(D,s);
  // Mascara del equipo y misma escala de valores: misma suma dentro de la mascara.
  let se=0,ss=0,nm=0,cx=0,cy=0,cz=0;
  for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){const o=z*p+y*n+x;if(!G.mascara[o]){sim[o]=0;continue;}se+=G.vol[o];ss+=Math.max(0,sim[o]);nm++;cx+=x;cy+=y;cz+=z;}
  if(!nm)throw Error('La imagen del equipo queda fuera de la matriz del simulador: no parece del mismo estudio.');
  if(!(ss>0))throw Error('La reconstrucción del simulador no tiene datos en la zona que cubre la imagen del equipo.');
  const factor=se/ss;for(let o=0;o<sim.length;o++)sim[o]=G.mascara[o]?Math.max(0,sim[o])*factor:0;
  // Marco exacto del equipo: a hacia el apex (anterior, izquierda, abajo), v = columnas, u = a x v.
  let a=D.n.slice();if(punto(a,[.5,-.7,-.3])<0)a=a.map(q=>-q);const v=D.c.slice(),u=cruz(a,v),centro=[cx/nm,cy/nm,cz/nm];
  let tmin=0,tmax=0;for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(G.mascara[z*p+y*n+x]){const t=(x-centro[0])*a[0]+(y-centro[1])*a[1]+(z-centro[2])*a[2];if(t<tmin)tmin=t;if(t>tmax)tmax=t;}
  // Parecido dentro de la region con actividad del equipo (sobre el 10 % de su maximo).
  let max=0;for(let o=0;o<G.vol.length;o++)if(G.vol[o]>max)max=G.vol[o];
  let sa=0,sb=0,k=0;for(let o=0;o<sim.length;o++)if(G.vol[o]>.1*max){sa+=G.vol[o];sb+=sim[o];k++;}
  const ma=sa/k,mb=sb/k;let sab=0,saa=0,sbb=0,dif=0;for(let o=0;o<sim.length;o++)if(G.vol[o]>.1*max){const x=G.vol[o]-ma,y=sim[o]-mb;sab+=x*y;saa+=x*x;sbb+=y*y;dif+=Math.abs(G.vol[o]-sim[o]);}
  const ang=C.angulosDe(a[0],a[1],a[2]);
  const recetaEquipo=`OSEM 3D ${R.it} × ${R.sub}${R.ac?' con atenuación':' sin atenuación'}${R.dispersion?' y dispersión':''}${R.fwhm?`, gaussiano ${String(R.fwhm).replace('.',',')} mm`:''}`;
  return {sim,equipo:G.vol,max,centro,largo:Math.max(12,Math.round(2*Math.min(-tmin,tmax))),marco:{a,u,v},azimut:ang.azimut,elevacion:ang.elevacion,factor,voxeles:nm,
   correlacion:sab/Math.sqrt(saa*sbb||1),diferencia:100*dif/(sa||1),descripcion:D.descripcion,receta:R,recetaEquipo,
   entrada:{tipo:'osem',zArriba:true,data:sim,etiqueta:''}};
 }
 // Elige la serie del equipo: la ultima cargada a mano si la hay; si no, de preferencia la que
 // tiene atenuacion cuando hay CT.
 async function elegir(s,hayCt){
  const lista=await series(s.frame);
  if(!lista.length){const otras=await series(null);throw Error(otras.length?'La imagen del equipo no comparte marco de referencia con estas proyecciones: es de otro estudio o de otra fase (estrés o reposo).':'No hay una imagen del equipo en eje corto reconstruida con OSEM. Cárgala con «Cargar imagen del equipo».');}
  const conAc=e.tipo==='ac',del=lista.filter(q=>q.receta.ac===conAc);
  if(!del.length)throw Error(`No hay una imagen del equipo ${conAc?'con':'sin'} corrección de atenuación para estas proyecciones. Las que hay: ${lista.map(q=>'«'+q.descripcion+'»').join(', ')}. Cambia el selector o carga esa imagen.`);
  const m=del.filter(q=>q.manual);return m.length?m[m.length-1]:del[0];
 }
 function fijarTipo(t){e.tipo=t==='noac'?'noac':'ac';}
 // Carga a mano una imagen del equipo (bytes de un DICOM). Devuelve su descripcion.
 async function agregar(bytes){
  const q=await leer(bytes);if(!q)throw Error('Ese archivo no es un eje corto reconstruido con OSEM por el equipo (medicina nuclear, cortes oblicuos, no gatillado).');
  q.manual=true;await series(null);e.leidas.push(q);e.series.push(bytes);e.manual=true;e.tipo=q.receta.ac?'ac':'noac';e.resultado=null;e.clave='';return q;
 }
 /* Compara la imagen del equipo con una reconstruccion que el simulador ya hizo (volumen con z
    hacia la cabeza), sin reconstruir de nuevo. */
 async function comparar({s,volumen,etiqueta}){
  const D=await elegir(s,true),sim=Float32Array.from(volumen),r={...alinear(D,s,sim),modo:'propia',nombre:etiqueta,dispersion:false,segundos:0};
  r.entrada.etiqueta=`${etiqueta} · frente al equipo`;return r;
 }

 /* s: proyecciones (Lab95.spect). reg: estado del registro (ct preparado y desplazamiento).
    Devuelve lo que necesita la reorientacion, o lanza un Error con el motivo. */
 async function ejecutar({s,reg,fuente}){
  if(e.ocupado)return null;
  const hayCt=!!(reg&&reg.ct);
  const D=await elegir(s,hayCt),R=D.receta;
  if(R.ac&&!hayCt)throw Error('El eje corto del equipo tiene corrección de atenuación y no hay CT cargado para repetirla.');
  if(s.views.filter(v=>v.window===1).length%R.sub)throw Error(`El equipo usó ${R.sub} subconjuntos y el número de vistas no es divisible.`);
  const clave=[D.descripcion,e.series.length,s.frame,s.data.length,fuente,hayCt?reg.off.join(','):'',e.dispersion].join('|');
  if(e.resultado&&e.clave===clave)return e.resultado;
  const hayVentana=s.views.some(v=>v.window===2),disp=R.dispersion&&hayVentana&&e.dispersion,w=s.windows||[];
  const escalaVentana=disp&&w[0]&&w[1]&&w[1].high>w[1].low?(w[0].high-w[0].low)/(w[1].high-w[1].low):1;
  const nombre=`OSEM ${R.it} × ${R.sub}${R.ac?' con atenuación':''}${disp?' y dispersión':''}${R.fwhm?`, gaussiano ${String(R.fwhm).replace('.',',')} mm`:''}`;
  e.ocupado=true;e.detenido=false;const t0=performance.now(),pausa=()=>new Promise(q=>setTimeout(q,0));
  Progreso.abrir(`Receta del equipo: ${nombre}`,cancelar,R.ac?'La atenuación de cada vista es la parte lenta: puede tardar minutos en la tablet.':'');
  try{
   const n=s.n,p=n*n,filas=filasDe(D,s,Math.max(6,Math.ceil(R.fwhm/s.spacing)+2));let mu=null;
   if(R.ac){
    Progreso.avance(0,'Mapa μ desde el CT registrado…');await pausa();mu=new Float32Array(n*p).fill(NaN);
    for(let z=filas[0];z<=filas[1];z++){for(let y=0;y<n;y++)for(let x=0;x<n;x++){const hu=Lab95.sampleCT(reg.ct,Lab95.point(s,x,y,z,reg.off||[0,0,0]));if(!Number.isFinite(hu))continue;const h=Math.max(-1000,Math.min(3000,hu));mu[z*p+y*n+x]=h<=0?.15*(1+h/1000):.15+.0001*h;}if(z%8===0){await pausa();if(e.detenido)throw Error('detenida');}}
   }
   const settings={scatter:disp,scatterSmoothing:disp,scatterFwhm:disp?FWHM_DISPERSION:0,scatterWeight:disp?K_DISPERSION:0,scatterWindowScale:disp?escalaVentana:0,resolutionRecovery:false,distanceDependent:false,axialRecovery:false,initialization:'uniform',iterations:R.it,subsets:R.sub,attenuationCorrection:!!mu,postFilter:false,postFilterFWHMmm:0};
   let vol=await osem(s,settings,mu,filas,f=>Progreso.avance(.05+f*.8,`${mu?'Atenuación y ':''}OSEM ${Math.round(f*100)} %`));
   if(R.fwhm){Progreso.avance(.87,'Gaussiano final…');vol=await Lab95.gaussian3D(vol,n,R.fwhm/s.spacing/2.354820045,()=>e.detenido);if(!vol)throw Error('detenida');}
   const sim=new Float32Array(n*p);for(let z=0;z<n;z++)sim.set(vol.subarray((n-1-z)*p,(n-z)*p),z*p); // z hacia la cabeza
   Progreso.avance(.92,'Misma grilla, máscara y escala de valores…');await pausa();
   const completa=Float32Array.from(sim);
   e.clave=clave;e.resultado={...alinear(D,s,sim),modo:'receta',nombre,dispersion:disp,segundos:(performance.now()-t0)/1000};
   // la misma reconstruccion sin la mascara del equipo, en la misma escala (la usa el caso 7)
   for(let o=0;o<completa.length;o++)completa[o]=Math.max(0,completa[o])*e.resultado.factor;e.resultado.completa=completa;
   e.resultado.entrada.etiqueta=`receta del equipo · ${nombre}`;
   return e.resultado;
  }finally{e.ocupado=false;e.tarea=null;e.rechazo=null;Progreso.cerrar();}
 }
 /* Reconstruye con una receta cualquiera y deja el volumen como el de referencia: z hacia la
    cabeza, con la mascara del equipo y multiplicado por el factor de escala de la referencia
    (asi las cuentas cambian con la receta y no se vuelven a igualar). */
 let grilla=null;
 async function reconstruirCon({s,reg,receta:R,factor}){
  if(e.ocupado)return null;
  const D=await elegir(s,true),hayCt=!!(reg&&reg.ct);
  if(R.ac&&!hayCt)throw Error('No hay CT cargado para corregir la atenuación.');
  const hayVentana=s.views.some(v=>v.window===2),disp=R.dispersion&&hayVentana,w=s.windows||[],escalaVentana=disp&&w[0]&&w[1]&&w[1].high>w[1].low?(w[0].high-w[0].low)/(w[1].high-w[1].low):1;
  const nombre=`OSEM ${R.it} × ${R.sub}${R.ac?' con atenuación':''}${disp?' y dispersión':''}${R.fwhm>0?`, gaussiano ${String(R.fwhm).replace('.',',')} mm`:', sin filtro'}`;
  e.ocupado=true;e.detenido=false;const t0=performance.now(),pausa=()=>new Promise(q=>setTimeout(q,0));
  Progreso.abrir(`Reconstruyendo: ${nombre}`,cancelar,R.ac?'La atenuación de cada vista es la parte lenta: puede tardar minutos en la tablet.':'');
  try{
   const n=s.n,p=n*n,filas=filasDe(D,s,Math.max(6,Math.ceil(R.fwhm/s.spacing)+2));let mu=null;
   if(R.ac){
    Progreso.avance(0,'Mapa μ desde el CT…');await pausa();mu=new Float32Array(n*p).fill(NaN);
    for(let z=filas[0];z<=filas[1];z++){for(let y=0;y<n;y++)for(let x=0;x<n;x++){const hu=Lab95.sampleCT(reg.ct,Lab95.point(s,x,y,z,reg.off||[0,0,0]));if(!Number.isFinite(hu))continue;const h=Math.max(-1000,Math.min(3000,hu));mu[z*p+y*n+x]=h<=0?.15*(1+h/1000):.15+.0001*h;}if(z%8===0){await pausa();if(e.detenido)throw Error('detenida');}}
   }
   const settings={scatter:disp,scatterSmoothing:disp,scatterFwhm:disp?FWHM_DISPERSION:0,scatterWeight:disp?K_DISPERSION:0,scatterWindowScale:disp?escalaVentana:0,resolutionRecovery:false,distanceDependent:false,axialRecovery:false,initialization:'uniform',iterations:R.it,subsets:R.sub,attenuationCorrection:!!mu,postFilter:false,postFilterFWHMmm:0};
   let vol=await osem(s,settings,mu,filas,f=>Progreso.avance(.05+f*.8,`${mu?'Atenuación y ':''}OSEM ${Math.round(f*100)} %`));
   if(R.fwhm>0){Progreso.avance(.87,'Gaussiano final…');vol=await Lab95.gaussian3D(vol,n,R.fwhm/s.spacing/2.354820045,()=>e.detenido);if(!vol)throw Error('detenida');}
   Progreso.avance(.93,'Máscara y escala de la referencia…');await pausa();
   if(!grilla||grilla.D!==D||grilla.s!==s)grilla={D,s,G:equipoEnGrilla(D,s)};
   const sim=new Float32Array(n*p),M=grilla.G.mascara;let se=0,ss=0;
   for(let z=0;z<n;z++)for(let i=0;i<p;i++){const o=z*p+i;if(!M[o])continue;const v=Math.max(0,vol[(n-1-z)*p+i]);sim[o]=v;ss+=v;se+=grilla.G.vol[o];}
   const f=factor||se/(ss||1);for(let o=0;o<sim.length;o++)sim[o]*=f;
   return {sim,factor:f,nombre,dispersion:disp,segundos:(performance.now()-t0)/1000};
  }finally{e.ocupado=false;e.tarea=null;e.rechazo=null;Progreso.cerrar();}
 }
 return {configurar,disponible,agregar,fijarTipo,comparar,ejecutar,reconstruirCon,cancelar,estado:e};
})();
window.EjeEquipo=EjeEquipo;
