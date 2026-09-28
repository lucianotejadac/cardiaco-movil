/* Comparador: la reconstruccion transversal del equipo (Siemens, «Recon - NoAC») frente a la del
   simulador hecha con las mismas proyecciones. El DICOM de Siemens dice como la hizo:
   ConvolutionKernel «FBP, Btw,0,50,5» (retroproyeccion filtrada con un Butterworth de corte 0,50
   y orden 5) y CorrectedImage «UNIF, MOTN» (uniformidad y movimiento corregidos). Por eso:
   - se usan las proyecciones corregidas por el equipo (NM_<fase>_QC_corregido.dcm) si el ZIP las
     trae, y si no las originales;
   - el metodo «como el equipo» es FBP con rampa por Butterworth 2D sobre cada proyeccion. El
     DICOM no dice la unidad del corte: se toma en ciclos/cm (0,50 ciclos/cm = 0,33 de Nyquist con
     pixeles de 3,3 mm), porque asi la correlacion con Siemens es mayor que leyendolo como
     fraccion de Nyquist en los casos 3 y 4 (bitacora). Se deja ajustable;
   - tambien se puede comparar con la OSEM de la receta del caso o con la FBP solo rampa.
   La reconstruccion del simulador se remuestrea (trilineal) en la grilla de Siemens usando las
   posiciones de los dos DICOM, para comparar voxel a voxel. Cada imagen va a su propio maximo:
   las unidades son distintas. La diferencia se calcula con los dos volumenes normalizados a la
   misma suma dentro del cuerpo. */
