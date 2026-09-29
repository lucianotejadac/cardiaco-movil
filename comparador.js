/* Comparador: reconstrucciones de Siemens frente a las del simulador, con las mismas proyecciones.
   Cada serie de Siemens dice en su DICOM como se hizo (ConvolutionKernel, CorrectedImage):
   - transversal «Isotope (A) - Recon - NoAC»: FBP con Butterworth 0,50 orden 5;
   - eje corto NoAC y AC: OSEM 3D, 6 iteraciones x 4 subconjuntos, gaussiano 9 mm (AC con
     atenuacion; en algun estres tambien dispersion, que el simulador no hace);
   - gatillado en eje corto: OSEM 3D, 4 x 4, gaussiano 8,4 mm.
   Todas con uniformidad y movimiento corregidos: el simulador usa las proyecciones corregidas por
   el equipo (NM_<fase>_QC_corregido.dcm) si el ZIP las trae. La gatillada no trae copia corregida.
   Modos:
   - «Transversal»: FBP rampa x Butterworth 2D (corte en ciclos/cm, bitacora), OSEM de la receta
     del caso o FBP rampa, en la grilla transversal de Siemens.
   - «Eje corto NoAC / AC» y «Gatillado»: OSEM del simulador (2D por cortes) con la receta de
     Siemens (6 x 4 / 4 x 4) o la del caso (2 x 8), solo en los cortes que cubre el eje corto, y
     llevada a la grilla exacta del eje corto de Siemens (posicion y orientacion de su DICOM; los
     cortes avanzan en el sentido fila x columna, medido: bitacora). AC con el mapa mu del CT de la
     fase, sin desplazamiento (SPECT y CT comparten marco de referencia).
   Cada imagen va a su propio maximo. Diferencia y metricas con los dos volumenes a la misma suma
   dentro de la region con actividad de Siemens (sobre el 10 % de su maximo). */
'use strict';
const Comparador=(()=>{
 const C=CardiacoCore,$=id=>document.getElementById(id);
 const dec=(x,d)=>Number(x).toFixed(d).replace('.',',');
 const paleta=C.PALETAS.cardiaca;
 const MODOS={trans:{nombre:'Transversal',metodos:['btw','osem','rampa'],planos:['axial','coronal','sagital']},
  sa:{nombre:'Eje corto NoAC',metodos:['siemens','caso'],planos:['corto','vertical','horizontal']},
  saac:{nombre:'Eje corto AC',metodos:['siemens','caso'],planos:['corto','vertical','horizontal']},
  gat:{nombre:'Gatillado',metodos:['siemens','caso'],planos:['corto','vertical','horizontal']}};
 const NOMBRE_PLANO={axial:'Axial',coronal:'Coronal',sagital:'Sagital',corto:'Eje corto',vertical:'Largo vertical',horizontal:'Largo horizontal'};
 const NOMBRE_METODO={btw:'Como el equipo',osem:'OSEM 2 × 8',rampa:'FBP rampa',siemens:'Receta de Siemens',caso:'Receta del caso'};
 const k={q:null,modo:'trans',metodo:{trans:'btw',sa:'siemens',saac:'siemens',gat:'siemens'},corte:.5,orden:5,plano:'axial',idx:{},vista:'lado',techo:1,t:0,timer:null,
  datos:{},sim:{},tarea:null,rechazo:null,ocupado:false,detenido:false};

 /* ---------- lectura ---------- */
 const archivo=(b,n)=>new File([b],n);
 // Grilla de una serie de Siemens: voxel (i, j, k) -> paciente = pos + i*sp*fila + j*sp*col + k*dz*n.
 async function leerSerie(bytes){
  const v=await C.leerVolumen(archivo(bytes,'serie.dcm'));
  const d=dicomParser.parseDicom(new Uint8Array(bytes)),det=d.elements.x00540022?.items?.[0]?.dataSet;
  const iop=(det?.string('x00200037')||d.string('x00200037')||'1\\0\\0\\0\\1\\0').split('\\').map(Number),r=iop.slice(0,3),c=iop.slice(3,6);
  const n=[r[1]*c[2]-r[2]*c[1],r[2]*c[0]-r[0]*c[2],r[0]*c[1]-r[1]*c[0]];
  let max=0;for(const vol of v.data){const m=C.percentil(vol,.999);if(m>max)max=m;}
  return {W:v.n,H:v.n,K:v.nz,sp:v.spacing,dz:v.dz,pos:v.posicion||[0,0,0],r,c,n,vols:v.data,max:max||1,descripcion:v.descripcion};
 }
 async function abrir(q){
  const aviso=$('cmpEstado');
  if(k.q!==q){
   detener();k.q=q;k.datos={};k.sim={};k.t=0;
   try{
    Progreso.abrir('Leyendo las reconstrucciones de Siemens',null);Progreso.avance(null,'Transversal, ejes cortos y gatillado…');await new Promise(r=>setTimeout(r,20));
    k.datos.trans=await leerSerie(q.recon);
    if(q.saNoAC)k.datos.sa=await leerSerie(q.saNoAC);
    if(q.saAC)k.datos.saac=await leerSerie(q.saAC);
    if(q.saGat&&q.proyGat)k.datos.gat=await leerSerie(q.saGat);
    k.s=Lab95.spect(await Lab95.read(new Blob([q.proyQC||q.proy])));
    k.fuente=q.proyQC?'corregidas por el equipo (QC)':'originales (el ZIP no trae la copia corregida)';
   }catch(err){aviso.className='estado error';aviso.textContent='No se pudo abrir: '+(err.message||err);console.error(err);return false;}
   finally{Progreso.cerrar();}
   if(!MODOS[k.modo]||!k.datos[k.modo])k.modo='trans';
   for(const m of Object.keys(k.datos)){const D=k.datos[m];k.idx[m]={a:D.K>>1,b:D.H>>1,c:D.W>>1};}
   aviso.className='estado';aviso.textContent=`Caso ${q.caso}, ${q.fase==='reposo'?'reposo':'estrés'}. Elige qué comparar y cómo reconstruye el simulador, y pulsa «Reconstruir».`;
  }
  pintar();return true;
 }

 /* ---------- reconstrucciones del simulador ---------- */
 // Butterworth 2D sobre cada proyeccion: 1/sqrt(1+(f/fc)^(2 orden)), f radial en ciclos/pixel,
 // fc = corte en ciclos/cm x pixel en cm.
 function butterworth(s,corte,orden){
  const n=s.n,p=n*n,data=new Float32Array(s.data.length),fc=corte*s.spacing/10;
  const H=new Float32Array(p);for(let v=0;v<n;v++)for(let u=0;u<n;u++){const fu=(u<=n/2?u:u-n)/n,fv=(v<=n/2?v:v-n)/n;H[v*n+u]=1/Math.sqrt(1+Math.pow(Math.hypot(fu,fv)/fc,2*orden));}
  const re=new Float64Array(p),im=new Float64Array(p),fr=new Float64Array(n),fi=new Float64Array(n);
  for(let f=0;f<s.frames;f++){re.set(s.data.subarray(f*p,(f+1)*p));im.fill(0);fft2(re,im,n,false,fr,fi);for(let i=0;i<p;i++){re[i]*=H[i];im[i]*=H[i];}fft2(re,im,n,true,fr,fi);for(let i=0;i<p;i++)data[f*p+i]=re[i];}
  return {...s,data};
 }
 function fft1(re,im,inv){const n=re.length;for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}for(let len=2;len<=n;len*=2){const a=(inv?2:-2)*Math.PI/len;for(let i=0;i<n;i+=len)for(let j=0;j<len/2;j++){const cc=Math.cos(a*j),ss=Math.sin(a*j),x=i+j,y=x+len/2,tr=re[y]*cc-im[y]*ss,ti=re[y]*ss+im[y]*cc;re[y]=re[x]-tr;im[y]=im[x]-ti;re[x]+=tr;im[x]+=ti;}}if(inv)for(let i=0;i<n;i++){re[i]/=n;im[i]/=n;}}
 function fft2(re,im,n,inv,fr,fi){
  for(let y=0;y<n;y++){for(let x=0;x<n;x++){fr[x]=re[y*n+x];fi[x]=im[y*n+x];}fft1(fr,fi,inv);for(let x=0;x<n;x++){re[y*n+x]=fr[x];im[y*n+x]=fi[x];}}
  for(let x=0;x<n;x++){for(let y=0;y<n;y++){fr[y]=re[y*n+x];fi[y]=im[y*n+x];}fft1(fr,fi,inv);for(let y=0;y<n;y++){re[y*n+x]=fr[y];im[y*n+x]=fi[y];}}
 }
 function fbp(s,avance){
  return new Promise((ok,mal)=>{
   const url=URL.createObjectURL(new Blob([Lab95.workerSource],{type:'text/javascript'}));const w=new Worker(url);URL.revokeObjectURL(url);k.tarea=w;k.rechazo=mal;
   w.onerror=e=>{w.terminate();mal(Error(e.message));};
   w.onmessage=({data:q})=>{if(q.error){w.terminate();mal(Error(q.error));return;}if(q.progress){avance(q.progress/q.total);return;}if(q.volume){w.terminate();k.tarea=null;k.rechazo=null;ok(q.volume);}};
   w.postMessage({n:s.n,views:s.views,data:s.data,window:1,ramp:true});
  });
 }
 // OSEM del escritorio; filas: [z0, z1] del motor (solo esos cortes) o null (todos).
 function osem(s,it,sub,mu,filas,avance){
  return new Promise((ok,mal)=>{
   const codigo=[createModel.toString(),sampleGrid.toString(),attenuationWeights.toString(),gaussianKernel95.toString(),scatterBlur95.toString(),createPsfView95.toString(),'('+osem95Worker.toString()+')()'].join('\n');
   const t=createOsem95Pool(codigo);k.tarea=t;k.rechazo=mal;
   t.onerror=err=>{t.terminate();mal(Error(err.message||'Error del cálculo.'));};
   t.onmessage=({data:q})=>{if(q.error){t.terminate();mal(Error(q.error));return;}if(q.progress){let f=q.total?q.completed/q.total:0;const m=String(q.progress).match(/corte (\d+)\/(\d+), vista (\d+)\/(\d+)/);if(m)f=Math.max(f,(m[1]-1+m[3]/m[4])/m[2]);avance(f);return;}if(q.volume){t.terminate();k.tarea=null;k.rechazo=null;ok(q.volume);}};
   const extra=filas?{previewRow:Math.round((filas[0]+filas[1])/2),previewRadius:Math.ceil((filas[1]-filas[0])/2)}:{};
   t.postMessage({n:s.n,data:s.data,views:s.views,spacing:s.spacing,window:1,scatterWindow:2,settings:{scatter:false,scatterSmoothing:false,scatterFwhm:0,scatterWeight:0,scatterWindowScale:0,resolutionRecovery:false,distanceDependent:false,axialRecovery:false,initialization:'uniform',iterations:it,subsets:sub,attenuationCorrection:!!mu,postFilter:false,postFilterFWHMmm:0},mu,fbp:null,outsideAir:true,...extra});
  });
 }
 // Filas del motor (fila 0 = cabeza) que cubre una grilla de Siemens, con margen para el filtro.
 function filasDe(D,s,margen=6){
  let zmin=Infinity,zmax=-Infinity;for(const i of [0,D.W-1])for(const j of [0,D.H-1])for(const kk of [0,D.K-1]){const Z=D.pos[2]+i*D.sp*D.r[2]+j*D.sp*D.c[2]+kk*D.dz*D.n[2];zmin=Math.min(zmin,Z);zmax=Math.max(zmax,Z);}
  return [Math.max(0,Math.floor((s.z0-zmax)/s.spacing)-margen),Math.min(s.n-1,Math.ceil((s.z0-zmin)/s.spacing)+margen)];
 }
 // Mapa mu del CT de la fase (conversion del escritorio), solo en esas filas.
 function mapaMu(s,ctBytes,filas){
  const cortes=ctBytes.map(b=>Lab95.ct(dicomParser.parseDicom(b))),ct=Lab95.prepareCT(cortes,s),n=s.n,map=new Float32Array(n*n*n).fill(NaN);
  for(let z=filas[0];z<=filas[1];z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){const hu=Lab95.sampleCT(ct,Lab95.point(s,x,y,z,[0,0,0]));if(!Number.isFinite(hu))continue;const h=Math.max(-1000,Math.min(3000,hu));map[z*n*n+y*n+x]=h<=0?.15*(1+h/1000):.15+.0001*h;}
  return map;
 }
 // Volumen del motor (fila 0 = cabeza) en la grilla D de Siemens, trilineal.
 function remuestrear(vol,s,D){
  const m=s.n,mm=m*m,c=(m-1)/2,out=new Float32Array(D.W*D.H*D.K),at=(x,y,z)=>vol[z*mm+y*m+x];
  for(let kk=0;kk<D.K;kk++)for(let j=0;j<D.H;j++)for(let i=0;i<D.W;i++){
   const X=D.pos[0]+i*D.sp*D.r[0]+j*D.sp*D.c[0]+kk*D.dz*D.n[0],Y=D.pos[1]+i*D.sp*D.r[1]+j*D.sp*D.c[1]+kk*D.dz*D.n[1],Z=D.pos[2]+i*D.sp*D.r[2]+j*D.sp*D.c[2]+kk*D.dz*D.n[2];
   const x=(X-s.origin[0])/s.spacing+c,y=(Y-s.origin[1])/s.spacing+c,z=(s.z0-Z)/s.spacing;if(x<0||y<0||z<0||x>m-1||y>m-1||z>m-1)continue;
   const x0=Math.min(m-2,Math.floor(x)),y0=Math.min(m-2,Math.floor(y)),z0=Math.min(m-2,Math.floor(z)),fx=x-x0,fy=y-y0,fz=z-z0;
   const c00=at(x0,y0,z0)*(1-fx)+at(x0+1,y0,z0)*fx,c10=at(x0,y0+1,z0)*(1-fx)+at(x0+1,y0+1,z0)*fx,c01=at(x0,y0,z0+1)*(1-fx)+at(x0+1,y0,z0+1)*fx,c11=at(x0,y0+1,z0+1)*(1-fx)+at(x0+1,y0+1,z0+1)*fx;
   out[(kk*D.H+j)*D.W+i]=Math.max(0,(c00*(1-fy)+c10*fy)*(1-fz)+(c01*(1-fy)+c11*fy)*fz);
  }
  return out;
 }
 function receta(modo,metodo){
  if(modo==='gat')return metodo==='siemens'?{it:4,sub:4,fwhm:8.4}:{it:CARDIACO_GATILLADO.iteraciones,sub:CARDIACO_GATILLADO.subconjuntos,fwhm:CARDIACO_GATILLADO.filtroMm};
  return metodo==='siemens'?{it:6,sub:4,fwhm:9}:{it:CARDIACO_RECETA.iteraciones,sub:CARDIACO_RECETA.subconjuntos,fwhm:CARDIACO_RECETA.filtroMm};
 }
 function nombreSim(modo,metodo){
  if(modo==='trans')return metodo==='btw'?`FBP rampa × Butterworth ${dec(k.corte,2)} ciclos/cm, orden ${k.orden}`:metodo==='osem'?`OSEM ${CARDIACO_RECETA.iteraciones} × ${CARDIACO_RECETA.subconjuntos}, gaussiano ${dec(CARDIACO_RECETA.filtroMm,1)} mm`:'FBP solo rampa';
  const r=receta(modo,metodo);return `OSEM 2D ${r.it} × ${r.sub}${modo==='saac'?' con atenuación':''}, gaussiano ${dec(r.fwhm,1)} mm${modo==='gat'?', 8 intervalos':''}`;
 }
 async function reconstruir(){
  if(k.ocupado||!k.s)return;const modo=k.modo,metodo=k.metodo[modo],D=k.datos[modo];if(!D)return;
  detener();k.ocupado=true;k.detenido=false;$('cmpCorrer').disabled=true;const t0=performance.now(),nombre=nombreSim(modo,metodo);
  Progreso.abrir(`Simulador: ${nombre}`,cancelar,modo==='saac'?'La atenuación de cada vista es la parte lenta: puede tardar minutos en la tablet.':modo==='gat'?'Ocho reconstrucciones, una por intervalo del ciclo cardíaco.':'');
  try{
   const pausa=()=>new Promise(q=>setTimeout(q,0)),vols=[];
   if(modo==='trans'){
    let s=k.s,vol;
    if(metodo==='btw'){Progreso.avance(0,'Butterworth 2D en cada proyección…');await pausa();s=butterworth(s,k.corte,k.orden);if(k.detenido)throw Error('detenida');}
    if(metodo==='osem'){vol=await osem(s,CARDIACO_RECETA.iteraciones,CARDIACO_RECETA.subconjuntos,null,null,f=>Progreso.avance(f*.85,`OSEM ${Math.round(f*100)} %`));Progreso.avance(.85,'Gaussiano final…');vol=await Lab95.gaussian3D(vol,s.n,CARDIACO_RECETA.filtroMm/s.spacing/2.354820045,()=>k.detenido);}
    else vol=await fbp(s,f=>Progreso.avance((metodo==='btw'?.1:0)+f*.8,`Retroproyección filtrada: corte ${Math.round(f*s.n)} de ${s.n}`));
    if(!vol)throw Error('detenida');Progreso.avance(.95,'Llevando a la grilla de Siemens…');await pausa();vols.push(remuestrear(vol,s,D));
   }else{
    const r=receta(modo,metodo),sig=r.fwhm/k.s.spacing/2.354820045;
    if(modo==='gat'){
     Progreso.avance(0,'Leyendo la adquisición gatillada…');await pausa();
     const g=Lab95.spect(await Lab95.read(new Blob([k.q.proyGat])),{gated:true}),filas=filasDe(D,g);
     for(let t=1;t<=g.slots;t++){
      if(k.detenido)throw Error('detenida');const sg=Lab95.gate(g,t);
      let vol=await osem(sg,r.it,r.sub,null,filas,f=>Progreso.avance((t-1+f*.85)/g.slots,`Intervalo ${t} de ${g.slots}: OSEM ${Math.round(f*100)} %`));
      Progreso.avance((t-.15)/g.slots,`Intervalo ${t} de ${g.slots}: gaussiano y grilla de Siemens…`);
      vol=await Lab95.gaussian3D(vol,sg.n,sig,()=>k.detenido);if(!vol)throw Error('detenida');vols.push(remuestrear(vol,sg,D));
     }
    }else{
     const filas=filasDe(D,k.s);let mu=null;
     if(modo==='saac'){if(!k.q.ct?.length)throw Error('El ZIP no trae el CT de esta fase.');Progreso.avance(0,'Mapa μ desde el CT de la fase…');await pausa();mu=mapaMu(k.s,k.q.ct,filas);}
     let vol=await osem(k.s,r.it,r.sub,mu,filas,f=>Progreso.avance(.05+f*.8,`${mu?'Atenuación y ':''}OSEM ${Math.round(f*100)} %`));
     Progreso.avance(.88,'Gaussiano final…');vol=await Lab95.gaussian3D(vol,k.s.n,sig,()=>k.detenido);if(!vol)throw Error('detenida');
     Progreso.avance(.95,'Llevando a la grilla del eje corto de Siemens…');await pausa();vols.push(remuestrear(vol,k.s,D));
    }
   }
   let max=0;for(const v of vols){const m=C.percentil(v,.999);if(m>max)max=m;}
   k.sim[modo]={vols,max:max||1,nombre};medir(modo);k.t=0;
   $('cmpEstado').className='estado ok';$('cmpEstado').textContent=`Simulador: ${nombre}, proyecciones ${modo==='gat'?'gatilladas (sin corrección del equipo)':k.fuente}. Tomó ${dec((performance.now()-t0)/1000,1)} s.`;
   pintar();if(modo==='gat')latir();
  }catch(err){$('cmpEstado').className=k.detenido?'estado':'estado error';$('cmpEstado').textContent=k.detenido?'Reconstrucción detenida.':'No se pudo reconstruir: '+(err.message||err);if(!k.detenido)console.error(err);}
  finally{k.ocupado=false;k.tarea=null;k.rechazo=null;$('cmpCorrer').disabled=false;Progreso.cerrar();}
 }
 function cancelar(){if(k.ocupado)k.detenido=true;if(k.tarea){k.tarea.terminate();k.tarea=null;}if(k.rechazo){k.rechazo(Error('detenida'));k.rechazo=null;}}
 // Correlacion y diferencia (todos los intervalos juntos en el gatillado).
 function medir(modo){
  const D=k.datos[modo],S=k.sim[modo],umbral=.1*D.max;let sa=0,sb=0,nm=0;
  D.vols.forEach((a,t)=>{const b=S.vols[t];for(let i=0;i<a.length;i++)if(a[i]>umbral){sa+=a[i];sb+=b[i];nm++;}});
  const fa=nm/sa,fb=nm/(sb||1);let sab=0,saa=0,sbb=0,dif=0;
  D.vols.forEach((a,t)=>{const b=S.vols[t];for(let i=0;i<a.length;i++)if(a[i]>umbral){const x=a[i]*fa-1,y=b[i]*fb-1;sab+=x*y;saa+=x*x;sbb+=y*y;dif+=Math.abs(a[i]*fa-b[i]*fb);}});
  S.fa=fa;S.fb=fb;S.metricas={r:sab/Math.sqrt(saa*sbb||1),dif:100*dif/nm,voxeles:nm};
 }

 /* ---------- visualizacion ---------- */
 // Imagen del plano elegido. Transversal: axial (k), coronal (j, cabeza arriba), sagital (i).
 // Eje corto: corto (k), largo vertical (i fijo: filas j, columnas k), largo horizontal (j fijo:
 // filas k, columnas i). Devuelve {img, w, h}.
 function corte(D,vol,plano,ix){
  const W=D.W,H=D.H,K=D.K,at=(i,j,kk)=>vol[(kk*H+j)*W+i];let w,h,f;
  if(plano==='axial'||plano==='corto'){w=W;h=H;f=(u,v)=>at(u,v,ix.a);}
  else if(plano==='coronal'){w=W;h=K;f=(u,v)=>at(u,ix.b,K-1-v);}
  else if(plano==='sagital'){w=H;h=K;f=(u,v)=>at(ix.c,u,K-1-v);}
  else if(plano==='vertical'){w=K;h=H;f=(u,v)=>at(ix.c,v,u);}
  else{w=W;h=K;f=(u,v)=>at(u,ix.b,v);}
  const img=new Float32Array(w*h);for(let v=0;v<h;v++)for(let u=0;u<w;u++)img[v*w+u]=f(u,v);return {img,w,h};
 }
 function pintarImg(c,{img,w,h},color){
  const esc=Math.max(2,Math.round(360/Math.max(w,h)));if(c.width!==w*esc||c.height!==h*esc){c.width=w*esc;c.height=h*esc;}
  const base=document.createElement('canvas');base.width=w;base.height=h;const x=base.getContext('2d'),im=x.createImageData(w,h);
  for(let i=0;i<w*h;i++){const col=color(img[i]);im.data[i*4]=col[0];im.data[i*4+1]=col[1];im.data[i*4+2]=col[2];im.data[i*4+3]=255;}
  x.putImageData(im,0,0);const o=c.getContext('2d');o.imageSmoothingEnabled=false;o.drawImage(base,0,0,c.width,c.height);
 }
 const diverge=t=>{t=Math.max(-1,Math.min(1,t));return t<0?[255*(1+t),255*(1+t),255]:[255,255*(1-t),255*(1-t)];};
 function pintar(){
  const modo=k.modo,D=k.datos[modo];if(!D)return;const S=k.sim[modo],M=MODOS[modo];
  if(!M.planos.includes(k.plano))k.plano=M.planos[0];
  const ix=k.idx[modo],t=modo==='gat'?k.t%D.vols.length:0;
  pintarImg($('cmpSie'),corte(D,D.vols[t],k.plano,ix),v=>paleta(v/(D.max*k.techo)));
  const der=$('cmpSim');
  if(!S){der.width=360;der.height=360;const x=der.getContext('2d');x.fillStyle='#000';x.fillRect(0,0,360,360);x.fillStyle='#aab3bd';x.font='20px system-ui';x.textAlign='center';x.fillText('Pulsa «Reconstruir»',180,180);}
  else if(k.vista==='lado')pintarImg(der,corte(D,S.vols[t],k.plano,ix),v=>paleta(v/(S.max*k.techo)));
  else{const a=corte(D,D.vols[t],k.plano,ix),b=corte(D,S.vols[t],k.plano,ix),tope=.5*D.max*S.fa*k.techo,d=new Float32Array(a.img.length);for(let i=0;i<d.length;i++)d[i]=(b.img[i]*S.fb-a.img[i]*S.fa)/tope;pintarImg(der,{img:d,w:a.w,h:a.h},diverge);}
  $('cmpSieTitulo').textContent=`Siemens · ${M.nombre}`;
  $('cmpSimTitulo').textContent=k.vista==='dif'&&S?'Diferencia (simulador − Siemens)':'Simulador';
  // Controles segun el modo.
  document.querySelectorAll('[data-cmodo]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.cmodo===modo));b.disabled=!k.datos[b.dataset.cmodo];});
  document.querySelectorAll('[data-cmetodo]').forEach(b=>{const m=M.metodos[+b.dataset.cmetodo];b.hidden=!m;if(m){b.textContent=NOMBRE_METODO[m];b.setAttribute('aria-pressed',String(k.metodo[modo]===m));}});
  document.querySelectorAll('[data-cplano]').forEach(b=>{const p=M.planos[+b.dataset.cplano];b.textContent=NOMBRE_PLANO[p];b.setAttribute('aria-pressed',String(k.plano===p));});
  document.querySelectorAll('[data-cvista]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.cvista===k.vista));b.disabled=!S;});
  $('cmpBtw').hidden=!(modo==='trans'&&k.metodo.trans==='btw');$('cmpCorteBtw').value=Math.round(k.corte*100);$('cmpCorteBtwTexto').textContent=`${dec(k.corte,2)} c/cm`;$('cmpOrden').value=k.orden;$('cmpOrdenTexto').textContent=k.orden;
  if(k.s)$('cmpNyquist').textContent=`= ${dec(k.corte*k.s.spacing/10/.5,2)} de Nyquist (${dec(10/(2*k.s.spacing),2)} ciclos/cm con píxeles de ${dec(k.s.spacing,1)} mm)`;
  const eje=k.plano==='axial'||k.plano==='corto'?'a':k.plano==='coronal'||k.plano==='horizontal'?'b':'c',lim={a:D.K,b:D.H,c:D.W}[eje];
  $('cmpCorteRango').max=lim-1;$('cmpCorteRango').value=ix[eje];$('cmpCorte').textContent=`${ix[eje]+1}/${lim}`;
  $('cmpCine').hidden=modo!=='gat'||!S;if(modo==='gat')$('cmpIntervalo').textContent=`Intervalo ${t+1} de ${D.vols.length}`;
  $('cmpTecho').value=Math.round(k.techo*100);
  const receta=modo==='trans'?'FBP con Butterworth 0,50, orden 5':modo==='gat'?'OSEM 3D 4 × 4, gaussiano 8,4 mm':'OSEM 3D 6 × 4, gaussiano 9 mm'+(modo==='saac'?', con atenuación':'');
  $('cmpSiemens').textContent=`Siemens: «${D.descripcion}», ${receta} (según su DICOM).`;
  const X=S?.metricas;
  $('cmpMetricas').textContent=X?`${S.nombre}. Dentro de la región con actividad (${X.voxeles.toLocaleString('es-CL')} vóxeles${modo==='gat'?', los 8 intervalos':''}), a la misma suma: correlación r = ${dec(X.r,3)} y diferencia media ${dec(X.dif,1)} % de la media.`:'Todavía no hay reconstrucción del simulador para comparar.';
 }
 function latir(){detener();$('cmpPlay').textContent='■ Parar';k.timer=setInterval(()=>{k.t++;pintar();},125);}
 function detener(){if(k.timer){clearInterval(k.timer);k.timer=null;}const b=$('cmpPlay');if(b)b.textContent='▶ Latir';}
 function iniciar(){
  document.querySelectorAll('[data-cmodo]').forEach(b=>b.addEventListener('click',()=>{if(!k.datos[b.dataset.cmodo])return;detener();k.modo=b.dataset.cmodo;k.plano=MODOS[k.modo].planos[0];pintar();if(k.modo==='gat'&&k.sim.gat)latir();}));
  document.querySelectorAll('[data-cmetodo]').forEach(b=>b.addEventListener('click',()=>{const m=MODOS[k.modo].metodos[+b.dataset.cmetodo];if(m){k.metodo[k.modo]=m;pintar();}}));
  document.querySelectorAll('[data-cplano]').forEach(b=>b.addEventListener('click',()=>{k.plano=MODOS[k.modo].planos[+b.dataset.cplano];pintar();}));
  document.querySelectorAll('[data-cvista]').forEach(b=>b.addEventListener('click',()=>{k.vista=b.dataset.cvista;pintar();}));
  $('cmpCorteRango').addEventListener('input',e=>{const eje=k.plano==='axial'||k.plano==='corto'?'a':k.plano==='coronal'||k.plano==='horizontal'?'b':'c';k.idx[k.modo][eje]=+e.target.value;pintar();});
  $('cmpCorteBtw').addEventListener('input',e=>{k.corte=Math.max(.05,+e.target.value/100);pintar();});
  $('cmpOrden').addEventListener('input',e=>{k.orden=+e.target.value;pintar();});
  $('cmpTecho').addEventListener('input',e=>{k.techo=Math.max(.05,+e.target.value/100);pintar();});
  $('cmpCorrer').addEventListener('click',reconstruir);
  $('cmpPlay').addEventListener('click',()=>{k.timer?detener():latir();});
 }
 function salir(){detener();cancelar();}
 return {iniciar,abrir,salir,estado:k};
})();
window.Comparador=Comparador;