'use strict';
const Comparador=(()=>{
 const C=CardiacoCore,$=id=>document.getElementById(id);
 const dec=(x,d)=>Number(x).toFixed(d).replace('.',',');
 const k={q:null,sie:null,s:null,fuente:'',sim:null,metodo:'btw',corte:.5,orden:5,plano:'axial',idx:{axial:64,coronal:64,sagital:64},vista:'lado',techo:1,tarea:null,rechazo:null,ocupado:false,detenido:false,metricas:null,etiqueta:''};

 async function abrir(q){
  const aviso=$('cmpEstado');
  if(k.q!==q){
   k.q=q;k.sim=null;k.metricas=null;
   try{
    const v=await C.leerVolumen(new File([q.recon],'Recon_transversal_NoAC.dcm'));
    if(v.nz!==v.n)throw Error('La reconstrucción del equipo no es un volumen cúbico.');
    k.sie={v,vol:v.data[0],n:v.n,pos:v.posicion||[0,0,0],max:C.percentil(v.data[0],.999)||1};
    k.s=Lab95.spect(await Lab95.read(new Blob([q.proyQC||q.proy])));
    k.fuente=q.proyQC?'corregidas por el equipo (QC)':'originales (el ZIP no trae la copia corregida)';
    const c=v.n>>1;k.idx={axial:c,coronal:c,sagital:c};
   }catch(err){aviso.className='estado error';aviso.textContent='No se pudo abrir: '+(err.message||err);console.error(err);return false;}
   aviso.className='estado';aviso.textContent=`Caso ${q.caso}, ${q.fase==='reposo'?'reposo':'estrés'}. Siemens: «${k.sie.v.descripcion}», FBP con Butterworth 0,50 orden 5, uniformidad y movimiento corregidos. Elige cómo reconstruye el simulador, con las proyecciones ${k.fuente}, y pulsa «Reconstruir».`;
  }
  pintar();return true;
 }

 // Butterworth 2D sobre cada proyeccion (todas las ventanas): 1/sqrt(1+(f/fc)^(2 orden)), con f
 // la frecuencia radial en ciclos por pixel y fc = corte en ciclos/cm x tamano del pixel en cm.
 function butterworth(s,corte,orden){
  const n=s.n,p=n*n,data=new Float32Array(s.data.length),fc=corte*s.spacing/10;
  const H=new Float32Array(p);for(let v=0;v<n;v++)for(let u=0;u<n;u++){const fu=(u<=n/2?u:u-n)/n,fv=(v<=n/2?v:v-n)/n,f=Math.hypot(fu,fv);H[v*n+u]=1/Math.sqrt(1+Math.pow(f/fc,2*orden));}
  const re=new Float64Array(p),im=new Float64Array(p),fila=new Float64Array(n),filaI=new Float64Array(n);
  for(let fr=0;fr<s.frames;fr++){
   re.set(s.data.subarray(fr*p,(fr+1)*p));im.fill(0);fft2(re,im,n,false,fila,filaI);
   for(let i=0;i<p;i++){re[i]*=H[i];im[i]*=H[i];}
   fft2(re,im,n,true,fila,filaI);for(let i=0;i<p;i++)data[fr*p+i]=re[i];
  }
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
 function osem(s,avance){
  return new Promise((ok,mal)=>{
   const codigo=[createModel.toString(),sampleGrid.toString(),attenuationWeights.toString(),gaussianKernel95.toString(),scatterBlur95.toString(),createPsfView95.toString(),'('+osem95Worker.toString()+')()'].join('\n');
   const t=createOsem95Pool(codigo);k.tarea=t;k.rechazo=mal;
   t.onerror=err=>{t.terminate();mal(Error(err.message||'Error del cálculo.'));};
   t.onmessage=({data:q})=>{if(q.error){t.terminate();mal(Error(q.error));return;}if(q.progress){avance(q.total?q.completed/q.total:0);return;}if(q.volume){t.terminate();k.tarea=null;k.rechazo=null;ok(q.volume);}};
   t.postMessage({n:s.n,data:s.data,views:s.views,spacing:s.spacing,window:1,scatterWindow:2,settings:{scatter:false,scatterSmoothing:false,scatterFwhm:0,scatterWeight:0,scatterWindowScale:0,resolutionRecovery:false,distanceDependent:false,axialRecovery:false,initialization:'uniform',iterations:CARDIACO_RECETA.iteraciones,subsets:CARDIACO_RECETA.subconjuntos,attenuationCorrection:false,postFilter:false,postFilterFWHMmm:0},mu:null,fbp:null,outsideAir:true});
  });
 }
 // Volumen del simulador (fila 0 = cabeza, geometria del motor) en la grilla de Siemens.
 function remuestrear(vol){
  const S=k.sie,n=S.n,sp=S.v.spacing,dz=S.v.dz,s=k.s,m=s.n,c=(m-1)/2,out=new Float32Array(n*n*n),mm=m*m;
  const at=(x,y,z)=>vol[z*mm+y*m+x];
  for(let kk=0;kk<n;kk++){const Z=S.pos[2]+kk*dz,z=(s.z0-Z)/s.spacing;if(z<0||z>m-1)continue;const z0=Math.min(m-2,Math.floor(z)),fz=z-z0;
   for(let j=0;j<n;j++){const y=(S.pos[1]+j*sp-s.origin[1])/s.spacing+c;if(y<0||y>m-1)continue;const y0=Math.min(m-2,Math.floor(y)),fy=y-y0;
    for(let i=0;i<n;i++){const x=(S.pos[0]+i*sp-s.origin[0])/s.spacing+c;if(x<0||x>m-1)continue;const x0=Math.min(m-2,Math.floor(x)),fx=x-x0;
     const c00=at(x0,y0,z0)*(1-fx)+at(x0+1,y0,z0)*fx,c10=at(x0,y0+1,z0)*(1-fx)+at(x0+1,y0+1,z0)*fx,c01=at(x0,y0,z0+1)*(1-fx)+at(x0+1,y0,z0+1)*fx,c11=at(x0,y0+1,z0+1)*(1-fx)+at(x0+1,y0+1,z0+1)*fx;
     out[kk*n*n+j*n+i]=Math.max(0,(c00*(1-fy)+c10*fy)*(1-fz)+(c01*(1-fy)+c11*fy)*fz);}}}
  return out;
 }
 // Correlacion y diferencia dentro del cuerpo (voxeles de Siemens sobre el 10 % de su maximo),
 // con los dos volumenes normalizados a la misma suma en esa region.
 function medir(){
  const a=k.sie.vol,b=k.sim,umbral=.1*k.sie.max;let sa=0,sb=0,nm=0;
  for(let i=0;i<a.length;i++)if(a[i]>umbral){sa+=a[i];sb+=b[i];nm++;}
  const fa=nm/sa,fb=nm/(sb||1);let ma=0,mb=0;for(let i=0;i<a.length;i++)if(a[i]>umbral){ma+=a[i]*fa;mb+=b[i]*fb;}ma/=nm;mb/=nm;
  let sab=0,saa=0,sbb=0,dif=0;for(let i=0;i<a.length;i++)if(a[i]>umbral){const x=a[i]*fa-ma,y=b[i]*fb-mb;sab+=x*y;saa+=x*x;sbb+=y*y;dif+=Math.abs(a[i]*fa-b[i]*fb);}
  k.fa=fa;k.fb=fb;k.metricas={r:sab/Math.sqrt(saa*sbb||1),dif:100*dif/nm,voxeles:nm};
 }

 const NOMBRE={btw:m=>`FBP rampa × Butterworth ${dec(m.corte,2)} ciclos/cm, orden ${m.orden}`,osem:()=>`OSEM ${CARDIACO_RECETA.iteraciones} × ${CARDIACO_RECETA.subconjuntos}, gaussiano ${dec(CARDIACO_RECETA.filtroMm,1)} mm`,rampa:()=>'FBP solo rampa'};
 async function reconstruir(){
  if(k.ocupado||!k.s)return;k.ocupado=true;k.detenido=false;$('cmpCorrer').disabled=true;const t0=performance.now(),m={metodo:k.metodo,corte:k.corte,orden:k.orden},nombre=NOMBRE[m.metodo](m);
  Progreso.abrir(`Simulador: ${nombre}`,cancelar,`Con las proyecciones ${k.fuente}, las mismas que usó el equipo.`);
  try{
   let s=k.s,vol;
   if(m.metodo==='btw'){Progreso.avance(0,'Butterworth 2D en cada proyección…');await new Promise(q=>setTimeout(q,20));s=butterworth(s,m.corte,m.orden);if(k.detenido)throw Error('detenida');}
   if(m.metodo==='osem'){vol=await osem(s,f=>Progreso.avance(f*.85,`OSEM ${Math.round(f*100)} %`));Progreso.avance(.85,'Gaussiano final…');vol=await Lab95.gaussian3D(vol,s.n,CARDIACO_RECETA.filtroMm/s.spacing/2.354820045,()=>k.detenido);if(!vol)throw Error('detenida');}
   else vol=await fbp(s,f=>Progreso.avance((m.metodo==='btw'?.1:0)+f*.8,`Retroproyección filtrada: corte ${Math.round(f*s.n)} de ${s.n}`));
   Progreso.avance(.95,'Llevando al espacio de Siemens y comparando…');await new Promise(q=>setTimeout(q,0));
   k.sim=remuestrear(vol);k.simMax=C.percentil(k.sim,.999)||1;k.etiqueta=nombre;medir();
   $('cmpEstado').className='estado ok';$('cmpEstado').textContent=`Simulador: ${nombre}, proyecciones ${k.fuente}. Tomó ${dec((performance.now()-t0)/1000,1)} s.`;
   pintar();
  }catch(err){$('cmpEstado').className=k.detenido?'estado':'estado error';$('cmpEstado').textContent=k.detenido?'Reconstrucción detenida.':'No se pudo reconstruir: '+(err.message||err);if(!k.detenido)console.error(err);}
  finally{k.ocupado=false;k.tarea=null;k.rechazo=null;$('cmpCorrer').disabled=false;Progreso.cerrar();}
 }
 function cancelar(){if(k.ocupado)k.detenido=true;if(k.tarea){k.tarea.terminate();k.tarea=null;}if(k.rechazo){k.rechazo(Error('detenida'));k.rechazo=null;}}

 // Corte del plano elegido en la grilla de Siemens (z hacia la cabeza: arriba en coronal y sagital).
 function corte(vol,plano,i){
  const n=k.sie.n,p=n*n,out=new Float32Array(p);
  for(let v=0;v<n;v++)for(let u=0;u<n;u++){let x,y,z;if(plano==='axial'){x=u;y=v;z=i;}else if(plano==='coronal'){x=u;y=i;z=n-1-v;}else{x=i;y=u;z=n-1-v;}out[v*n+u]=vol[z*p+y*n+x];}
  return out;
 }
 const diverge=t=>{t=Math.max(-1,Math.min(1,t));return t<0?[255*(1+t),255*(1+t),255]:[255,255*(1-t),255*(1-t)];};
 function pintar(){
  if(!k.sie)return;const n=k.sie.n,i=k.idx[k.plano],hay=!!k.sim;
  const lienzo=id=>{const c=$(id);if(c.width!==n*3){c.width=n*3;c.height=n*3;}return c;};
  C.pintar(lienzo('cmpSie'),corte(k.sie.vol,k.plano,i),n,{paleta:'cardiaca',max:k.sie.max,techo:k.techo});
  const der=lienzo('cmpSim');
  if(!hay){const x=der.getContext('2d');x.fillStyle='#000';x.fillRect(0,0,der.width,der.height);x.fillStyle='#aab3bd';x.font='20px system-ui';x.textAlign='center';x.fillText('Pulsa «Reconstruir»',der.width/2,der.height/2);}
  else if(k.vista==='lado')C.pintar(der,corte(k.sim,k.plano,i),n,{paleta:'cardiaca',max:k.simMax,techo:k.techo});
  else{
   const a=corte(k.sie.vol,k.plano,i),b=corte(k.sim,k.plano,i),d=new Float32Array(n*n),tope=.5*k.sie.max*k.fa*k.techo;
   for(let j=0;j<d.length;j++)d[j]=(b[j]*k.fb-a[j]*k.fa)/tope;
   const base=document.createElement('canvas');base.width=n;base.height=n;const bx=base.getContext('2d'),im=bx.createImageData(n,n);
   for(let j=0;j<d.length;j++){const c=diverge(d[j]);im.data[j*4]=c[0];im.data[j*4+1]=c[1];im.data[j*4+2]=c[2];im.data[j*4+3]=255;}
   bx.putImageData(im,0,0);const x=der.getContext('2d');x.imageSmoothingEnabled=false;x.drawImage(base,0,0,der.width,der.height);
  }
  $('cmpSimTitulo').textContent=k.vista==='dif'&&hay?'Diferencia (simulador − Siemens)':'Simulador';
  $('cmpCorte').textContent=`${i+1}/${n}`;$('cmpCorteRango').max=n-1;$('cmpCorteRango').value=i;
  document.querySelectorAll('[data-cplano]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.cplano===k.plano)));
  document.querySelectorAll('[data-cmetodo]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.cmetodo===k.metodo)));
  document.querySelectorAll('[data-cvista]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.cvista===k.vista));b.disabled=!hay;});
  $('cmpBtw').hidden=k.metodo!=='btw';$('cmpCorteBtw').value=Math.round(k.corte*100);$('cmpCorteBtwTexto').textContent=`${dec(k.corte,2)} c/cm`;
  if(k.s)$('cmpNyquist').textContent=`= ${dec(k.corte*k.s.spacing/10/.5,2)} de Nyquist (${dec(10/(2*k.s.spacing),2)} ciclos/cm con píxeles de ${dec(k.s.spacing,1)} mm)`;$('cmpOrden').value=k.orden;$('cmpOrdenTexto').textContent=k.orden;
  $('cmpTecho').value=Math.round(k.techo*100);
  const M=k.metricas;
  $('cmpMetricas').textContent=M?`Dentro del cuerpo (${M.voxeles.toLocaleString('es-CL')} vóxeles, sobre el 10 % del máximo de Siemens), con los dos volúmenes a la misma suma: correlación r = ${dec(M.r,3)} y diferencia media ${dec(M.dif,1)} % de la media. Mientras más cerca de 1 está r, más se parecen.`:'Todavía no hay reconstrucción del simulador para comparar.';
 }
 function iniciar(){
  document.querySelectorAll('[data-cplano]').forEach(b=>b.addEventListener('click',()=>{k.plano=b.dataset.cplano;pintar();}));
  document.querySelectorAll('[data-cmetodo]').forEach(b=>b.addEventListener('click',()=>{k.metodo=b.dataset.cmetodo;pintar();}));
  document.querySelectorAll('[data-cvista]').forEach(b=>b.addEventListener('click',()=>{k.vista=b.dataset.cvista;pintar();}));
  $('cmpCorteRango').addEventListener('input',e=>{k.idx[k.plano]=+e.target.value;pintar();});
  $('cmpCorteBtw').addEventListener('input',e=>{k.corte=Math.max(.05,+e.target.value/100);pintar();});
  $('cmpOrden').addEventListener('input',e=>{k.orden=+e.target.value;pintar();});
  $('cmpTecho').addEventListener('input',e=>{k.techo=Math.max(.05,+e.target.value/100);pintar();});
  $('cmpCorrer').addEventListener('click',reconstruir);
  // Tocar una imagen elige los cortes de los otros dos planos.
  for(const id of ['cmpSie','cmpSim']){const c=$(id);let on=false;const h=e=>{if(!k.sie)return;const b=c.getBoundingClientRect(),n=k.sie.n,u=Math.max(0,Math.min(n-1,Math.floor((e.clientX-b.left)/b.width*n))),v=Math.max(0,Math.min(n-1,Math.floor((e.clientY-b.top)/b.height*n)));
   if(k.plano==='axial'){k.idx.sagital=u;k.idx.coronal=v;}else if(k.plano==='coronal'){k.idx.sagital=u;k.idx.axial=n-1-v;}else{k.idx.coronal=u;k.idx.axial=n-1-v;}
   $('cmpCruz').textContent=`Cortes: axial ${k.idx.axial+1}, coronal ${k.idx.coronal+1}, sagital ${k.idx.sagital+1}.`;};
   c.addEventListener('pointerdown',e=>{on=true;try{c.setPointerCapture(e.pointerId);}catch(err){}e.preventDefault();h(e);});c.addEventListener('pointermove',e=>{if(on)h(e);});['pointerup','pointercancel'].forEach(ev=>c.addEventListener(ev,()=>{on=false;}));}
 }
 function salir(){cancelar();}
 return {iniciar,abrir,salir,estado:k};
})();
window.Comparador=Comparador;
